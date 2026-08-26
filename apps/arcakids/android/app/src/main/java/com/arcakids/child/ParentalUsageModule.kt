package com.arcakids.child

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Exposes usage-stats and launcher helpers to JS for parental enforcement.
 * Requires the PACKAGE_USAGE_STATS special access (granted from system settings).
 */
class ParentalUsageModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "ParentalUsage"

  @ReactMethod
  fun hasUsageStatsPermission(promise: Promise) {
    promise.resolve(hasPermission())
  }

  @ReactMethod
  fun openUsageAccessSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("OPEN_SETTINGS_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun isDefaultLauncher(promise: Promise) {
    try {
      val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
      val resolved = reactContext.packageManager.resolveActivity(home, 0)
      promise.resolve(resolved?.activityInfo?.packageName == reactContext.packageName)
    } catch (e: Exception) {
      promise.reject("LAUNCHER_CHECK_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun openDefaultAppsSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_HOME_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("OPEN_SETTINGS_ERROR", e.message, e)
    }
  }

  /** Minutes of foreground usage per package since local midnight. */
  @ReactMethod
  fun getUsageTodayMinutes(promise: Promise) {
    if (!hasPermission()) {
      promise.reject("PERMISSION_DENIED", "PACKAGE_USAGE_STATS permission not granted")
      return
    }
    try {
      val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val start = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }.timeInMillis
      val end = System.currentTimeMillis()
      val stats = usm.queryAndAggregateUsageStats(start, end)

      val result = Arguments.createMap()
      var totalMinutes = 0L
      for ((packageName, usageStats) in stats) {
        val minutes = TimeUnit.MILLISECONDS.toMinutes(usageStats.totalTimeInForeground)
        if (minutes > 0) {
          result.putInt(packageName, minutes.toInt())
          totalMinutes += minutes
        }
      }
      result.putInt("total", totalMinutes.toInt())
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("USAGE_ERROR", e.message, e)
    }
  }

  /** Launchable apps visible to the caller, excluding this app. */
  @ReactMethod
  fun getLaunchableApps(promise: Promise) {
    try {
      val pm = reactContext.packageManager
      val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      val infos = pm.queryIntentActivities(intent, 0)
      val seen = LinkedHashMap<String, CharSequence>()
      for (info in infos) {
        val pkg = info.activityInfo?.packageName ?: continue
        if (pkg == reactContext.packageName || seen.containsKey(pkg)) {
          continue
        }
        seen[pkg] = info.loadLabel(pm) ?: pkg
      }
      val array = Arguments.createArray()
      for ((pkg, label) in seen) {
        val item = Arguments.createMap()
        item.putString("packageName", pkg)
        item.putString("label", label.toString())
        array.pushMap(item)
      }
      promise.resolve(array)
    } catch (e: Exception) {
      promise.reject("APPS_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun launchApp(packageName: String, promise: Promise) {
    try {
      val intent = reactContext.packageManager.getLaunchIntentForPackage(packageName)
      if (intent == null) {
        promise.resolve(false)
        return
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("LAUNCH_ERROR", e.message, e)
    }
  }

  /** Caches the enforcement state JSON consumed by EnforcementService. */
  @ReactMethod
  fun updateEnforcementState(stateJson: String, promise: Promise) {
    try {
      val prefs =
        reactContext.getSharedPreferences(EnforcementService.PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().putString(EnforcementService.KEY_STATE, stateJson).apply()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("STATE_ERROR", e.message, e)
    }
  }

  /** Caches device state (isBlocked, alertActive) for EnforcementService. */
  @ReactMethod
  fun updateDeviceState(deviceStateJson: String, promise: Promise) {
    try {
      val prefs =
        reactContext.getSharedPreferences(EnforcementService.PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().putString(EnforcementService.KEY_DEVICE_STATE, deviceStateJson).apply()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DEVICE_STATE_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun startEnforcement(promise: Promise) {
    try {
      val intent = Intent(reactContext, EnforcementService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.startForegroundService(intent)
      } else {
        reactContext.startService(intent)
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SERVICE_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun stopEnforcement(promise: Promise) {
    try {
      reactContext.stopService(Intent(reactContext, EnforcementService::class.java))
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SERVICE_ERROR", e.message, e)
    }
  }

  private fun hasPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) {
      return false
    }
    val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      Process.myUid(),
      reactContext.packageName
    )
    return mode == AppOpsManager.MODE_ALLOWED
  }
}
