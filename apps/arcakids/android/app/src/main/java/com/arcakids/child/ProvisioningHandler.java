package com.arcakids.child;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;

import org.json.JSONObject;

/**
 * Handles managed provisioning extras delivered via QR or NFC.
 *
 * QR provisioning format (JSON encoded into the QR by the NOE parent app):
 * {
 *   "type": "provision",
 *   "familyId": "uuid",
 *   "childId": "uuid | null",    // null when provisioning per-family
 *   "code": "ABCDEFGH",           // 8-char pairing code
 *   "timestamp": "2026-01-01T00:00:00.000Z",
 *   "devicePolicy": { ... },      // optional initial policy snapshot
 *   "androidAdminComponentName": "com.arcakids.child/.DeviceAdminReceiver"
 * }
 *
 * For Device Owner provisioning (android.app.action.PROVISION_MANAGED_DEVICE),
 * the QR must also contain the standard Android extras:
 *   android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME = "com.arcakids.child/com.arcakids.child.DeviceAdminReceiver"
 *   android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME   = "com.arcakids.child"
 * plus custom extras forwarded as provisioning params (familyId, childId, code).
 *
 * This handler extracts those extras from the launch Intent and persists them
 * to SharedPreferences so the JS linking service can redeem the code even before
 * the device is provisioned as Device Owner.
 */
public class ProvisioningHandler {

    private static final String TAG = "ArcaProvisioning";
    public static final String PREFS_NAME = "arcakids_provisioning";
    public static final String KEY_FAMILY_ID = "provisioning_family_id";
    public static final String KEY_CHILD_ID = "provisioning_child_id";
    public static final String KEY_CODE = "provisioning_code";
    public static final String KEY_TIMESTAMP = "provisioning_timestamp";
    public static final String KEY_PAYLOAD = "provisioning_payload_json";

    /**
     * Call from MainActivity.onCreate() / onNewIntent() to capture provisioning extras.
     * Safe to call even when not provisioned - it just stores whatever extras are present.
     */
    public static void handleIntent(Context context, Intent intent) {
        if (intent == null) return;
        Bundle extras = intent.getExtras();
        if (extras == null) return;

        // 1) Try to parse a JSON payload under key "provisioningPayload" or data string.
        String jsonPayload = extras.getString("provisioningPayload");
        if (jsonPayload == null) {
            // Also support raw QR string passed as Intent data / extra "qrPayload"
            jsonPayload = extras.getString("qrPayload");
        }
        if (jsonPayload != null) {
            tryParseAndStore(context, jsonPayload);
        }

        // 2) Direct custom extras (added as android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE entries)
        String familyId = extras.getString("familyId");
        String childId = extras.getString("childId");
        String code = extras.getString("pairingCode");
        if (code == null) code = extras.getString("code");

        if (familyId != null || code != null) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            if (familyId != null) editor.putString(KEY_FAMILY_ID, familyId);
            if (childId != null) editor.putString(KEY_CHILD_ID, childId);
            if (code != null) editor.putString(KEY_CODE, code);
            editor.putLong(KEY_TIMESTAMP, System.currentTimeMillis());
            editor.apply();
            Log.i(TAG, "Stored provisioning extras: familyId=" + familyId + " childId=" + childId);
        }

        // 3) Check Device Owner provisioning action
        String action = intent.getAction();
        if ("android.app.action.PROVISION_MANAGED_DEVICE".equals(action)
                || "android.app.action.GET_PROVISIONING_MODE".equals(action)) {
            Log.i(TAG, "Provisioning intent detected: " + action);
        }
    }

    public static void tryParseAndStore(Context context, String json) {
        try {
            JSONObject obj = new JSONObject(json);
            if (!"provision".equals(obj.optString("type"))) {
                // Allow plain pairing code JSON too
            }
            String familyId = obj.optString("familyId", null);
            String childId = obj.has("childId") && !obj.isNull("childId") ? obj.optString("childId", null) : null;
            String code = obj.optString("code", null);
            String timestamp = obj.optString("timestamp", null);

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            if (familyId != null && !familyId.isEmpty()) editor.putString(KEY_FAMILY_ID, familyId);
            if (childId != null && !childId.isEmpty()) editor.putString(KEY_CHILD_ID, childId);
            if (code != null && !code.isEmpty()) editor.putString(KEY_CODE, code);
            if (timestamp != null) editor.putString(KEY_TIMESTAMP, timestamp);
            editor.putString(KEY_PAYLOAD, json);
            editor.apply();
            Log.i(TAG, "Parsed provisioning QR JSON successfully");
        } catch (Exception e) {
            Log.w(TAG, "Could not parse provisioning payload", e);
        }
    }

    /** Returns the stored provisioning payload JSON, if any. */
    public static String getStoredPayload(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_PAYLOAD, null);
    }

    public static void clear(Context context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply();
    }
}
