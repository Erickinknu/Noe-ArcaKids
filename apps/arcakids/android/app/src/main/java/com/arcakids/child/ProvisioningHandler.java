package com.arcakids.child;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

public class ProvisioningHandler {
    private static final String TAG = "ProvisioningHandler";

    public static void handleIntent(Activity activity, Intent intent) {
        if (intent == null) return;
        Log.d(TAG, "handleIntent: action=" + intent.getAction());
    }
}
