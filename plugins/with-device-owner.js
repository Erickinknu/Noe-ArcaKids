/**
 * Expo config plugin: ARCA KIDS native Android layer (device owner + parental control)
 *
 * Persists all native Kotlin/Java files required for:
 *  - Device Owner / DevicePolicyManager operations (DeviceOwnerModule)
 *  - UsageStats + app control (ParentalUsageModule)
 *  - Geofencing / location (ParentalLocationModule)
 *  - Foreground-service enforcement (EnforcementService + BlockingOverlayManager)
 * plus the DeviceAdminReceiver, ProvisioningHandler and manifest wiring, so that
 * `npx expo prebuild -p android` never wipes them.
 *
 * Idempotent: safe to run multiple times; only writes when content differs.
 */
const { withAndroidManifest, withDangerousMod, createRunOncePlugin } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Static resource: device_admin.xml
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

// ---------------------------------------------------------------------------
// Source templates (single source of truth mirrored in android/app/src/main/java)
// ---------------------------------------------------------------------------

function deviceAdminReceiverJavaContent(pkg) {
  return `package ${pkg};

import android.content.Context;
import android.content.Intent;
import androidx.annotation.NonNull;

public class DeviceAdminReceiver extends android.app.admin.DeviceAdminReceiver {
    @Override
    public void onEnabled(@NonNull Context context, @NonNull Intent intent) {
        super.onEnabled(context, intent);
    }

    @Override
    public void onDisabled(@NonNull Context context, @NonNull Intent intent) {
        super.onDisabled(context, intent);
    }

    @Override
    public CharSequence onDisableRequested(@NonNull Context context, @NonNull Intent intent) {
        // Refuse voluntary deactivation so the child cannot disable parental control
        // from Settings. Device owner is full kiosk; this guards the admin case too.
        return "";
    }
}
`;
}

function provisioningHandlerContent(pkg) {
  return `package ${pkg};

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Log;
import org.json.JSONObject;

/**
 * Handles provisioning intents (deep links from QR / device-owner provisioning).
 * Persists the parsed extras so the JS side can read them via DeviceOwnerModule.
 */
public class ProvisioningHandler {
    private static final String TAG = "ProvisioningHandler";
    private static final String PREFS = "arcakids_provisioning";

    public static void handleIntent(Activity activity, Intent intent) {
        if (intent == null || activity == null) return;
        Log.d(TAG, "handleIntent: action=" + intent.getAction());

        String data = intent.getDataString();
        if (data == null) return;

        try {
            Uri uri = Uri.parse(data);
            String familyId = uri.getQueryParameter("familyId");
            String childId = uri.getQueryParameter("childId");
            String code = uri.getQueryParameter("code");

            if (familyId == null && childId == null && code == null) {
                // Try JSON body (e.g. arcakids://provision?payload={...})
                String payload = uri.getQueryParameter("payload");
                if (payload != null) {
                    try {
                        JSONObject obj = new JSONObject(payload);
                        familyId = obj.optString("familyId", null);
                        childId = obj.optString("childId", null);
                        code = obj.optString("code", null);
                    } catch (Exception e) {
                        Log.e(TAG, "Invalid provisioning payload", e);
                    }
                }
            }

            persist(activity, familyId, childId, code, data);
        } catch (Exception e) {
            Log.e(TAG, "Error parsing provisioning intent", e);
        }
    }

    private static void persist(Activity activity, String familyId, String childId, String code, String payload) {
        if (familyId == null && childId == null && code == null && payload == null) return;
        SharedPreferences prefs = activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE);
        prefs.edit()
            .putString("family_id", familyId)
            .putString("child_id", childId)
            .putString("code", code)
            .putString("payload", payload)
            .apply();
    }
}
`;
}

function deviceOwnerModuleContent(pkg) {
  return `package ${pkg}

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
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:\${reactApplicationContext.packageName}"))
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
`;
}

function parentalUsageModuleContent(pkg) {
  return `package ${pkg}

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.ActivityNotFoundException
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject
import java.util.Calendar

class ParentalUsageModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ParentalUsage"

    @ReactMethod
    fun hasUsageStatsPermission(promise: Promise) {
        try {
            val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
            val mode = appOps.checkOpNoThrow(
                android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                reactContext.packageName
            )
            promise.resolve(mode == android.app.AppOpsManager.MODE_ALLOWED)
        } catch (e: Exception) {
            promise.reject("ERR_USAGE_STATS", e.message, e)
        }
    }

    @ReactMethod
    fun openUsageAccessSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_OPEN_SETTINGS", e.message, e)
        }
    }

    @ReactMethod
    fun isDefaultLauncher(promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            val resolved = reactContext.packageManager.resolveActivity(intent, 0)
            promise.resolve(resolved?.activityInfo?.packageName == reactContext.packageName)
        } catch (e: Exception) {
            promise.reject("ERR_LAUNCHER", e.message, e)
        }
    }

    @ReactMethod
    fun openDefaultAppsSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_OPEN_DEFAULT_APPS", e.message, e)
        }
    }

    @ReactMethod
    fun getUsageTodayMinutes(promise: Promise) {
        try {
            val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val cal = Calendar.getInstance()
            cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0)
            val start = cal.timeInMillis
            val stats = usm.queryAndAggregateUsageStats(start, System.currentTimeMillis())
            val map = Arguments.createMap()
            var total = 0L
            for ((pkg, s) in stats) {
                if (pkg == reactContext.packageName) continue
                val minutes = s.totalTimeInForeground / 60000
                if (minutes > 0) { map.putDouble(pkg, minutes.toDouble()); total += minutes }
            }
            map.putDouble("total", total.toDouble())
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_USAGE", e.message, e)
        }
    }

    @ReactMethod
    fun getLaunchableApps(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val mainIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val list = pm.queryIntentActivities(mainIntent, 0)
            val array: WritableArray = Arguments.createArray()
            for (resolveInfo in list) {
                val info = resolveInfo.activityInfo ?: continue
                if (info.packageName == reactContext.packageName) continue
                val item: WritableMap = Arguments.createMap()
                item.putString("packageName", info.packageName)
                item.putString("label", try { info.loadLabel(pm).toString() } catch (e: Exception) { info.packageName })
                array.pushMap(item)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERR_APPS", e.message, e)
        }
    }

    @ReactMethod
    fun launchApp(packageName: String, promise: Promise) {
        try {
            val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(packageName)
                ?: throw ActivityNotFoundException("No launch intent for \$packageName")
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(launchIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_LAUNCH_APP", e.message, e)
        }
    }

    @ReactMethod
    fun updateEnforcementState(stateJson: String, promise: Promise) {
        try {
            JSONObject(stateJson)
            EnforcementService.saveState(reactContext, stateJson)
            EnforcementService.start(reactContext)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_ENFORCEMENT_STATE", e.message, e)
        }
    }

    @ReactMethod
    fun updateDeviceState(deviceStateJson: String, promise: Promise) {
        try {
            val json = JSONObject(deviceStateJson)
            val isBlocked = json.optBoolean("isBlocked", false)
            reactContext.getSharedPreferences("arcakids_device", Context.MODE_PRIVATE)
                .edit().putBoolean("is_blocked", isBlocked).apply()
            if (isBlocked) {
                EnforcementService.start(reactContext)
                val emergency = JSONObject()
                    .put("enforce", true)
                    .put("bedtimeEnabled", false)
                    .put("bedtimeStart", JSONObject.NULL)
                    .put("bedtimeEnd", JSONObject.NULL)
                    .put("dailyLimitMinutes", 0)
                    .put("bonusMinutes", 0)
                    .put("pausedUntil", JSONObject.NULL)
                    .put("blockedPackages", org.json.JSONArray())
                EnforcementService.saveState(reactContext, emergency.toString())
            } else {
                EnforcementService.stop(reactContext)
                reactContext.getSharedPreferences("arcakids_enforcement", Context.MODE_PRIVATE)
                    .edit().putString("enforcement_state", null).apply()
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_DEVICE_STATE", e.message, e)
        }
    }

    @ReactMethod
    fun startEnforcement(promise: Promise) {
        try {
            EnforcementService.start(reactContext)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_START_ENFORCEMENT", e.message, e)
        }
    }

    @ReactMethod
    fun stopEnforcement(promise: Promise) {
        try {
            EnforcementService.stop(reactContext)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_STOP_ENFORCEMENT", e.message, e)
        }
    }

    /** Persists Supabase endpoint + linked device so the FGS can report usage in background. */
    @ReactMethod
    fun configureUsageReporter(supabaseUrl: String, supabaseAnonKey: String, deviceUuid: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("arcakids_usage_reporter", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("supabase_url", supabaseUrl)
                .putString("supabase_anon_key", supabaseAnonKey)
                .putString("device_uuid", deviceUuid)
                .apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_USAGE_REPORTER", e.message, e)
        }
    }
}
`;
}

function parentalLocationModuleContent(pkg) {
  return `package ${pkg}

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject

class ParentalLocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LocationListener {

    companion object {
        private const val REQUEST_CODE_LOCATION = 4201
        private val pendingPromises = mutableListOf<Promise>()

        /** Called from MainActivity.onRequestPermissionsResult. */
        fun onRequestPermissionsResult(requestCode: Int, grantResults: IntArray) {
            if (requestCode != REQUEST_CODE_LOCATION) return
            val granted = grantResults.isNotEmpty() &&
                grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            val list = pendingPromises.toList()
            pendingPromises.clear()
            for (p in list) p.resolve(granted)
        }
    }

    override fun getName(): String = "ParentalLocation"

    private val locationManager = reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    private var tracking = false
    private var monitoringGeofences = false

    @ReactMethod
    fun hasPermission(promise: Promise) {
        try {
            val fine = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val coarse = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            promise.resolve(fine || coarse)
        } catch (e: Exception) {
            promise.reject("ERR_LOCATION_PERMISSION", e.message, e)
        }
    }

    @ReactMethod
    fun hasBackgroundPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                promise.resolve(true)
                return
            }
            val fine = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val background = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
            promise.resolve(fine && background)
        } catch (e: Exception) {
            promise.reject("ERR_BACKGROUND_PERMISSION", e.message, e)
        }
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        val activity = getCurrentActivity()
        if (activity == null) {
            promise.resolve(false)
            return
        }
        val needs = arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        val missing = needs.filter {
            ContextCompat.checkSelfPermission(reactContext, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) {
            promise.resolve(true)
            return
        }
        ParentalLocationModule.pendingPromises.add(promise)
        ActivityCompat.requestPermissions(activity, missing.toTypedArray(), 4201)
    }

    @ReactMethod
    fun requestBackgroundPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            promise.resolve(true)
            return
        }
        val activity = getCurrentActivity()
        if (activity == null) {
            promise.resolve(false)
            return
        }
        val background = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (background) {
            promise.resolve(true)
            return
        }
        ParentalLocationModule.pendingPromises.add(promise)
        ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION), 4201)
    }

    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        try {
            if (!hasPerm()) { promise.reject("ERR_NO_PERMISSION", "Location permission not granted"); return }
            val best = bestLastLocation()
            if (best != null) { promise.resolve(toMap(best)); return }
            val providers = getEnabledProviders()
            if (providers.isNotEmpty()) {
                try {
                    locationManager.requestSingleUpdate(providers.first(), object : LocationListener {
                        override fun onLocationChanged(location: Location) { promise.resolve(toMap(location)) }
                        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                        override fun onProviderEnabled(provider: String) {}
                        override fun onProviderDisabled(provider: String) {}
                    }, Looper.getMainLooper())
                } catch (e: Exception) { promise.reject("ERR_CURRENT_LOCATION", e.message, e) }
            } else {
                promise.resolve(toMap(null))
            }
        } catch (e: Exception) {
            promise.reject("ERR_CURRENT_LOCATION", e.message, e)
        }
    }

    @ReactMethod
    fun startTracking(promise: Promise) {
        try {
            if (!hasPerm()) { promise.reject("ERR_NO_PERMISSION", "Location permission not granted"); return }
            if (!tracking) {
                tracking = true
                for (p in getEnabledProviders()) {
                    try { locationManager.requestLocationUpdates(p, 15000L, 25f, this, Looper.getMainLooper()) } catch (e: Exception) {}
                }
            }
            promise.resolve(toMap(bestLastLocation()))
        } catch (e: Exception) {
            promise.reject("ERR_START_TRACKING", e.message, e)
        }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            if (tracking) { locationManager.removeUpdates(this); tracking = false }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_STOP_TRACKING", e.message, e)
        }
    }

    @ReactMethod
    fun addGeofence(geofence: com.facebook.react.bridge.ReadableMap, promise: Promise) {
        try {
            val id = geofence.getString("id") ?: run { promise.reject("ERR_GEOFENCE", "Missing id"); return }
            val prefs = reactContext.getSharedPreferences("arcakids_geofences", Context.MODE_PRIVATE)
            val existing = prefs.getString("list", null)
            val arr = if (existing != null) JSONArray(existing) else JSONArray()
            arr.put(JSONObject().apply {
                put("id", id)
                put("name", geofence.getString("name"))
                put("latitude", geofence.getDouble("latitude"))
                put("longitude", geofence.getDouble("longitude"))
                put("radius", geofence.getInt("radius"))
                put("triggered", false)
                put("triggeredAt", JSONObject.NULL)
                put("childId", geofence.getString("childId"))
            })
            prefs.edit().putString("list", arr.toString()).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_ADD_GEOFENCE", e.message, e)
        }
    }

    @ReactMethod
    fun removeGeofence(geofenceId: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("arcakids_geofences", Context.MODE_PRIVATE)
            val existing = prefs.getString("list", null) ?: run { promise.resolve(true); return }
            val arr = JSONArray(existing)
            val out = JSONArray()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                if (obj.optString("id") != geofenceId) out.put(obj)
            }
            prefs.edit().putString("list", out.toString()).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_REMOVE_GEOFENCE", e.message, e)
        }
    }

    @ReactMethod
    fun getGeofences(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("arcakids_geofences", Context.MODE_PRIVATE)
            val existing = prefs.getString("list", null)
            val out: WritableArray = Arguments.createArray()
            if (existing == null) { promise.resolve(out); return }
            val arr = JSONArray(existing)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val map: WritableMap = Arguments.createMap()
                map.putString("id", obj.optString("id"))
                map.putString("name", obj.optString("name"))
                map.putDouble("latitude", obj.optDouble("latitude"))
                map.putDouble("longitude", obj.optDouble("longitude"))
                map.putDouble("radius", obj.optDouble("radius"))
                map.putBoolean("triggered", obj.optBoolean("triggered"))
                map.putString("childId", obj.optString("childId"))
                out.pushMap(map)
            }
            promise.resolve(out)
        } catch (e: Exception) {
            promise.reject("ERR_GET_GEOFENCES", e.message, e)
        }
    }

    @ReactMethod
    fun isInsideGeofence(latitude: Double, longitude: Double, geofence: com.facebook.react.bridge.ReadableMap, promise: Promise) {
        try {
            val results = FloatArray(1)
            Location.distanceBetween(latitude, longitude, geofence.getDouble("latitude"), geofence.getDouble("longitude"), results)
            promise.resolve(results[0] <= geofence.getDouble("radius").toFloat())
        } catch (e: Exception) {
            promise.reject("ERR_IS_INSIDE", e.message, e)
        }
    }

    @ReactMethod
    fun startGeofenceMonitoring(promise: Promise) {
        try {
            if (!hasPerm()) { promise.reject("ERR_NO_PERMISSION", "Location permission not granted"); return }
            if (!monitoringGeofences) {
                monitoringGeofences = true
                for (p in getEnabledProviders()) {
                    try { locationManager.requestLocationUpdates(p, 30000L, 50f, this, Looper.getMainLooper()) } catch (e: Exception) {}
                }
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_START_GEOFENCE_MONITORING", e.message, e)
        }
    }

    @ReactMethod
    fun stopGeofenceMonitoring(promise: Promise) {
        try {
            if (monitoringGeofences) { locationManager.removeUpdates(this); monitoringGeofences = false }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_STOP_GEOFENCE_MONITORING", e.message, e)
        }
    }

    override fun onLocationChanged(location: Location) { checkGeofences(location) }
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    private fun hasPerm(): Boolean {
        return ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }

    private fun getEnabledProviders(): List<String> {
        val providers = mutableListOf<String>()
        if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) providers.add(LocationManager.GPS_PROVIDER)
        if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) providers.add(LocationManager.NETWORK_PROVIDER)
        return providers
    }

    private fun bestLastLocation(): Location? {
        var best: Location? = null
        for (p in getEnabledProviders()) {
            val loc = try { locationManager.getLastKnownLocation(p) } catch (e: Exception) { null }
            if (loc != null && (best == null || loc.time > best.time)) best = loc
        }
        return best
    }

    private fun toMap(location: Location?): WritableMap {
        val map: WritableMap = Arguments.createMap()
        if (location == null) {
            map.putDouble("latitude", 0.0); map.putDouble("longitude", 0.0)
            map.putDouble("accuracy", 0.0); map.putDouble("timestamp", 0.0)
            return map
        }
        map.putDouble("latitude", location.latitude)
        map.putDouble("longitude", location.longitude)
        map.putDouble("accuracy", location.accuracy.toDouble())
        map.putDouble("timestamp", location.time.toDouble())
        return map
    }

    private fun checkGeofences(location: Location) {
        val prefs = reactContext.getSharedPreferences("arcakids_geofences", Context.MODE_PRIVATE)
        val existing = prefs.getString("list", null) ?: return
        val arr = try { JSONArray(existing) } catch (e: Exception) { return }
        val results = FloatArray(1)
        for (i in 0 until arr.length()) {
            val obj = arr.getJSONObject(i)
            Location.distanceBetween(location.latitude, location.longitude, obj.optDouble("latitude"), obj.optDouble("longitude"), results)
            val inside = results[0] <= obj.optDouble("radius")
            obj.put("triggered", inside)
            obj.put("triggeredAt", if (inside) System.currentTimeMillis() else JSONObject.NULL)
        }
        prefs.edit().putString("list", arr.toString()).apply()
    }
}
`;
}

function arcakidsPackageContent(pkg) {
  return `package ${pkg}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ArcakidsPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            DeviceOwnerModule(reactContext),
            ParentalUsageModule(reactContext),
            ParentalLocationModule(reactContext)
        )
    }
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;
}

function blockingOverlayManagerContent(pkg) {
  return `package ${pkg}

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class BlockingOverlayManager(private val context: Context) {

    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val handler = Handler(Looper.getMainLooper())
    private val blockedSet = mutableSetOf<String>()
    private var currentOverlay: View? = null
    private var monitoring = false

    private val monitor = object : Runnable {
        override fun run() {
            if (!monitoring) return
            val topApp = currentTopApp()
            if (topApp != null && topApp in blockedSet) showOverlay(topApp) else hideOverlay()
            handler.postDelayed(this, 700)
        }
    }

    fun show(blocked: Set<String>) {
        blockedSet.clear(); blockedSet.addAll(blocked)
        if (!canDrawOverlays()) { monitoring = false; return }
        if (blockedSet.isEmpty()) { stop(); return }
        if (!monitoring) { monitoring = true; handler.post(monitor) }
    }

    fun stop() {
        monitoring = false
        handler.removeCallbacks(monitor)
        hideOverlay()
        blockedSet.clear()
    }

    private fun canDrawOverlays(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Settings.canDrawOverlays(context) else true
    }

    private fun showOverlay(blockedPkg: String) {
        if (currentOverlay != null || !canDrawOverlays()) return
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.CENTER

        val overlay = BlockingOverlayView(context, blockedPkg) {
            emitEvent(blockedPkg)
            hideOverlay()
        }

        try {
            windowManager.addView(overlay, params)
            currentOverlay = overlay
        } catch (e: Exception) {
            currentOverlay = null
        }
    }

    private fun hideOverlay() {
        val overlay = currentOverlay
        currentOverlay = null
        if (overlay != null) {
            try {
                windowManager.removeView(overlay)
            } catch (e: Exception) {
                // view already detached
            }
        }
    }

    private fun emitEvent(blockedPkg: String) {
        val react = context as? ReactApplicationContext
        react?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("arcakids:enforcementAction", blockedPkg)
    }

    private fun currentTopApp(): String? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val end = System.currentTimeMillis()
            val events = usm.queryEvents(end - 10_000, end) ?: return null
            var lastMoved: String? = null
            var lastEvent: UsageEvents.Event = UsageEvents.Event()
            while (events.hasNextEvent()) {
                events.getNextEvent(lastEvent)
                if (lastEvent.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    lastMoved = lastEvent.packageName
                } else if (lastEvent.eventType == UsageEvents.Event.MOVE_TO_BACKGROUND && lastMoved == lastEvent.packageName) {
                    lastMoved = null
                }
            }
            return lastMoved
        }
        @Suppress("DEPRECATION")
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        val tasks = am.runningAppProcesses ?: return null
        for (p in tasks) {
            if (p.importance == android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) return p.processName ?: continue
        }
        return null
    }
}

private class BlockingOverlayView(
    context: Context,
    private val blockedPkg: String,
    private val onRequestTime: () -> Unit
) : FrameLayout(context) {

    private val buttonRect = RectF()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    init {
        setWillNotDraw(false)
        isClickable = true
        isFocusable = true

        val wrapper = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(64, 64, 64, 64)
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                setColor(Color.parseColor("#E62B2B2B"))
                cornerRadius = 32f
            }
        }

        val title = TextView(context).apply {
            text = "Tiempo de uso finalizado"
            setTextColor(Color.WHITE)
            textSize = 24f
            setTypeface(null, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 12)
        }

        val subtitle = TextView(context).apply {
            text = "Esta app no está disponible por ahora."
            setTextColor(Color.parseColor("#DDDDDD"))
            textSize = 15f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 32)
        }

        val requestBtn = Button(context).apply {
            id = android.R.id.button1
            text = "Solicitar más tiempo"
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                setColor(Color.parseColor("#208AEF"))
                cornerRadius = 16f
            }
            setPadding(48, 24, 48, 24)
            textSize = 16f
            setTypeface(null, Typeface.BOLD)
            setOnClickListener { onRequestTime() }
            setOnTouchListener { v, event ->
                v.parent?.requestDisallowInterceptTouchEvent(true)
                v.onTouchEvent(event)
            }
        }

        wrapper.addView(title, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
        wrapper.addView(subtitle, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
        wrapper.addView(requestBtn, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
            gravity = Gravity.CENTER_HORIZONTAL
            topMargin = 16
        })

        addView(wrapper, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
            Gravity.CENTER
        ))
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        findViewById<View>(android.R.id.button1)?.let { btn ->
            val loc = IntArray(2)
            btn.getLocationOnScreen(loc)
            buttonRect.set(loc[0].toFloat(), loc[1].toFloat(),
                (loc[0] + btn.width).toFloat(), (loc[1] + btn.height).toFloat())
        }
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (!buttonRect.isEmpty && !buttonRect.contains(ev.x, ev.y)) {
            return true
        }
        return super.dispatchTouchEvent(ev)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        return true
    }
}
`;
}

function enforcementServiceContent(pkg) {
  return `package ${pkg}

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.admin.DevicePolicyManager
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import java.util.concurrent.Executors

class EnforcementService : Service() {

    companion object {
        private const val CHANNEL_ID = "arcakids_enforcement"
        private const val NOTIFICATION_ID = 1002
        private const val PREFS = "arcakids_enforcement"
        private const val KEY_STATE = "enforcement_state"
        private const val ACTION_STOP = "com.arcakids.child.action.STOP_ENFORCEMENT"
        private const val POLL_NORMAL_MS = 60_000L
        private const val POLL_ACTIVE_MS = 20_000L
        private const val USAGE_REPORT_INTERVAL_MS = 5 * 60_000L
        private const val RP_REPORTER = "arcakids_usage_reporter"
        private const val RP_LAST_REPORT = "last_usage_report_ms"

        fun start(context: Context) {
            val intent = Intent(context, EnforcementService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
            else context.startService(intent)
        }

        fun stop(context: Context) {
            context.startService(Intent(context, EnforcementService::class.java).setAction(ACTION_STOP))
        }

        fun saveState(context: Context, stateJson: String) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_STATE, stateJson).apply()
        }

        fun loadState(context: Context): EnforcementState? {
            val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_STATE, null) ?: return null
            return try { EnforcementState.fromJson(JSONObject(raw)) } catch (e: Exception) { null }
        }
    }

    private lateinit var notificationManager: NotificationManager
    private var enforcer: AppControl? = null
    private var overlayManager: BlockingOverlayManager? = null
    private var lastApplied: Pair<String, Set<String>>? = null
    private var reactive: Boolean = false
    private val looperHandler = Handler(Looper.getMainLooper())
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val pollRunnable = object : Runnable {
        override fun run() {
            if (!reactive) return
            applyEnforcement()
            reportUsageIfStale()
            looperHandler.postDelayed(this, nextPoll())
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createChannel()
        enforcer = AppControl(this)
        overlayManager = BlockingOverlayManager(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopReactiveLoop()
            enforcer?.releaseAll(); overlayManager?.stop()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE) else { @Suppress("DEPRECATION") stopForeground(true) }
            stopSelf()
            return START_NOT_STICKY
        }
        startForeground(NOTIFICATION_ID, buildNotification())
        applyEnforcement()
        startReactiveLoop()
        return START_STICKY
    }

    override fun onDestroy() {
        stopReactiveLoop()
        ioExecutor.shutdownNow()
        super.onDestroy()
    }

    private fun startReactiveLoop() {
        if (reactive) return
        reactive = true
        looperHandler.postDelayed(pollRunnable, nextPoll())
    }

    private fun stopReactiveLoop() {
        reactive = false
        looperHandler.removeCallbacks(pollRunnable)
    }

    private fun nextPoll(): Long {
        val state = EnforcementService.loadState(this) ?: return POLL_ACTIVE_MS
        val cal = Calendar.getInstance()
        val dayMinutes = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
        val active = state.enforce && (
            state.isBedtimeActive(dayMinutes) ||
            (state.dailyLimitMinutes != null && usageToday() >= (state.dailyLimitMinutes!! - 30)) ||
            !state.appLimits.isNullOrEmpty()
        )
        return if (active) POLL_ACTIVE_MS else POLL_NORMAL_MS
    }

    private fun applyEnforcement() {
        val state = EnforcementService.loadState(this) ?: run { enforcer?.releaseAll(); overlayManager?.stop(); return }
        val cal = Calendar.getInstance()
        val dayMinutes = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
        val withinBedtime = state.isBedtimeActive(dayMinutes)
        val dailyLimitReached = state.dailyLimitMinutes != null && usageToday() >= state.dailyLimitMinutes!!
        val shouldBlockAll = state.enforce && (withinBedtime || dailyLimitReached)

        val blocked = if (shouldBlockAll) getAllBlockingSet() else state.blockedPackages.toMutableSet()

        state.appLimits?.let { limits ->
            val today = usageTodayMap()
            for ((pkg, limit) in limits) { if ((today[pkg] ?: 0) >= limit) blocked.add(pkg) }
        }

        val isOwner = enforcer?.isDeviceOwner == true
        if (isOwner && state.enforce) enforcer?.apply(blocked.toList())
        else enforcer?.releaseAll()

        // Non-owner fallback: blocking overlay covers all blocked apps (including bedtime/all apps)
        val nonOwner = !isOwner
        val overlayTargets = blocked.minus(setOf(packageName))
        if (nonOwner && state.enforce && overlayTargets.isNotEmpty()) overlayManager?.show(overlayTargets)
        else overlayManager?.stop()
    }

    private fun getAllBlockingSet(): MutableSet<String> {
        val set = mutableSetOf<String>()
        val launcher = packageManager.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)?.activityInfo?.packageName
        for (info in packageManager.getInstalledApplications(0)) {
            if (info.packageName == packageName) continue
            if (info.packageName == launcher) continue
            if ((info.flags and ApplicationInfo.FLAG_SYSTEM) != 0) continue
            set.add(info.packageName)
        }
        return set
    }

    private fun usageToday(): Long {
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0)
        val stats = usm.queryAndAggregateUsageStats(cal.timeInMillis, System.currentTimeMillis())
        var total = 0L
        for ((pkg, s) in stats) { if (pkg != packageName && s.totalTimeInForeground > 0) total += s.totalTimeInForeground }
        return total / 60000
    }

    private fun usageTodayMap(): Map<String, Long> {
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0)
        val stats = usm.queryAndAggregateUsageStats(cal.timeInMillis, System.currentTimeMillis())
        val result = mutableMapOf<String, Long>()
        for ((pkg, s) in stats) { if (pkg != packageName) { val m = s.totalTimeInForeground / 60000; if (m > 0) result[pkg] = m } }
        return result
    }

    private fun reportUsageIfStale() {
        val reporterPrefs = getSharedPreferences(RP_REPORTER, Context.MODE_PRIVATE)
        val url = reporterPrefs.getString("supabase_url", null)
        val anonKey = reporterPrefs.getString("supabase_anon_key", null)
        val deviceUuid = reporterPrefs.getString("device_uuid", null)
        if (url.isNullOrEmpty() || anonKey.isNullOrEmpty() || deviceUuid.isNullOrEmpty()) return

        val now = System.currentTimeMillis()
        val last = reporterPrefs.getLong(RP_LAST_REPORT, 0L)
        if (now - last < USAGE_REPORT_INTERVAL_MS) return

        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0)
        val reportDate = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(cal.time)
        val usage = usageTodayMap()
        if (usage.isEmpty()) return

        ioExecutor.execute {
            try {
                postUsage(url, anonKey, deviceUuid, reportDate, usage)
                getSharedPreferences(RP_REPORTER, Context.MODE_PRIVATE).edit().putLong(RP_LAST_REPORT, now).apply()
            } catch (t: Throwable) {
                // Transient network error: keep last_report so we retry next cycle.
            }
        }
    }

    private fun postUsage(url: String, anonKey: String, deviceUuid: String, reportDate: String, usage: Map<String, Long>) {
        val entries = JSONArray()
        for ((pkg, minutes) in usage) {
            entries.put(JSONObject().put("package", pkg).put("minutes", minutes))
        }
        val body = JSONObject().put("p_device_uuid", deviceUuid).put("p_report_date", reportDate).put("p_entries", entries)

        val connection = URL("\${url.trimEnd('/')}/rest/v1/rpc/report_usage_for_device").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", anonKey)
            connection.setRequestProperty("Authorization", "Bearer $anonKey")
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(body.toString()) }
            connection.inputStream.close() // drain
        } finally {
            connection.disconnect()
        }
    }

    private fun buildNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pending = PendingIntent.getActivity(this, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Control parental activo")
            .setContentText("NOE y ARCA KIDS están protegiendo este dispositivo")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setContentIntent(pending)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notificationManager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Control parental", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Servicio activo de control parental"; setShowBadge(false)
                }
            )
        }
    }
}

class AppControl(private val context: Context) {
    private val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val admin = ComponentName(context, DeviceAdminReceiver::class.java)
    private var applied: MutableSet<String> = mutableSetOf()

    val isDeviceOwner: Boolean get() = try { dpm.isDeviceOwnerApp(context.packageName) } catch (e: Exception) { false }

    fun apply(packages: List<String>) {
        if (!isDeviceOwner) return
        try {
            val toSuspend = packages.filter { it != context.packageName }
            val toRelease = applied.minus(toSuspend.toSet())
            if (toRelease.isNotEmpty()) { try { dpm.setPackagesSuspended(admin, toRelease.toTypedArray(), false) } catch (e: Exception) {} }
            if (toSuspend.isNotEmpty()) { try { dpm.setPackagesSuspended(admin, toSuspend.toTypedArray(), true) } catch (e: Exception) {} }
            applied = toSuspend.toMutableSet()
        } catch (e: Exception) {}
    }

    fun releaseAll() {
        if (applied.isEmpty()) return
        if (!isDeviceOwner) return
        try { dpm.setPackagesSuspended(admin, applied.toTypedArray(), false) } catch (e: Exception) {}
        applied.clear()
    }
}

data class EnforcementState(
    val enforce: Boolean,
    val bedtimeEnabled: Boolean,
    val bedtimeStart: String?,
    val bedtimeEnd: String?,
    val dailyLimitMinutes: Long?,
    val bonusMinutes: Long,
    val pausedUntil: Long?,
    val blockedPackages: List<String>,
    val appLimits: Map<String, Long>?
) {
    fun isBedtimeActive(dayMinutes: Int): Boolean {
        if (!bedtimeEnabled) return false
        val start = bedtimeStart?.split(":")?.let { it[0].toIntOrNull()?.times(60)?.plus(it[1].toIntOrNull() ?: 0) }
        val end = bedtimeEnd?.split(":")?.let { it[0].toIntOrNull()?.times(60)?.plus(it[1].toIntOrNull() ?: 0) }
        if (start == null || end == null) return false
        if (start == end) return false
        return if (start < end) dayMinutes >= start && dayMinutes < end else dayMinutes >= start || dayMinutes < end
    }

    companion object {
        fun fromJson(json: JSONObject): EnforcementState {
            val appLimits = mutableMapOf<String, Long>()
            json.optJSONObject("appLimits")?.let { limits ->
                val keys = limits.keys()
                while (keys.hasNext()) { val k = keys.next(); appLimits[k] = limits.optLong(k, 0) }
            }
            val blocked = mutableListOf<String>()
            json.optJSONArray("blockedPackages")?.let { arr -> for (i in 0 until arr.length()) blocked.add(arr.getString(i)) }
            return EnforcementState(
                enforce = json.optBoolean("enforce", false),
                bedtimeEnabled = json.optBoolean("bedtimeEnabled", false),
                bedtimeStart = if (json.isNull("bedtimeStart")) null else json.optString("bedtimeStart"),
                bedtimeEnd = if (json.isNull("bedtimeEnd")) null else json.optString("bedtimeEnd"),
                dailyLimitMinutes = if (json.isNull("dailyLimitMinutes")) null else json.optLong("dailyLimitMinutes"),
                bonusMinutes = json.optLong("bonusMinutes", 0),
                pausedUntil = if (json.isNull("pausedUntil")) null else json.optLong("pausedUntil"),
                blockedPackages = blocked,
                appLimits = if (appLimits.isEmpty()) null else appLimits
            )
        }
    }
}
`;
}

// ---------------------------------------------------------------------------
// Manifest manipulation
// ---------------------------------------------------------------------------
function withArcakidsManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    if (!manifest.application || manifest.application.length === 0) return mod;
    const application = manifest.application[0];

    // Permissions to ensure are present.
    const neededPermissions = [
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.PACKAGE_USAGE_STATS',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.WAKE_LOCK',
    ];
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    for (const perm of neededPermissions) {
      const has = manifest['uses-permission'].some((p) => p.$ && p.$['android:name'] === perm);
      if (!has) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    // DeviceAdminReceiver.
    if (!application.receiver) application.receiver = [];
    const hasReceiver = application.receiver.some((r) => {
      const name = r.$ && r.$['android:name'];
      return name === '.DeviceAdminReceiver' || (name && name.endsWith('.DeviceAdminReceiver'));
    });
    if (!hasReceiver) {
      application.receiver.push({
        $: { 'android:name': '.DeviceAdminReceiver', 'android:permission': 'android.permission.BIND_DEVICE_ADMIN', 'android:exported': 'false' },
        'meta-data': [{ $: { 'android:name': 'android.app.device_admin', 'android:resource': '@xml/device_admin' } }],
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.app.action.DEVICE_ADMIN_ENABLED' } }] }],
      });
    }

    // EnforcementService (+ specialUse property on API 34+).
    if (!application.service) application.service = [];
    const hasService = application.service.some((s) => s.$ && s.$['android:name'] === '.EnforcementService');
    if (!hasService) {
      application.service.push({
        $: { 'android:name': '.EnforcementService', 'android:exported': 'false', 'android:foregroundServiceType': 'specialUse' },
        property: [{
          $: { 'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE', 'android:value': 'parental_control' },
        }],
      });
    }

    return mod;
  });
}

// ---------------------------------------------------------------------------
// Dangerous mod: write files + patch MainApplication
// ---------------------------------------------------------------------------
function withArcakidsFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const platformRoot = mod.modRequest.platformProjectRoot;
      const pkg = (config.android && config.android.package) || 'com.arcakids.child';
      const pkgPath = pkg.replace(/\./g, '/');
      const javaBase = path.join(platformRoot, `app/src/main/java/${pkgPath}`);

      async function ensureWrite(filePath, content) {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        let existing = null;
        try { existing = await fs.promises.readFile(filePath, 'utf8'); } catch (_) {}
        if (existing !== content) await fs.promises.writeFile(filePath, content, 'utf8');
      }

      // res/xml/device_admin.xml
      await ensureWrite(path.join(platformRoot, 'app/src/main/res/xml/device_admin.xml'), DEVICE_ADMIN_XML);

      // Source files (mirror of android/app/src/main/java)
      const files = {
        'DeviceAdminReceiver.java': deviceAdminReceiverJavaContent(pkg),
        'ProvisioningHandler.java': provisioningHandlerContent(pkg),
        'DeviceOwnerModule.kt': deviceOwnerModuleContent(pkg),
        'ParentalUsageModule.kt': parentalUsageModuleContent(pkg),
        'ParentalLocationModule.kt': parentalLocationModuleContent(pkg),
        'ArcakidsPackage.kt': arcakidsPackageContent(pkg),
        'BlockingOverlayManager.kt': blockingOverlayManagerContent(pkg),
        'EnforcementService.kt': enforcementServiceContent(pkg),
      };
      for (const [file, content] of Object.entries(files)) {
        await ensureWrite(path.join(javaBase, file), content);
      }

      // Patch MainApplication to register ArcakidsPackage.
      const mainAppPath = path.join(javaBase, 'MainApplication.kt');
      try {
        let content = await fs.promises.readFile(mainAppPath, 'utf8');
        if (!content.includes('ArcakidsPackage')) {
          if (content.includes('PackageList(this).packages.apply')) {
            content = content.replace(
              /PackageList\(this\)\.packages\.apply\s*\{/,
              (m) => `${m}\n          add(ArcakidsPackage())`
            );
            await fs.promises.writeFile(mainAppPath, content, 'utf8');
          }
        }
      } catch (_) {}

      // Patch MainActivity for provisioning deep links.
      const mainActivityPath = path.join(javaBase, 'MainActivity.kt');
      try {
        let content = await fs.promises.readFile(mainActivityPath, 'utf8');
        let dirty = false;
        if (!content.includes('import android.content.Intent')) {
          content = content.replace('import android.os.Bundle', 'import android.content.Intent\nimport android.os.Bundle');
          dirty = true;
        }
        if (!content.includes('ProvisioningHandler')) {
          content = content.replace(/super\.onCreate\([^)]*\)/, (m) => `${m}\n    ProvisioningHandler.handleIntent(this, intent)`);
          dirty = true;
        }
        if (!dirty) {
          // Run once to make sure the permission-result wiring is present.
          if (!content.includes('onRequestPermissionsResult')) {
            if (!content.includes('import android.content.pm.PackageManager')) {
              content = content.replace('import android.content.Intent', 'import android.content.Intent\nimport android.content.pm.PackageManager');
            }
            content = content.replace(
              /(\n\s*override fun createReactActivityDelegate.*?\}\}\)\s*)\n/,
              '$1\n  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {\n    super.onRequestPermissionsResult(requestCode, permissions, grantResults)\n    if (requestCode == 4201) {\n      ParentalLocationModule.onRequestPermissionsResult(requestCode, grantResults)\n    }\n  }\n'
            );
            dirty = true;
          }
        }
        if (dirty) await fs.promises.writeFile(mainActivityPath, content, 'utf8');
      } catch (_) {}

      return mod;
    },
  ]);
}

function withArcakids(config) {
  let cfg = withArcakidsManifest(config);
  cfg = withArcakidsFiles(cfg);
  return cfg;
}

module.exports = createRunOncePlugin(withArcakids, 'with-arcakids-native', '1.0.0');
module.exports.withArcakids = withArcakids;
