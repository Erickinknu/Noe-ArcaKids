package com.arcakids.child

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Bridges DevicePolicyManager (Device Owner) + fallback overlay state to JS.
 *
 * Device Owner APIs (lockNow, setPackagesSuspended, wipeData, addUserRestriction)
 * only work when this app is the Device Owner — set via QR provisioning that
 * declares com.arcakids.child/.DeviceAdminReceiver as
 * android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME.
 *
 * All methods degrade gracefully when not Device Owner:
 * - isDeviceOwner() returns false, JS should show the overlay fallback UI instead.
 * - lockNow(), suspend, etc. reject with NOT_DEVICE_OWNER so JS can use the
 *   EnforcementService + SYSTEM_ALERT_WINDOW overlay instead.
 */
class DeviceOwnerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "DeviceOwner"

  private fun dpm(): DevicePolicyManager =
    reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

  private fun adminComponent(): ComponentName =
    ComponentName(reactContext, DeviceAdminReceiver::class.java)

  @ReactMethod
  fun isDeviceOwner(promise: Promise) {
    try {
      promise.resolve(dpm().isDeviceOwnerApp(reactContext.packageName))
    } catch (e: Exception) {
      promise.reject("DEVICE_OWNER_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun isAdminActive(promise: Promise) {
    try {
      promise.resolve(dpm().isAdminActive(adminComponent()))
    } catch (e: Exception) {
      promise.reject("ADMIN_CHECK_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun canSuspendPackages(promise: Promise) {
    try {
      // setPackagesSuspended requires API 24+ and Device Owner
      val supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N &&
        dpm().isDeviceOwnerApp(reactContext.packageName)
      promise.resolve(supported)
    } catch (e: Exception) {
      promise.reject("SUSPEND_CHECK_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun lockNow(promise: Promise) {
    try {
      val dpm = dpm()
      if (!dpm.isDeviceOwnerApp(reactContext.packageName) && !dpm.isAdminActive(adminComponent())) {
        promise.reject("NOT_DEVICE_OWNER", "App is not Device Owner / Device Admin")
        return
      }
      dpm.lockNow()
      promise.resolve(true)
    } catch (e: SecurityException) {
      promise.reject("NOT_DEVICE_OWNER", e.message, e)
    } catch (e: Exception) {
      promise.reject("LOCK_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun setPackagesSuspended(packageNamesJson: String, suspended: Boolean, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
        promise.reject("UNSUPPORTED", "setPackagesSuspended requires Android N+")
        return
      }
      val dpm = dpm()
      if (!dpm.isDeviceOwnerApp(reactContext.packageName)) {
        promise.reject("NOT_DEVICE_OWNER", "setPackagesSuspended requires Device Owner")
        return
      }
      val packages = org.json.JSONArray(packageNamesJson)
      val list = Array(packages.length()) { i -> packages.getString(i) }
      val failed = dpm.setPackagesSuspended(adminComponent(), list, suspended)
      val result = Arguments.createArray()
      for (pkg in failed) result.pushString(pkg)
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("SUSPEND_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun setUserRestriction(restriction: String, enabled: Boolean, promise: Promise) {
    try {
      val dpm = dpm()
      if (!dpm.isDeviceOwnerApp(reactContext.packageName)) {
        promise.reject("NOT_DEVICE_OWNER", "setUserRestriction requires Device Owner")
        return
      }
      if (enabled) {
        dpm.addUserRestriction(adminComponent(), restriction)
      } else {
        dpm.clearUserRestriction(adminComponent(), restriction)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("RESTRICTION_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun wipeData(flags: Int, promise: Promise) {
    try {
      val dpm = dpm()
      if (!dpm.isDeviceOwnerApp(reactContext.packageName)) {
        promise.reject("NOT_DEVICE_OWNER", "wipeData requires Device Owner")
        return
      }
      dpm.wipeData(flags)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("WIPE_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun hasSystemAlertWindowPermission(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        promise.resolve(Settings.canDrawOverlays(reactContext))
      } else {
        promise.resolve(true)
      }
    } catch (e: Exception) {
      promise.reject("OVERLAY_CHECK_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun openSystemAlertWindowSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("OPEN_OVERLAY_SETTINGS_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun getProvisioningExtras(promise: Promise) {
    try {
      val prefs = reactContext.getSharedPreferences(ProvisioningHandler.PREFS_NAME, Context.MODE_PRIVATE)
      val map = Arguments.createMap()
      map.putString("familyId", prefs.getString(ProvisioningHandler.KEY_FAMILY_ID, null))
      map.putString("childId", prefs.getString(ProvisioningHandler.KEY_CHILD_ID, null))
      map.putString("code", prefs.getString(ProvisioningHandler.KEY_CODE, null))
      map.putString("payload", prefs.getString(ProvisioningHandler.KEY_PAYLOAD, null))
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("PROVISION_EXTRAS_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun clearProvisioningExtras(promise: Promise) {
    try {
      ProvisioningHandler.clear(reactContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("CLEAR_ERROR", e.message, e)
    }
  }
}
