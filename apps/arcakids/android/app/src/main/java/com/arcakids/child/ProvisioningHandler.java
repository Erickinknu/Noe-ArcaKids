package com.arcakids.child;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
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

    private static void persist(Context context, String familyId, String childId, String code, String payload) {
        if (familyId == null && childId == null && code == null && payload == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit()
            .putString("family_id", familyId)
            .putString("child_id", childId)
            .putString("code", code)
            .putString("payload", payload)
            .apply();
    }

    /**
     * Persists the admin extras delivered during the device-owner provisioning flow
     * (DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE).
     */
    public static void persistExtras(Context context, Bundle extras) {
        if (extras == null) return;
        String familyId = extras.getString("familyId");
        String childId = extras.getString("childId");
        String code = extras.getString("pairingCode");
        if (code == null) code = extras.getString("code");
        String payload = extras.getString("provisioningPayload");
        persist(context, familyId, childId, code, payload);
        Log.d(TAG, "persistExtras: familyId=" + familyId + " childId=" + childId + " hasCode=" + (code != null));
    }
}
