package com.reactnativemcp.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

class LocationModule(reactContext: ReactApplicationContext) :
  NativeLocationSpec(reactContext), PermissionListener {

  
  private var permissionPromise: Promise? = null

  private val mainHandler = Handler(Looper.getMainLooper())

  

  override fun requestPermission(promise: Promise) {
    if (hasLocationPermission()) {
      promise.resolve(permissionResult(granted = true, status = STATUS_GRANTED))
      return
    }

    val activity = getCurrentActivity() as? PermissionAwareActivity
    if (activity == null) {
      promise.resolve(permissionResult(granted = false, status = STATUS_UNAVAILABLE))
      return
    }

    permissionPromise = promise
    activity.requestPermissions(
      arrayOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
      ),
      REQUEST_LOCATION_PERMISSION,
      this
    )
  }

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<String>,
    grantResults: IntArray
  ): Boolean {
    if (requestCode != REQUEST_LOCATION_PERMISSION) {
      return false
    }

    val granted = grantResults.any { it == PackageManager.PERMISSION_GRANTED }
    permissionPromise?.resolve(
      permissionResult(
        granted = granted,
        status = if (granted) STATUS_GRANTED else STATUS_DENIED
      )
    )
    permissionPromise = null
    return true
  }

  

  override fun getCurrentPosition(accuracy: String, timeoutMs: Double, promise: Promise) {
    if (!hasLocationPermission()) {
      promise.reject(ERROR_PERMISSION_DENIED, "Location permission has not been granted.")
      return
    }

    try {
      requestWithLocationManager(accuracy, timeoutMs, promise)
    } catch (e: SecurityException) {
      promise.reject(
        ERROR_PERMISSION_DENIED,
        e.message ?: "Location permission has not been granted."
      )
    } catch (e: Exception) {
      promise.reject(ERROR_LOCATION_FAILED, e.message ?: "Failed to get the current location.", e)
    }
  }

  private fun requestWithLocationManager(
    accuracy: String,
    timeoutMs: Double,
    promise: Promise
  ) {
    val locationManager =
      reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    val providers =
      if (accuracy == ACCURACY_BEST) {
        listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
      } else if (accuracy == ACCURACY_LOW) {
        listOf(LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER)
      } else {
        listOf(LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER)
      }
    val provider = providers.firstOrNull { locationManager.isProviderEnabled(it) }
    if (provider == null) {
      promise.reject(ERROR_LOCATION_FAILED, "No location provider is enabled on this device.")
      return
    }

    var resolved = false
    lateinit var listener: LocationListener
    val finish: (Location?) -> Unit = { location ->
      if (!resolved) {
        resolved = true
        mainHandler.removeCallbacksAndMessages(listener)
        locationManager.removeUpdates(listener)
        if (location == null) {
          promise.reject(ERROR_LOCATION_FAILED, "The device location could not be determined.")
        } else {
          promise.resolve(mapLocation(location))
        }
      }
    }
    listener = LocationListener { location -> finish(location) }
    val timeoutRunnable = Runnable { finish(null) }

    locationManager.requestLocationUpdates(
      provider,
      0L,
      0f,
      listener,
      Looper.getMainLooper()
    )
    mainHandler.postAtTime(timeoutRunnable, listener, SystemClock.uptimeMillis() + timeoutMs.toLong())
  }

  

  private fun hasLocationPermission(): Boolean {
    val fine =
      ContextCompat.checkSelfPermission(
        reactApplicationContext,
        Manifest.permission.ACCESS_FINE_LOCATION
      ) == PackageManager.PERMISSION_GRANTED
    val coarse =
      ContextCompat.checkSelfPermission(
        reactApplicationContext,
        Manifest.permission.ACCESS_COARSE_LOCATION
      ) == PackageManager.PERMISSION_GRANTED
    return fine || coarse
  }

  private fun permissionResult(granted: Boolean, status: String): WritableMap {
    val map = Arguments.createMap()
    map.putBoolean("granted", granted)
    map.putString("status", status)
    return map
  }

  private fun mapLocation(location: Location): WritableMap {
    val map = Arguments.createMap()
    map.putDouble("latitude", location.latitude)
    map.putDouble("longitude", location.longitude)
    map.putDouble("accuracy", if (location.hasAccuracy()) location.accuracy.toDouble() else 0.0)
    map.putDouble("altitude", if (location.hasAltitude()) location.altitude else 0.0)
    map.putDouble(
      "altitudeAccuracy",
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && location.hasVerticalAccuracy()) {
        location.verticalAccuracyMeters.toDouble()
      } else {
        0.0
      }
    )
    map.putDouble("heading", if (location.hasBearing()) location.bearing.toDouble() else -1.0)
    map.putDouble("speed", if (location.hasSpeed()) location.speed.toDouble() else 0.0)
    map.putDouble("timestamp", System.currentTimeMillis().toDouble())
    return map
  }

  companion object {
    const val NAME = NativeLocationSpec.NAME

    private const val REQUEST_LOCATION_PERMISSION = 410071

    private const val ACCURACY_BEST = "best"
    private const val ACCURACY_LOW = "low"

    private const val STATUS_GRANTED = "granted"
    private const val STATUS_DENIED = "denied"
    private const val STATUS_UNAVAILABLE = "unavailable"

    private const val ERROR_PERMISSION_DENIED = "PERMISSION_DENIED"
    private const val ERROR_LOCATION_FAILED = "LOCATION_FAILED"
  }
}
