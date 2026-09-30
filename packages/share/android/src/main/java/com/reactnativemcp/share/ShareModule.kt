package com.reactnativemcp.share

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import java.io.File

class ShareModule(reactContext: ReactApplicationContext) :
  NativeShareSpec(reactContext) {

  override fun share(
    text: String?,
    url: String?,
    imageUri: String?,
    subject: String?,
    promise: Promise
  ) {
    val intent = Intent(Intent.ACTION_SEND)

    if (!imageUri.isNullOrEmpty()) {
      val path = imageUri.removePrefix(FILE_SCHEME)
      val file = File(path)
      val contentUri = FileProvider.getUriForFile(
        reactApplicationContext,
        "${reactApplicationContext.packageName}$FILE_PROVIDER_SUFFIX",
        file
      )
      intent.type = "image/*"
      intent.putExtra(Intent.EXTRA_STREAM, contentUri)
      intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    } else {
      intent.type = "text/plain"
    }

    if (!subject.isNullOrEmpty()) {
      intent.putExtra(Intent.EXTRA_SUBJECT, subject)
    }

    val body = listOfNotNull(
      text?.takeIf { it.isNotEmpty() },
      url?.takeIf { it.isNotEmpty() }
    ).joinToString("\n")
    if (body.isNotEmpty()) {
      intent.putExtra(Intent.EXTRA_TEXT, body)
    }

    val chooser = Intent.createChooser(intent, subject)
    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    val activity = getCurrentActivity()
    if (activity == null) {
      promise.reject(ERROR_UNAVAILABLE, "Share is not available: no current Android activity.")
      return
    }

    try {
      activity.startActivity(chooser)
      val result = Arguments.createMap()
      result.putString("status", "launched")
      promise.resolve(result)
    } catch (e: ActivityNotFoundException) {
      promise.reject(
        ERROR_UNAVAILABLE,
        "Share is not available: no app can handle the share intent."
      )
    }
  }

  companion object {
    const val NAME = NativeShareSpec.NAME
    private const val ERROR_UNAVAILABLE = "UNAVAILABLE"
    private const val FILE_SCHEME = "file://"
    private const val FILE_PROVIDER_SUFFIX = ".reactnativemcp.share.fileprovider"
  }
}
