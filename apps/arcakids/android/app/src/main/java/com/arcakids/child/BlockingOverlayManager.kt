package com.arcakids.child

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
    private var lockAllMode = false

    private val monitor = object : Runnable {
        override fun run() {
            if (!monitoring) return
            if (lockAllMode) {
                if (currentOverlay == null) showOverlay("", dismissible = false)
            } else {
                val topApp = currentTopApp()
                if (topApp != null && topApp in blockedSet) showOverlay(topApp) else hideOverlay()
            }
            handler.postDelayed(this, 700)
        }
    }

    fun show(blocked: Set<String>) {
        lockAllMode = false
        blockedSet.clear(); blockedSet.addAll(blocked)
        if (!canDrawOverlays()) { monitoring = false; return }
        if (blockedSet.isEmpty()) { stop(); return }
        if (!monitoring) { monitoring = true; handler.post(monitor) }
    }

    fun showLockAll() {
        lockAllMode = true
        blockedSet.clear()
        if (!canDrawOverlays()) { monitoring = false; return }
        hideOverlay()
        showOverlay("", dismissible = false)
        if (!monitoring) { monitoring = true; handler.post(monitor) }
    }

    fun stop() {
        lockAllMode = false
        monitoring = false
        handler.removeCallbacks(monitor)
        hideOverlay()
        blockedSet.clear()
    }

    private fun canDrawOverlays(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Settings.canDrawOverlays(context) else true
    }

    private fun showOverlay(blockedPkg: String, dismissible: Boolean = true) {
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

        val overlay = BlockingOverlayView(context, blockedPkg, dismissible) {
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
    private val dismissible: Boolean,
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
            text = if (dismissible) "Tiempo de uso finalizado" else "Dispositivo bloqueado"
            setTextColor(Color.WHITE)
            textSize = 24f
            setTypeface(null, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 12)
        }

        val subtitle = TextView(context).apply {
            text = if (dismissible) "Esta app no está disponible por ahora." else "El control parental ha bloqueado el dispositivo."
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
        if (dismissible) {
            wrapper.addView(requestBtn, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                gravity = Gravity.CENTER_HORIZONTAL
                topMargin = 16
            })
        }

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
