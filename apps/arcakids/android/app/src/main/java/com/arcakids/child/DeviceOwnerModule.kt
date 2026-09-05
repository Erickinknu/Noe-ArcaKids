package com.arcakids.child

import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray

class DeviceOwnerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DeviceOwner"

    private val dpm: DevicePolicyManager
        get() = reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val admin: ComponentName
        get() = ComponentName(reactApplicationContext, DeviceAdminReceiver::class.java)

    @ReactMethod
    fun isDeviceOwner(promise: Promise) {
        try {
            promise.resolve(dpm.isDeviceOwnerApp(reactApplicationContext.packageName))
        } catch (e: Exception) {
            promise.reject("ERR_DEVICE_OWNER", e.message, e)
        }
    }

    @ReactMethod
    fun isDeviceOwnerProvisioned(promise: Promise) {
        try {
            val isOwner = dpm.isDeviceOwnerApp(reactApplicationContext.packageName)
            val isAdmin = dpm.isAdminActive(admin)
            promise.resolve(isOwner || isAdmin)
        } catch (e: Exception) {
            promise.reject("ERR_PROVISION_CHECK", e.message, e)
        }
    }

    @ReactMethod
    fun isAdminActive(promise: Promise) {
        try {
            promise.resolve(dpm.isAdminActive(admin))
        } catch (e: Exception) {
            promise.reject("ERR_ADMIN", e.message, e)
        }
    }

    @ReactMethod
    fun canSuspendPackages(promise: Promise) {
        try {
            promise.resolve(dpm.isDeviceOwnerApp(reactApplicationContext.packageName))
        } catch (e: Exception) {
            promise.reject("ERR_CAN_SUSPEND", e.message, e)
        }
    }

    @ReactMethod
    fun lockNow(promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner"); return
            }
            dpm.lockNow()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_LOCK", e.message, e)
        }
    }

    @ReactMethod
    fun setPackagesSuspended(packageNamesJson: String, suspended: Boolean, promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner"); return
            }
            val arr = JSONArray(packageNamesJson)
            val packages = Array(arr.length()) { arr.getString(it) }
                .filter { it != reactApplicationContext.packageName }
            dpm.setPackagesSuspended(admin, packages.toTypedArray(), suspended)
            promise.resolve(packages.toTypedArray())
        } catch (e: Exception) {
            promise.reject("ERR_SUSPEND", e.message, e)
        }
    }

    @ReactMethod
    fun setUserRestriction(restriction: String, enabled: Boolean, promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner"); return
            }
            if (enabled) dpm.addUserRestriction(admin, restriction)
            else dpm.clearUserRestriction(admin, restriction)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_USER_RESTRICTION", e.message, e)
        }
    }

    @ReactMethod
    fun wipeData(flags: Int, promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner"); return
            }
            dpm.wipeData(flags)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_WIPE", e.message, e)
        }
    }

    @ReactMethod
    fun startLockTask(promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner"); return
            }
            val ctx = reactApplicationContext
            try { dpm.setLockTaskPackages(admin, arrayOf(ctx.packageName)) } catch (_: Exception) {}
            val launchAttempted = startLockTaskFromForegroundActivity(promise)
            if (!launchAttempted) {
                bringAppToForeground()
                Handler(Looper.getMainLooper()).postDelayed({
                    if (!startLockTaskFromForegroundActivity(promise)) {
                        promise.reject("ERR_LOCK_TASK", "Cannot pin lock task: no foreground activity available")
                    }
                }, 600)
            }
        } catch (e: Exception) {
            promise.reject("ERR_LOCK_TASK", e.message, e)
        }
    }

    @ReactMethod
    fun stopLockTask(promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner"); return
            }
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                Handler(Looper.getMainLooper()).post {
                    try { activity.stopLockTask() } catch (_: Exception) {}
                }
                promise.resolve(true)
            } else {
                promise.reject("ERR_LOCK_TASK", "No foreground activity to unpin")
            }
        } catch (e: Exception) {
            promise.reject("ERR_LOCK_TASK", e.message, e)
        }
    }

    @ReactMethod
    fun setScreenCaptureDisabled(disabled: Boolean, promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner"); return
            }
            dpm.setScreenCaptureDisabled(admin, disabled)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_SCREEN_CAPTURE", e.message, e)
        }
    }

    @ReactMethod
    fun setCameraDisabled(disabled: Boolean, promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner"); return
            }
            dpm.setCameraDisabled(admin, disabled)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_CAMERA", e.message, e)
        }
    }

    @ReactMethod
    fun setApplicationHidden(packageNamesJson: String, hidden: Boolean, promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner"); return
            }
            val arr = JSONArray(packageNamesJson)
            val affected = mutableListOf<String>()
            for (i in 0 until arr.length()) {
                val pkg = arr.getString(i) ?: continue
                if (pkg == reactApplicationContext.packageName) continue
                if (dpm.setApplicationHidden(admin, pkg, hidden)) affected.add(pkg)
            }
            promise.resolve(affected.toTypedArray())
        } catch (e: Exception) {
            promise.reject("ERR_APP_HIDDEN", e.message, e)
        }
    }

    @ReactMethod
    fun setUninstallBlocked(packageNamesJson: String, blocked: Boolean, promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner"); return
            }
            val arr = JSONArray(packageNamesJson)
            for (i in 0 until arr.length()) {
                val pkg = arr.getString(i) ?: continue
                if (pkg == reactApplicationContext.packageName) continue
                dpm.setUninstallBlocked(admin, pkg, blocked)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_UNINSTALL_LOCK", e.message, e)
        }
    }

    @ReactMethod
    fun forceStopPackages(packageNamesJson: String, promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner"); return
            }
            val arr = JSONArray(packageNamesJson)
            val am = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            for (i in 0 until arr.length()) {
                val pkg = arr.getString(i) ?: continue
                if (pkg == reactApplicationContext.packageName) continue
                forceStopPackage(am, pkg)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_FORCE_STOP", e.message, e)
        }
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val mainIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val list = pm.queryIntentActivities(mainIntent, 0)
            val array: WritableArray = Arguments.createArray()
            for (resolveInfo in list) {
                val info = resolveInfo.activityInfo ?: continue
                if (info.packageName == reactApplicationContext.packageName) continue
                val item: WritableMap = Arguments.createMap()
                item.putString("packageName", info.packageName)
                item.putString("label", try { info.loadLabel(pm).toString() } catch (e: Exception) { info.packageName })
                array.pushMap(item)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERR_INSTALLED_APPS", e.message, e)
        }
    }

    private fun forceStopPackage(am: ActivityManager, packageName: String) {
        try {
            val method = ActivityManager::class.java.getMethod("forceStopPackage", String::class.java)
            method.invoke(am, packageName)
        } catch (_: Exception) {
            // best effort; suspension/enforcement covers the real block
        }
    }

    @ReactMethod
    fun hasSystemAlertWindowPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERR_OVERLAY", e.message, e)
        }
    }

    @ReactMethod
    fun openSystemAlertWindowSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${reactApplicationContext.packageName}"))
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_OPEN_OVERLAY", e.message, e)
        }
    }

    @ReactMethod
    fun getProvisioningExtras(promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val meta = ctx.getSharedPreferences("arcakids_provisioning", Context.MODE_PRIVATE)
            val wm: WritableMap = Arguments.createMap()
            wm.putString("familyId", meta.getString("family_id", null))
            wm.putString("childId", meta.getString("child_id", null))
            wm.putString("code", meta.getString("code", null))
            wm.putString("payload", meta.getString("payload", null))
            promise.resolve(wm)
        } catch (e: Exception) {
            promise.reject("ERR_PROVISION_GET", e.message, e)
        }
    }

    @ReactMethod
    fun clearProvisioningExtras(promise: Promise) {
        try {
            val ctx = reactApplicationContext
            ctx.getSharedPreferences("arcakids_provisioning", Context.MODE_PRIVATE)
                .edit().clear().apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_PROVISION_CLEAR", e.message, e)
        }
    }

    /** Returns true when the pin succeeded; false when a delayed retry is needed. */
    private fun startLockTaskFromForegroundActivity(promise: Promise): Boolean {
        val activity = reactApplicationContext.currentActivity ?: return false
        Handler(Looper.getMainLooper()).post {
            try { activity.startLockTask() } catch (_: Exception) {}
        }
        promise.resolve(true)
        return true
    }

    private fun bringAppToForeground() {
        val ctx = reactApplicationContext
        val intent = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: return
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { ctx.startActivity(intent) } catch (_: Exception) {}
    }
}
