package com.reactnativemcp.connectivity

import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class ConnectivityModule(reactContext: ReactApplicationContext) :
  NativeConnectivitySpec(reactContext) {

  override fun setFlashlight(enabled: Boolean, promise: Promise) {
    if (reactApplicationContext.checkSelfPermission(android.Manifest.permission.CAMERA) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      promise.reject("PERMISSION_DENIED", "Camera permission is required to control the flashlight.")
      return
    }

    try {
      val cameraManager =
        reactApplicationContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
      val cameraId = cameraManager.cameraIdList.firstOrNull { id ->
        cameraManager.getCameraCharacteristics(id)
          .get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
      }

      if (cameraId == null) {
        promise.reject("UNAVAILABLE", "This device has no flashlight.")
        return
      }

      cameraManager.setTorchMode(cameraId, enabled)
      promise.resolve(null)
    } catch (error: SecurityException) {
      promise.reject("PERMISSION_DENIED", error.message ?: "Camera permission was denied.", error)
    } catch (error: Exception) {
      promise.reject("UNAVAILABLE", error.message ?: "The flashlight is unavailable.", error)
    }
  }

  companion object {
    const val NAME = NativeConnectivitySpec.NAME
  }
}
