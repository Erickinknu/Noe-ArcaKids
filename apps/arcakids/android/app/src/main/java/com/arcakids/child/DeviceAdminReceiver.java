package com.arcakids.child;

import android.content.Context;
import android.content.Intent;

import androidx.annotation.NonNull;

public class DeviceAdminReceiver extends android.app.admin.DeviceAdminReceiver {
    @Override
    public void onEnabled(@NonNull Context context, @NonNull Intent intent) {
        super.onEnabled(context, intent);
    }

    @Override
    public void onDisabled(@NonNull Context context, @NonNull Intent intent) {
        super.onDisabled(context, intent);
    }

    @Override
    public CharSequence onDisableRequested(@NonNull Context context, @NonNull Intent intent) {
        // Refuse voluntary deactivation so the child cannot disable parental control
        // from Settings. Device owner is full kiosk; this guards the admin case too.
        return "";
    }
}