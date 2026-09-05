package com.arcakids.child

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
                ?: throw ActivityNotFoundException("No launch intent for $packageName")
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
