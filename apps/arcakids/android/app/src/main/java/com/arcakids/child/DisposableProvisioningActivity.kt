package com.arcakids.child

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log

/**
 * Device Owner provisioning entry point.
 *
 * The Setup Wizard launches this activity (action PROVISION_MANAGED_DEVICE) with the
 * admin extras bundle when the parent scans the device-owner QR in NOE. We persist the
 * familyId/childId/pairingCode extras so the app can auto-link after provisioning, then
 * return RESULT_OK. The system assigns the Device Owner role on RESULT_OK — the app must
 * not call setDeviceOwner() itself (system-only API).
 */
class DisposableProvisioningActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val intent = intent
        if (intent?.action == DevicePolicyManager.ACTION_PROVISION_MANAGED_DEVICE &&
            !isAdminAlreadyActive()
        ) {
            val extras = intent.getBundleExtra(DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE)
            ProvisioningHandler.persistExtras(this, extras)
            Log.d(TAG, "Provisioning extras persisted; finishing provisioning with RESULT_OK")
            setResult(RESULT_OK)
            finish()
        } else {
            // Launched outside provisioning (e.g. already a Device Owner, or opened manually).
            try {
                startActivity(Intent(this, MainActivity::class.java))
            } catch (_: Exception) {}
            finish()
        }
    }

    private fun isAdminAlreadyActive(): Boolean {
        return try {
            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            dpm.isAdminActive(ComponentName(this, DeviceAdminReceiver::class.java))
        } catch (_: Exception) {
            false
        }
    }

    private companion object {
        const val TAG = "DisposableProvisioning"
    }
}