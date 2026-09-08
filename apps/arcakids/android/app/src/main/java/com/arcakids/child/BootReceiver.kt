package com.arcakids.child

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Restarts the enforcement service after reboot or app upgrade so parental control
 * (block/suspend rules) survives restarts even when the app is never opened again.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                EnforcementService.start(context)
            }
        }
    }
}