package com.arcakids.child

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Handler
import android.os.Looper

/**
 * Audible block alarm (Parte 7): a short alarm beep that plays even when the
 * device is in silent/vibrate or Do-Not-Disturb, because it targets the
 * STREAM_ALARM (USAGE_ALARM) audio stream. Used when enforcement blocks an app
 * or the device (accessibility fallback and blocking overlay).
 *
 * Rate-limited so a child repeatedly retrying cannot keep it ringing forever;
 * the alarm fires at most once every [MIN_INTERVAL_MS].
 */
object BlockAlarm {

    private const val MIN_INTERVAL_MS = 30_000L
    private const val TONE_DURATION_MS = 250
    private const val ALARM_VOLUME_PERCENT = 100

    @Volatile
    private var lastPlayedMs = 0L

    private var tone: ToneGenerator? = null
    private val handler = Handler(Looper.getMainLooper())

    @Synchronized
    fun play(context: Context) {
        val now = System.currentTimeMillis()
        if (now - lastPlayedMs < MIN_INTERVAL_MS) return
        lastPlayedMs = now

        try {
            val generator = ToneGenerator(AudioManager.STREAM_ALARM, ALARM_VOLUME_PERCENT)
            tone = generator
            generator.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, TONE_DURATION_MS)
            handler.postDelayed({
                if (tone === generator) {
                    try { generator.stopTone() } catch (ignored: Exception) {}
                    try { generator.release() } catch (ignored: Exception) {}
                    tone = null
                }
            }, TONE_DURATION_MS + 150L)
        } catch (t: Throwable) {
            // Audio unavailable (strict vendor builds, etc.): silent fallback.
            tone = null
        }
    }

    @Synchronized
    fun stop() {
        handler.removeCallbacksAndMessages(null)
        tone?.let { t ->
            try { t.stopTone() } catch (ignored: Exception) {}
            try { t.release() } catch (ignored: Exception) {}
        }
        tone = null
    }
}