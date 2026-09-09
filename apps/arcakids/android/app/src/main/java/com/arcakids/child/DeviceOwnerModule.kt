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
    fun enableAdmin(promise: Promise) {
        try {
            if (dpm.isAdminActive(admin)) {
                promise.resolve(true); return
            }
            val intent = android.app.admin.DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN.let {
                android.content.Intent(it).apply {
                    putExtra(android.app.admin.DevicePolicyManager.EXTRA_DEVICE_ADMIN, admin)
                    putExtra(
                        android.app.admin.DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                        "Requerido para el control de horarios y bloqueo remoto parental."
                    )
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_ENABLE_ADMIN", e.message, e)
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
            val isOwner = dpm.isDeviceOwnerApp(reactApplicationContext.packageName)
            val isAdmin = dpm.isAdminActive(admin)
            if (!isOwner && !isAdmin) {
                promise.reject("ERR_NOT_ADMIN", "App is neither device owner nor active admin"); return
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
}
