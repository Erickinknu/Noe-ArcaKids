/**
 * Expo config plugin: Device Owner native layer
 * Persists DeviceAdminReceiver + ProvisioningHandler + DeviceOwner native module
 * so `npx expo prebuild -p android` never wipes them.
 *
 * Idempotent: safe to run multiple times.
 */
const { withAndroidManifest, withDangerousMod, createRunOncePlugin } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// File contents (minimal working versions)
// ---------------------------------------------------------------------------

const DEVICE_ADMIN_XML = `<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
        <limit-password />
        <watch-login />
        <reset-password />
        <force-lock />
        <wipe-data />
    </uses-policies>
</device-admin>
`;

function deviceAdminReceiverContent(pkg) {
  return `package ${pkg}

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import androidx.annotation.NonNull

class DeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(@NonNull context: Context, @NonNull intent: Intent) {
        super.onEnabled(context, intent)
    }

    override fun onDisabled(@NonNull context: Context, @NonNull intent: Intent) {
        super.onDisabled(context, intent)
    }
}
`;
}

// Java version alternative – keep Kotlin for receiver as well to avoid mixed-language quirks.
// The task asks for .java files.  We provide Java for ProvisioningHandler and Receiver
// but receiver above was Kotlin-like; provide Java content below.
// Actually we generate Java files per task spec – so override with Java.
function deviceAdminReceiverJavaContent(pkg) {
  return `package ${pkg};

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.annotation.NonNull;

public class DeviceAdminReceiver extends DeviceAdminReceiver {
    @Override
    public void onEnabled(@NonNull Context context, @NonNull Intent intent) {
        super.onEnabled(context, intent);
    }

    @Override
    public void onDisabled(@NonNull Context context, @NonNull Intent intent) {
        super.onDisabled(context, intent);
    }
}
`;
}

function provisioningHandlerContent(pkg) {
  return `package ${pkg};

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

public class ProvisioningHandler {
    private static final String TAG = "ProvisioningHandler";

    public static void handleIntent(Activity activity, Intent intent) {
        if (intent == null) return;
        Log.d(TAG, "handleIntent: action=" + intent.getAction());
        // Minimal handling – expand as needed for provisioning extras.
        // Example: if intent has provisioning extras, persist them or trigger setup.
    }
}
`;
}

function deviceOwnerModuleContent(pkg) {
  return `package ${pkg}

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DeviceOwnerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "DeviceOwnerModule"

    @ReactMethod
    fun isDeviceOwner(promise: Promise) {
        try {
            val dpm = reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            promise.resolve(dpm.isDeviceOwnerApp(reactApplicationContext.packageName))
        } catch (e: Exception) {
            promise.reject("ERR_DEVICE_OWNER", e.message, e)
        }
    }

    @ReactMethod
    fun isAdminActive(promise: Promise) {
        try {
            val dpm = reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val admin = ComponentName(reactApplicationContext, DeviceAdminReceiver::class.java)
            promise.resolve(dpm.isAdminActive(admin))
        } catch (e: Exception) {
            promise.reject("ERR_ADMIN", e.message, e)
        }
    }
}
`;
}

function deviceOwnerPackageContent(pkg) {
  return `package ${pkg}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class DeviceOwnerPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(DeviceOwnerModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;
}

// ---------------------------------------------------------------------------
// AndroidManifest manipulation
// ---------------------------------------------------------------------------
function withDeviceOwnerManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    if (!manifest.application || manifest.application.length === 0) {
      return mod;
    }
    const application = manifest.application[0];

    // Ensure receiver array exists
    if (!application.receiver) {
      application.receiver = [];
    }

    const hasReceiver = application.receiver.some((r) => {
      const name = r.$ && (r.$['android:name'] || '');
      return name === '.DeviceAdminReceiver' || name.endsWith('.DeviceAdminReceiver') || name === 'com.arcakids.child.DeviceAdminReceiver';
    });

    if (!hasReceiver) {
      application.receiver.push({
        $: {
          'android:name': '.DeviceAdminReceiver',
          'android:permission': 'android.permission.BIND_DEVICE_ADMIN',
          'android:exported': 'false',
        },
        'meta-data': [
          {
            $: {
              'android:name': 'android.app.device_admin',
              'android:resource': '@xml/device_admin',
            },
          },
        ],
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.app.action.DEVICE_ADMIN_ENABLED',
                },
              },
            ],
          },
        ],
      });
    }

    return mod;
  });
}

// ---------------------------------------------------------------------------
// Dangerous mod: write files + patch MainActivity/MainApplication
// ---------------------------------------------------------------------------
function withDeviceOwnerFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const platformRoot = mod.modRequest.platformProjectRoot;
      const pkg = (config.android && config.android.package) || 'com.arcakids.child';
      const pkgPath = pkg.replace(/\./g, '/');

      // Helper to write file ensuring dir exists, idempotent
      async function ensureWrite(filePath, content) {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        // Only write if content differs to avoid unnecessary dirtying
        let existing = null;
        try {
          existing = await fs.promises.readFile(filePath, 'utf8');
        } catch (_) {
          // file does not exist
        }
        if (existing !== content) {
          await fs.promises.writeFile(filePath, content, 'utf8');
        }
      }

      // 1) res/xml/device_admin.xml
      const xmlPath = path.join(platformRoot, 'app/src/main/res/xml/device_admin.xml');
      await ensureWrite(xmlPath, DEVICE_ADMIN_XML);

      // 2) Java/Kotlin source files – write to derived package path
      const javaBase = path.join(platformRoot, `app/src/main/java/${pkgPath}`);

      // Task spec lists .java for receiver but Kotlin also works. We follow spec:
      // DeviceAdminReceiver.java (Java)
      await ensureWrite(
        path.join(javaBase, 'DeviceAdminReceiver.java'),
        deviceAdminReceiverJavaContent(pkg)
      );
      await ensureWrite(
        path.join(javaBase, 'ProvisioningHandler.java'),
        provisioningHandlerContent(pkg)
      );
      await ensureWrite(
        path.join(javaBase, 'DeviceOwnerModule.kt'),
        deviceOwnerModuleContent(pkg)
      );
      await ensureWrite(
        path.join(javaBase, 'DeviceOwnerPackage.kt'),
        deviceOwnerPackageContent(pkg)
      );

      // Also ensure legacy path if pkg differs from com.arcakids.child (backward compat for prebuild migration)
      const legacyPkg = 'com.arcakids.child';
      if (pkg !== legacyPkg) {
        const legacyBase = path.join(platformRoot, `app/src/main/java/${legacyPkg.replace(/\./g, '/')}`);
        // Only create legacy if android folder at that path is expected to exist from older prebuilds?
        // We duplicate files there as well for safety.
        await ensureWrite(
          path.join(legacyBase, 'DeviceAdminReceiver.java'),
          deviceAdminReceiverJavaContent(legacyPkg)
        );
        await ensureWrite(
          path.join(legacyBase, 'ProvisioningHandler.java'),
          provisioningHandlerContent(legacyPkg)
        );
        await ensureWrite(
          path.join(legacyBase, 'DeviceOwnerModule.kt'),
          deviceOwnerModuleContent(legacyPkg)
        );
        await ensureWrite(
          path.join(legacyBase, 'DeviceOwnerPackage.kt'),
          deviceOwnerPackageContent(legacyPkg)
        );
      }

      // 3) Patch MainActivity.kt
      const mainActivityPath = path.join(javaBase, 'MainActivity.kt');
      // Fallback: if derived path does not have MainActivity, look for legacy/common locations
      let resolvedActivityPath = mainActivityPath;
      try {
        await fs.promises.access(resolvedActivityPath);
      } catch (_) {
        // Try legacy path
        const alt = path.join(platformRoot, 'app/src/main/java/com/arcakids/child/MainActivity.kt');
        try {
          await fs.promises.access(alt);
          resolvedActivityPath = alt;
        } catch (_) {
          // Try erickinknu path (current android folder before prebuild)
          const alt2 = path.join(platformRoot, 'app/src/main/java/com/erickinknu/noearcakids/MainActivity.kt');
          try {
            await fs.promises.access(alt2);
            resolvedActivityPath = alt2;
          } catch (_) {
            resolvedActivityPath = null;
          }
        }
      }

      if (resolvedActivityPath) {
        let content = await fs.promises.readFile(resolvedActivityPath, 'utf8');
        let dirty = false;

        // Ensure Intent import
        if (!content.includes('import android.content.Intent')) {
          // Insert after `import android.os.Bundle` or at top imports
          if (content.includes('import android.os.Bundle')) {
            content = content.replace(
              'import android.os.Bundle',
              'import android.content.Intent\nimport android.os.Bundle'
            );
          } else {
            content = content.replace(
              /(import .*)/,
              `$1\nimport android.content.Intent`
            );
          }
          dirty = true;
        }

        // Idempotency check: already contains ProvisioningHandler
        if (!content.includes('ProvisioningHandler')) {
          // Inject call inside onCreate after super.onCreate
          // Match super.onCreate(null) or super.onCreate(savedInstanceState)
          if (content.includes('super.onCreate')) {
            content = content.replace(
              /super\.onCreate\([^)]*\)/,
              (m) => `${m}\n    ProvisioningHandler.handleIntent(this, intent)`
            );
            dirty = true;
          }

          // Add onNewIntent override if not present
          if (!content.includes('onNewIntent')) {
            // Insert before the last closing brace of the class
            // Find `override fun createReactActivityDelegate` and insert before it, or before final `}`
            const onNewIntentBlock = `  override fun onNewIntent(intent: Intent) {\n    super.onNewIntent(intent)\n    ProvisioningHandler.handleIntent(this, intent)\n  }\n\n`;
            // Prefer inserting before createReactActivityDelegate
            if (content.includes('override fun createReactActivityDelegate')) {
              content = content.replace(
                'override fun createReactActivityDelegate',
                `${onNewIntentBlock}override fun createReactActivityDelegate`
              );
            } else if (content.includes('override fun getMainComponentName')) {
              content = content.replace(
                'override fun getMainComponentName',
                `${onNewIntentBlock}override fun getMainComponentName`
              );
            } else {
              // Fallback: before last }
              const lastBrace = content.lastIndexOf('}');
              if (lastBrace !== -1) {
                content = content.slice(0, lastBrace) + onNewIntentBlock + content.slice(lastBrace);
              }
            }
            dirty = true;
          }
        }

        if (dirty) {
          await fs.promises.writeFile(resolvedActivityPath, content, 'utf8');
        }
      }

      // 4) Patch MainApplication.kt
      const mainAppPath = path.join(javaBase, 'MainApplication.kt');
      let resolvedAppPath = mainAppPath;
      try {
        await fs.promises.access(resolvedAppPath);
      } catch (_) {
        const alt = path.join(platformRoot, 'app/src/main/java/com/arcakids/child/MainApplication.kt');
        try {
          await fs.promises.access(alt);
          resolvedAppPath = alt;
        } catch (_) {
          const alt2 = path.join(platformRoot, 'app/src/main/java/com/erickinknu/noearcakids/MainApplication.kt');
          try {
            await fs.promises.access(alt2);
            resolvedAppPath = alt2;
          } catch (_) {
            resolvedAppPath = null;
          }
        }
      }

      if (resolvedAppPath) {
        let content = await fs.promises.readFile(resolvedAppPath, 'utf8');
        if (!content.includes('DeviceOwnerPackage')) {
          // Inject inside PackageList apply block
          // Look for `PackageList(this).packages.apply {`
          if (content.includes('PackageList(this).packages.apply')) {
            content = content.replace(
              /PackageList\(this\)\.packages\.apply\s*\{/,
              (m) => `${m}\n          add(DeviceOwnerPackage())`
            );
            await fs.promises.writeFile(resolvedAppPath, content, 'utf8');
          } else if (content.includes('packages.apply')) {
            content = content.replace(
              /packages\.apply\s*\{/,
              (m) => `${m}\n          add(DeviceOwnerPackage())`
            );
            await fs.promises.writeFile(resolvedAppPath, content, 'utf8');
          }
        }
      }

      return mod;
    },
  ]);
}

function withDeviceOwner(config) {
  let cfg = withDeviceOwnerManifest(config);
  cfg = withDeviceOwnerFiles(cfg);
  return cfg;
}

module.exports = createRunOncePlugin(withDeviceOwner, 'with-device-owner', '1.0.0');
module.exports.withDeviceOwner = withDeviceOwner;
