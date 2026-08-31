package com.arcakids.child

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject

class DeviceOwnerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DeviceOwnerModule"

    private val dpm: DevicePolicyManager
        get() = reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val admin: ComponentName
        get() = ComponentName(reactApplicationContext, DeviceAdminReceiver::class.java)

    // ---------------------------------------------------------------- state
    @ReactMethod
    fun isDeviceOwner(promise: Promise) {
        try {
            promise.resolve(dpm.isDeviceOwnerApp(reactApplicationContext.packageName))
        } catch (e: Exception) {
            promise.reject("ERR_DEVICE_OWNER", e.message, e)
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
            promise.resolve(
                dpm.isDeviceOwnerApp(reactApplicationContext.packageName)
            )
        } catch (e: Exception) {
            promise.reject("ERR_CAN_SUSPEND", e.message, e)
        }
    }

    // ---------------------------------------------------------------- lock / suspend / restrict
    @ReactMethod
    fun lockNow(promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner")
                return
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
                promise.reject("ERR_NOT_OWNER", "App is not device owner")
                return
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
                promise.reject("ERR_NOT_OWNER", "App is not device owner")
                return
            }
            if (enabled) {
                dpm.addUserRestriction(admin, restriction)
            } else {
                dpm.clearUserRestriction(admin, restriction)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_USER_RESTRICTION", e.message, e)
        }
    }

    @ReactMethod
    fun wipeData(flags: Int, promise: Promise) {
        try {
            if (!dpm.isDeviceOwnerApp(reactApplicationContext.packageName)) {
                promise.reject("ERR_NOT_OWNER", "App is not device owner")
                return
            }
            dpm.wipeData(flags)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_WIPE", e.message, e)
        }
    }

    // ---------------------------------------------------------------- overlay permission (fallback path)
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
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactApplicationContext.packageName}")
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_OPEN_OVERLAY", e.message, e)
        }
    }

    // ---------------------------------------------------------------- provisioning extras
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
                .edit()
                .clear()
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_PROVISION_CLEAR", e.message, e)
        }
    }

    /** Persists provisioning extras, e.g. when deep-linked from a QR.
     *  This is NOT part of the RN bridge contract (called from Java-side ProvisioningHandler). */
    fun persistProvisioningExtras(familyId: String?, childId: String?, code: String?, payload: String?) {
        val ctx = reactApplicationContext
        ctx.getSharedPreferences("arcakids_provisioning", Context.MODE_PRIVATE)
            .edit()
            .putString("family_id", familyId)
            .putString("child_id", childId)
            .putString("code", code)
            .putString("payload", payload)
            .apply()
    }
}
