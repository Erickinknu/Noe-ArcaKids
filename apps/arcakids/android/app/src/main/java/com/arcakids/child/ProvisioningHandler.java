package com.arcakids.child;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Log;
import org.json.JSONObject;

/**
 * Handles provisioning intents (deep links from QR / device-owner provisioning).
 * Persists the parsed extras so the JS side can read them via DeviceOwnerModule.
 */
public class ProvisioningHandler {
    private static final String TAG = "ProvisioningHandler";
    private static final String PREFS = "arcakids_provisioning";

    public static void handleIntent(Activity activity, Intent intent) {
        if (intent == null || activity == null) return;
        Log.d(TAG, "handleIntent: action=" + intent.getAction());

        String data = intent.getDataString();
        if (data == null) return;

        try {
            Uri uri = Uri.parse(data);
            String familyId = uri.getQueryParameter("familyId");
            String childId = uri.getQueryParameter("childId");
            String code = uri.getQueryParameter("code");

            if (familyId == null && childId == null && code == null) {
                // Try JSON body (e.g. arcakids://provision?payload={...})
                String payload = uri.getQueryParameter("payload");
                if (payload != null) {
                    try {
                        JSONObject obj = new JSONObject(payload);
                        familyId = obj.optString("familyId", null);
                        childId = obj.optString("childId", null);
                        code = obj.optString("code", null);
                    } catch (Exception e) {
                        Log.e(TAG, "Invalid provisioning payload", e);
                    }
                }
            }

            persist(activity, familyId, childId, code, data);
        } catch (Exception e) {
            Log.e(TAG, "Error parsing provisioning intent", e);
        }
    }

    private static void persist(Activity activity, String familyId, String childId, String code, String payload) {
        if (familyId == null && childId == null && code == null && payload == null) return;
        SharedPreferences prefs = activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE);
        prefs.edit()
            .putString("family_id", familyId)
            .putString("child_id", childId)
            .putString("code", code)
            .putString("payload", payload)
            .apply();
    }
}
