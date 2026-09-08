package com.arcakids.child

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
        // Device-level block is the authoritative total lock (parent blocked the device).
        // It must not be overridden by rules-based enforcement state.
        if (getSharedPreferences("arcakids_device", Context.MODE_PRIVATE).getBoolean("is_blocked", false)) {
            applyTotalLock()
            return
        }
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

    /** Total device lock: suspend everything (owner) or show a persistent full-screen overlay. */
    private fun applyTotalLock() {
        val isOwner = enforcer?.isDeviceOwner == true
        val targets = getAllBlockingSet(includeLauncher = true)
        if (isOwner) {
            enforcer?.apply(targets.toList())
        } else {
            overlayManager?.showLockAll()
        }
    }

    private fun getAllBlockingSet(includeLauncher: Boolean = false): MutableSet<String> {
        val set = mutableSetOf<String>()
        val launcher = if (includeLauncher) null else packageManager.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)?.activityInfo?.packageName
        for (info in packageManager.getInstalledApplications(0)) {
            if (info.packageName == packageName) continue
            if (launcher != null && info.packageName == launcher) continue
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

        val connection = URL("${url.trimEnd('/')}/rest/v1/rpc/report_usage_for_device").openConnection() as HttpURLConnection
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
