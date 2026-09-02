package com.arcakids.child

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class BlockingOverlayManager(private val context: Context) {

    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val handler = Handler(Looper.getMainLooper())
    private val blockedSet = mutableSetOf<String>()
    private var currentOverlay: LinearLayout? = null
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
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.CENTER

        val root = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                setColor(Color.parseColor("#E62B2B2B"))
                cornerRadius = 24f
            }
        }

        val title = TextView(context).apply {
            text = "Tiempo de uso finalizado"
            setTextColor(Color.WHITE)
            textSize = 24f
            setTypeface(null, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 8)
        }

        val subtitle = TextView(context).apply {
            text = "Esta app no está disponible por ahora."
            setTextColor(Color.parseColor("#DDDDDD"))
            textSize = 15f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 24)
        }

        val requestBtn = Button(context).apply {
            text = "Solicitar más tiempo"
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                setColor(Color.parseColor("#208AEF"))
                cornerRadius = 12f
            }
            setOnClickListener {
                emitEvent(blockedPkg)
                hideOverlay()
            }
        }

        root.addView(title)
        root.addView(subtitle)
        root.addView(requestBtn)

        try {
            windowManager.addView(root, params)
            currentOverlay = root
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
