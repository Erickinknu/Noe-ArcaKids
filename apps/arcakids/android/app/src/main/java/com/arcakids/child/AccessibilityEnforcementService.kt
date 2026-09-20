package com.arcakids.child

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent

/**
 * Accessibility-based blocking (real, universal fallback).
 *
 * When the app is NOT device owner, DPM package suspension is unavailable; this
 * service detects when a blocked package moves to the foreground and exits it
 * (global HOME action). It requires explicit user consent in the onboarding
 * (prominent disclosure: control parental, no lectura de contenido estándar).
 *
 * The blocked set is written by [EnforcementService.applyEnforcement] through
 * [syncBlockedSet]; the service re-reads it on every window change so the set
 * is always up to date without restarting the service.
 */
class AccessibilityEnforcementService : AccessibilityService() {

    companion object {
        private const val PREFS = "arcakids_accessibility"
        private const val KEY_BLOCKED = "blocked_set"
        private const val EVENT_PREFS = "arcakids_device"
        private const val KEY_LAST_BLOCK = "last_block_event_ms"
        private const val BLOCK_COOLDOWN_MS = 800L

        fun isEnabled(context: Context): Boolean {
            return try {
                val enabled = Settings.Secure.getString(
                    context.contentResolver,
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                ) ?: ""
                enabled.split(':').any { it.endsWith("AccessibilityEnforcementService") }
            } catch (e: Exception) {
                false
            }
        }

        fun openSettings(context: Context) {
            try {
                val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            } catch (e: Exception) {
                // Ajustes de accesibilidad ausentes en algunos fabricantes.
            }
        }

        fun syncBlockedSet(context: Context, blocked: Set<String>) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putStringSet(KEY_BLOCKED, blocked).apply()
        }

        private fun loadBlockedSet(context: Context): Set<String> {
            return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getStringSet(KEY_BLOCKED, emptySet()) ?: emptySet()
        }
    }

    private var blockedSet: Set<String> = emptySet()

    override fun onServiceConnected() {
        super.onServiceConnected()
        refreshBlockedSet()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        refreshBlockedSet()
        val pkg = event.packageName?.toString() ?: return
        if (pkg !in blockedSet) return

        val now = System.currentTimeMillis()
        val prefs = getSharedPreferences(EVENT_PREFS, Context.MODE_PRIVATE)
        if (now - prefs.getLong(KEY_LAST_BLOCK, 0L) < BLOCK_COOLDOWN_MS) return
        prefs.edit().putLong(KEY_LAST_BLOCK, now).apply()

        // Audible alarm (audible even in silent mode) so the parent hears the
        // attempted block; rate-limited internally.
        try { BlockAlarm.play(this) } catch (ignored: Exception) {}

        // Exit the blocked app without landing on another blocked one.
        performGlobalAction(GLOBAL_ACTION_HOME)
    }

    override fun onInterrupt() {
        // No foreground work to stop.
    }

    private fun refreshBlockedSet() {
        blockedSet = loadBlockedSet(this)
    }
}