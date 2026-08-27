package com.arcakids.child

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Foreground service that enforces parental rules while the child uses other
 * apps: brings ARCA KIDS back to the front when the daily limit, bedtime or a
 * blocked app violation is detected. Rule state is cached by JS in prefs.
 */
class EnforcementService : Service() {

  private val handler = Handler(Looper.getMainLooper())

  private val tick = object : Runnable {
    override fun run() {
      enforce()
      handler.postDelayed(this, CHECK_INTERVAL_MS)
    }
  }

  override fun onCreate() {
    super.onCreate()
    startInForeground()
    handler.post(tick)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopSelf()
      return START_NOT_STICKY
    }
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    super.onDestroy()
  }

  private fun enforce() {
    try {
      val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val raw = prefs.getString(KEY_STATE, null) ?: return
      val state = JSONObject(raw)
      if (!state.optBoolean("enforce", false)) {
        return
      }

      // Merge device state (isBlocked, alertActive) from the separate key.
      val deviceRaw = prefs.getString(KEY_DEVICE_STATE, null)
      if (deviceRaw != null) {
        try {
          val deviceState = JSONObject(deviceRaw)
          state.put("isBlocked", deviceState.optBoolean("isBlocked", false))
          state.put("alertActive", deviceState.optBoolean("alertActive", false))
        } catch (_: Exception) {
          // Malformed device state — ignore, use defaults.
        }
      }

      // Block check — bring app to front immediately.
      val isBlocked = state.optBoolean("isBlocked", false)
      if (isBlocked) {
        bringAppToFront()
        return
      }

      // Sonic alert — play sound and vibrate when active.
      val alertActive = state.optBoolean("alertActive", false)
      if (alertActive) {
        playAlertSound()
      }

      val nowMinutes = Calendar.getInstance().let {
        it.get(Calendar.HOUR_OF_DAY) * 60 + it.get(Calendar.MINUTE)
      }

      var restricted = false

      val pausedUntil = state.optLong("pausedUntil", 0L)
      if (pausedUntil > 0 && System.currentTimeMillis() < pausedUntil) {
        restricted = true
      }

      if (!restricted && state.optBoolean("bedtimeEnabled", false)) {
        val start = parseHhMm(state.optString("bedtimeStart", ""))
        val end = parseHhMm(state.optString("bedtimeEnd", ""))
        if (start != null && end != null && start != end) {
          val inWindow =
            if (start < end) nowMinutes >= start && nowMinutes < end
            else nowMinutes >= start || nowMinutes < end
          restricted = inWindow
        }
      }

      if (!restricted) {
        val limit = state.optInt("dailyLimitMinutes", -1)
        if (limit >= 0) {
          val effective = limit + state.optInt("bonusMinutes", 0)
          if (todayUsageMinutes() >= effective) {
            restricted = true
          }
        }
      }

      val foreground = currentForegroundPackage()
      val foregroundIsBlocked =
        foreground != null &&
          foreground != packageName &&
          containsPackage(state.optJSONArray("blockedPackages"), foreground)

      // Check per-app time limits for 'limited' category apps.
      val appLimits = state.optJSONObject("appLimits")
      if (appLimits != null && foreground != null && foreground != packageName) {
        val appLimit = appLimits.optInt(foreground, -1)
        if (appLimit >= 0) {
          val appUsage = getPackageUsageMinutes(foreground)
          if (appUsage >= appLimit) {
            bringAppToFront()
            return
          }
        }
      }

      if (restricted || foregroundIsBlocked) {
        bringAppToFront()
      }
    } catch (_: Exception) {
      // Never crash the service on malformed state.
    }
  }

  @Suppress("DEPRECATION")
  private fun playAlertSound() {
    try {
      val audioManager = getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager

      // Set to max volume
      audioManager.setStreamVolume(
        android.media.AudioManager.STREAM_ALARM,
        audioManager.getStreamMaxVolume(android.media.AudioManager.STREAM_ALARM),
        0
      )

      // Play alarm sound
      val uri = android.media.RingtoneManager.getDefaultUri(
        android.media.RingtoneManager.TYPE_ALARM
      )
      val ringtone = android.media.RingtoneManager.getRingtone(applicationContext, uri)
      ringtone?.play()

      // Also vibrate
      val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as
          android.os.VibratorManager
        manager.defaultVibrator
      } else {
        getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator.vibrate(
          android.os.VibrationEffect.createWaveform(
            longArrayOf(0, 500, 200, 500), 0
          )
        )
      } else {
        vibrator.vibrate(longArrayOf(0, 500, 200, 500), 0)
      }
    } catch (_: Exception) {
      // Service must not crash.
    }
  }

  private fun getPackageUsageMinutes(packageName: String): Long {
    try {
      val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val start = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }.timeInMillis
      val stats = usm.queryAndAggregateUsageStats(start, System.currentTimeMillis())
      val usageStats = stats[packageName] ?: return 0
      return TimeUnit.MILLISECONDS.toMinutes(usageStats.totalTimeInForeground)
    } catch (e: Exception) {
      return 0
    }
  }

  private fun todayUsageMinutes(): Long {
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val start = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }.timeInMillis
    val stats = usm.queryAndAggregateUsageStats(start, System.currentTimeMillis())
    var total = 0L
    for ((_, usageStats) in stats) {
      total += usageStats.totalTimeInForeground
    }
    return TimeUnit.MILLISECONDS.toMinutes(total)
  }

  private fun currentForegroundPackage(): String? {
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val end = System.currentTimeMillis()
    val events = usm.queryEvents(end - TimeUnit.MINUTES.toMillis(2), end)
    val event = UsageEvents.Event()
    var last: String? = null
    val resumedType =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        UsageEvents.Event.ACTIVITY_RESUMED
      } else {
        1 // MOVE_TO_FOREGROUND legacy value
      }
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.eventType == resumedType) {
        last = event.packageName
      }
    }
    return last
  }

  private fun containsPackage(array: JSONArray?, packageName: String): Boolean {
    if (array == null) {
      return false
    }
    for (i in 0 until array.length()) {
      if (array.optString(i) == packageName) {
        return true
      }
    }
    return false
  }

  private fun bringAppToFront() {
    val intent = Intent(this, MainActivity::class.java)
    intent.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
    )
    startActivity(intent)
  }

  private fun startInForeground() {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        getString(R.string.enforcement_channel_name),
        NotificationManager.IMPORTANCE_MIN
      )
      manager.createNotificationChannel(channel)
    }
    val notification: Notification =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(this, CHANNEL_ID)
          .setContentTitle(getString(R.string.enforcement_notification_title))
          .setSmallIcon(android.R.drawable.ic_lock_lock)
          .build()
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(this)
          .setContentTitle(getString(R.string.enforcement_notification_title))
          .setSmallIcon(android.R.drawable.ic_lock_lock)
          .build()
      }
    startForeground(NOTIFICATION_ID, notification)
  }

  companion object {
    const val PREFS_NAME = "arcakids_enforcement"
    const val KEY_STATE = "state"
    const val KEY_DEVICE_STATE = "device_state"
    const val ACTION_STOP = "com.arcakids.child.STOP_ENFORCEMENT"

    private const val CHANNEL_ID = "enforcement"
    private const val NOTIFICATION_ID = 41
    private const val CHECK_INTERVAL_MS = 20_000L

    fun parseHhMm(value: String): Int? {
      val parts = value.split(":")
      if (parts.size < 2) {
        return null
      }
      val hours = parts[0].toIntOrNull() ?: return null
      val minutes = parts[1].toIntOrNull() ?: return null
      if (hours !in 0..23 || minutes !in 0..59) {
        return null
      }
      return hours * 60 + minutes
    }
  }
}
