package com.arcakids.child

import android.app.ActivityManager
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.TextView

class BlockingOverlayManager(private val context: Context) {

    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val handler = Handler(Looper.getMainLooper())
    private val blockedSet = mutableSetOf<String>()
    private var currentOverlay: TextView? = null
    private var monitoring = false

    private val monitor = object : Runnable {
        override fun run() {
            if (!monitoring) return
            val topApp = currentTopApp()
            if (topApp != null && topApp in blockedSet) showOverlay() else hideOverlay()
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

    private fun showOverlay() {
        if (currentOverlay != null || !canDrawOverlays()) return
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.TOP or Gravity.START
        val tv = TextView(context)
        tv.text = "Tiempo de uso finalizado"
        tv.setTextColor(Color.WHITE); tv.textSize = 22f; tv.setTypeface(null, Typeface.BOLD)
        tv.gravity = Gravity.CENTER; tv.setBackgroundColor(Color.parseColor("#CC2B2B2B"))
        try { windowManager.addView(tv, params); currentOverlay = tv } catch (e: Exception) { currentOverlay = null }
    }

    private fun hideOverlay() {
        currentOverlay?.let { try { windowManager.removeView(it) } catch (e: Exception) {} currentOverlay = null }
    }

    @Suppress("DEPRECATION")
    private fun currentTopApp(): String? {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val tasks = am.runningAppProcesses ?: return null
        for (p in tasks) {
            if (p.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) return p.processName ?: continue
        }
        return null
    }
}
