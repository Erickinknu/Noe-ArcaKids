package com.arcakids.child;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * DeviceAdminReceiver for Device Owner / Profile Owner flows.
 *
 * Provisioning via QR (android.app.action.PROVISION_MANAGED_DEVICE) sets
 * this receiver as the Device Owner. Once that happens, DevicePolicyManager
 * grants privileged APIs: lockNow(), setPackagesSuspended(), wipeData(), etc.
 *
 * When the device is NOT Device Owner, the app falls back to overlay blocking
 * + EnforcementService (SYSTEM_ALERT_WINDOW). This receiver is still required
 * to declare BIND_DEVICE_ADMIN.
 */
public class DeviceAdminReceiver extends DeviceAdminReceiver {

    private static final String TAG = "ArcaDeviceAdmin";

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Log.i(TAG, "Device admin enabled");
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Log.w(TAG, "Device admin disabled");
    }

    @Override
    public void onDisableRequested(Context context, Intent intent) {
        // Return a warning shown to the user before disabling admin.
        super.onDisableRequested(context, intent);
    }

    @Override
    public void onProfileProvisioningComplete(Context context, Intent intent) {
        super.onProfileProvisioningComplete(context, intent);
        // Managed provisioning completed. Persist the provisioning extras so JS
        // can redeem the pairing code. The intent carries extras set in the QR
        // payload (familyId, childId, pairingCode).
        try {
            Intent launch = new Intent(context, MainActivity.class);
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            if (intent != null && intent.getExtras() != null) {
                launch.putExtras(intent.getExtras());
            }
            context.startActivity(launch);
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch after provisioning", e);
        }
    }
}
