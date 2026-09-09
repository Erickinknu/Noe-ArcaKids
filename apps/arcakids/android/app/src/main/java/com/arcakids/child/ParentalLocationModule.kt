package com.arcakids.child

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject

class ParentalLocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LocationListener {

    companion object {
        private const val REQUEST_CODE_LOCATION = 4201
        private val pendingPromises = mutableListOf<Promise>()

        /** Called from MainActivity.onRequestPermissionsResult. */
        fun onRequestPermissionsResult(requestCode: Int, grantResults: IntArray) {
            if (requestCode != REQUEST_CODE_LOCATION) return
            val granted = grantResults.isNotEmpty() &&
                grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            val list = pendingPromises.toList()
            pendingPromises.clear()
            for (p in list) p.resolve(granted)
        }
    }

    override fun getName(): String = "ParentalLocation"

    private val locationManager = reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    private var tracking = false
    private var monitoringGeofences = false

    @ReactMethod
    fun hasPermission(promise: Promise) {
        try {
            val fine = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val coarse = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            promise.resolve(fine || coarse)
        } catch (e: Exception) {
            promise.reject("ERR_LOCATION_PERMISSION", e.message, e)
        }
    }

    @ReactMethod
    fun hasBackgroundPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                promise.resolve(true)
                return
            }
            val fine = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val background = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
            promise.resolve(fine && background)
        } catch (e: Exception) {
            promise.reject("ERR_BACKGROUND_PERMISSION", e.message, e)
        }
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        val activity = getCurrentActivity()
        if (activity == null) {
            promise.resolve(false)
            return
        }
        val needs = arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        val missing = needs.filter {
            ContextCompat.checkSelfPermission(reactContext, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) {
            promise.resolve(true)
            return
        }
        ParentalLocationModule.pendingPromises.add(promise)
        ActivityCompat.requestPermissions(activity, missing.toTypedArray(), 4201)
    }

    @ReactMethod
    fun requestBackgroundPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            promise.resolve(true)
            return
        }
        val activity = getCurrentActivity()
        if (activity == null) {
            promise.resolve(false)
            return
        }
        val background = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (background) {
            promise.resolve(true)
            return
        }
        ParentalLocationModule.pendingPromises.add(promise)
        ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION), 4201)
    }

    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        try {
            if (!hasPerm()) { promise.reject("ERR_NO_PERMISSION", "Location permission not granted"); return }
            val best = bestLastLocation()
            if (best != null) { promise.resolve(toMap(best)); return }
            val providers = getEnabledProviders()
            if (providers.isNotEmpty()) {
                try {
                    locationManager.requestSingleUpdate(providers.first(), object : LocationListener {
                        override fun onLocationChanged(location: Location) { promise.resolve(toMap(location)) }
                        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                        override fun onProviderEnabled(provider: String) {}
                        override fun onProviderDisabled(provider: String) {}
                    }, Looper.getMainLooper())
                } catch (e: Exception) { promise.reject("ERR_CURRENT_LOCATION", e.message, e) }
            } else {
                promise.resolve(toMap(null))
            }
        } catch (e: Exception) {
            promise.reject("ERR_CURRENT_LOCATION", e.message, e)
        }
    }

    @ReactMethod
    fun startTracking(promise: Promise) {
        try {
            if (!hasPerm()) { promise.reject("ERR_NO_PERMISSION", "Location permission not granted"); return }
            if (!tracking) {
                tracking = true
                for (p in getEnabledProviders()) {
                    try { locationManager.requestLocationUpdates(p, 15000L, 25f, this, Looper.getMainLooper()) } catch (e: Exception) {}
                }
            }
            promise.resolve(toMap(bestLastLocation()))
        } catch (e: Exception) {
            promise.reject("ERR_START_TRACKING", e.message, e)
        }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            if (tracking) { locationManager.removeUpdates(this); tracking = false }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_STOP_TRACKING", e.message, e)
        }
    }

    @ReactMethod
    fun addGeofence(geofence: com.facebook.react.bridge.ReadableMap, promise: Promise) {
        try {
            val id = geofence.getString("id") ?: run { promise.reject("ERR_GEOFENCE", "Missing id"); return }
            val prefs = reactContext.getSharedPreferences("arcakids_geofences", Context.MODE_PRIVATE)
            val existing = prefs.getString("list", null)
            val arr = if (existing != null) JSONArray(existing) else JSONArray()
            arr.put(JSONObject().apply {
                put("id", id)
                put("name", geofence.getString("name"))
                put("latitude", geofence.getDouble("latitude"))
                put("longitude", geofence.getDouble("longitude"))
                put("radius", geofence.getInt("radius"))
                put("triggered", false)
                put("triggeredAt", JSONObject.NULL)
                put("childId", geofence.getString("childId"))
            })
            prefs.edit().putString("list", arr.toString()).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_ADD_GEOFENCE", e.message, e)
        }
    }

    @ReactMethod
    fun removeGeofence(geofenceId: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("arcakids_geofences", Context.MODE_PRIVATE)
            val existing = prefs.getString("list", null) ?: run { promise.resolve(true); return }
            val arr = JSONArray(existing)
            val out = JSONArray()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                if (obj.optString("id") != geofenceId) out.put(obj)
            }
            prefs.edit().putString("list", out.toString()).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_REMOVE_GEOFENCE", e.message, e)
        }
    }

    @ReactMethod
    fun getGeofences(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("arcakids_geofences", Context.MODE_PRIVATE)
            val existing = prefs.getString("list", null)
            val out: WritableArray = Arguments.createArray()
            if (existing == null) { promise.resolve(out); return }
            val arr = JSONArray(existing)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val map: WritableMap = Arguments.createMap()
                map.putString("id", obj.optString("id"))
                map.putString("name", obj.optString("name"))
                map.putDouble("latitude", obj.optDouble("latitude"))
                map.putDouble("longitude", obj.optDouble("longitude"))
                map.putDouble("radius", obj.optDouble("radius"))
                map.putBoolean("triggered", obj.optBoolean("triggered"))
                map.putString("childId", obj.optString("childId"))
                out.pushMap(map)
            }
            promise.resolve(out)
        } catch (e: Exception) {
            promise.reject("ERR_GET_GEOFENCES", e.message, e)
        }
    }

    @ReactMethod
    fun isInsideGeofence(latitude: Double, longitude: Double, geofence: com.facebook.react.bridge.ReadableMap, promise: Promise) {
        try {
            val results = FloatArray(1)
            Location.distanceBetween(latitude, longitude, geofence.getDouble("latitude"), geofence.getDouble("longitude"), results)
            promise.resolve(results[0] <= geofence.getDouble("radius").toFloat())
        } catch (e: Exception) {
            promise.reject("ERR_IS_INSIDE", e.message, e)
        }
    }

    @ReactMethod
    fun startGeofenceMonitoring(promise: Promise) {
        try {
            if (!hasPerm()) { promise.reject("ERR_NO_PERMISSION", "Location permission not granted"); return }
            if (!monitoringGeofences) {
                monitoringGeofences = true
                for (p in getEnabledProviders()) {
                    try { locationManager.requestLocationUpdates(p, 30000L, 50f, this, Looper.getMainLooper()) } catch (e: Exception) {}
                }
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_START_GEOFENCE_MONITORING", e.message, e)
        }
    }

    @ReactMethod
    fun stopGeofenceMonitoring(promise: Promise) {
        try {
            if (monitoringGeofences) { locationManager.removeUpdates(this); monitoringGeofences = false }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_STOP_GEOFENCE_MONITORING", e.message, e)
        }
    }

    override fun onLocationChanged(location: Location) { checkGeofences(location) }
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    private fun hasPerm(): Boolean {
        return ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }

    private fun getEnabledProviders(): List<String> {
        val providers = mutableListOf<String>()
        if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) providers.add(LocationManager.GPS_PROVIDER)
        if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) providers.add(LocationManager.NETWORK_PROVIDER)
        return providers
    }

    private fun bestLastLocation(): Location? {
        var best: Location? = null
        for (p in getEnabledProviders()) {
            val loc = try { locationManager.getLastKnownLocation(p) } catch (e: Exception) { null }
            if (loc != null && (best == null || loc.time > best.time)) best = loc
        }
        return best
    }

    private fun toMap(location: Location?): WritableMap {
        val map: WritableMap = Arguments.createMap()
        if (location == null) {
            map.putDouble("latitude", 0.0); map.putDouble("longitude", 0.0)
            map.putDouble("accuracy", 0.0); map.putDouble("timestamp", 0.0)
            return map
        }
        map.putDouble("latitude", location.latitude)
        map.putDouble("longitude", location.longitude)
        map.putDouble("accuracy", location.accuracy.toDouble())
        map.putDouble("timestamp", location.time.toDouble())
        return map
    }

    private fun checkGeofences(location: Location) {
        val prefs = reactContext.getSharedPreferences("arcakids_geofences", Context.MODE_PRIVATE)
        val existing = prefs.getString("list", null) ?: return
        val arr = try { JSONArray(existing) } catch (e: Exception) { return }
        val results = FloatArray(1)
        for (i in 0 until arr.length()) {
            val obj = arr.getJSONObject(i)
            Location.distanceBetween(location.latitude, location.longitude, obj.optDouble("latitude"), obj.optDouble("longitude"), results)
            val inside = results[0] <= obj.optDouble("radius")
            obj.put("triggered", inside)
            obj.put("triggeredAt", if (inside) System.currentTimeMillis() else JSONObject.NULL)
        }
        prefs.edit().putString("list", arr.toString()).apply()
    }
}
