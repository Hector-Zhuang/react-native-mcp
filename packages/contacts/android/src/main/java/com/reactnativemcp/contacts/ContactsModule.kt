package com.reactnativemcp.contacts

import android.Manifest
import android.content.ContentProviderOperation
import android.content.pm.PackageManager
import android.provider.ContactsContract
import android.provider.ContactsContract.CommonDataKinds.Email
import android.provider.ContactsContract.CommonDataKinds.Organization
import android.provider.ContactsContract.CommonDataKinds.Phone
import android.provider.ContactsContract.CommonDataKinds.StructuredName
import android.provider.ContactsContract.Data
import android.provider.ContactsContract.RawContacts
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

class ContactsModule(reactContext: ReactApplicationContext) :
  NativeContactsSpec(reactContext),
  PermissionListener {

  private var permissionPromise: Promise? = null

  

  override fun requestPermission(writeAccess: Boolean, promise: Promise) {
    val requiredPermissions = if (writeAccess) WRITE_PERMISSIONS else READ_PERMISSIONS
    val missingPermissions = requiredPermissions.filter {
      reactApplicationContext.checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
    }

    if (missingPermissions.isEmpty()) {
      promise.resolve(permissionResult(true, STATUS_GRANTED))
      return
    }

    val activity = getCurrentActivity() as? PermissionAwareActivity
    if (activity == null) {
      promise.resolve(permissionResult(false, STATUS_UNAVAILABLE))
      return
    }

    permissionPromise = promise
    activity.requestPermissions(
      missingPermissions.toTypedArray(),
      PERMISSION_REQUEST_CODE,
      this,
    )
  }

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<String>,
    grantResults: IntArray,
  ): Boolean {
    if (requestCode != PERMISSION_REQUEST_CODE) {
      return false
    }

    val granted =
      grantResults.isNotEmpty() &&
        grantResults.all { it == PackageManager.PERMISSION_GRANTED }
    permissionPromise?.resolve(
      permissionResult(granted, if (granted) STATUS_GRANTED else STATUS_DENIED),
    )
    permissionPromise = null
    return true
  }

  private fun permissionResult(granted: Boolean, status: String): WritableMap =
    Arguments.createMap().apply {
      putBoolean("granted", granted)
      putString("status", status)
    }

  

  

  override fun findContacts(
    query: String?,
    limit: Double,
    offset: Double,
    promise: Promise,
  ) {
    try {
      val accumulators = LinkedHashMap<String, ContactAccumulator>()

      val selection: String?
      val selectionArgs: Array<String>?
      if (!query.isNullOrEmpty()) {
        selection = "${Phone.DISPLAY_NAME} LIKE ?"
        selectionArgs = arrayOf("%$query%")
      } else {
        selection = null
        selectionArgs = null
      }

      reactApplicationContext.contentResolver.query(
        Phone.CONTENT_URI,
        PHONE_PROJECTION,
        selection,
        selectionArgs,
        null,
      )?.use { cursor ->
        val contactIdIndex = cursor.getColumnIndexOrThrow(Phone.CONTACT_ID)
        val displayNameIndex = cursor.getColumnIndexOrThrow(Phone.DISPLAY_NAME)
        val numberIndex = cursor.getColumnIndexOrThrow(Phone.NUMBER)
        val typeIndex = cursor.getColumnIndexOrThrow(Phone.TYPE)
        val labelIndex = cursor.getColumnIndexOrThrow(Phone.LABEL)

        while (cursor.moveToNext()) {
          val contactId = cursor.getString(contactIdIndex) ?: continue
          val number = cursor.getString(numberIndex)
          if (number.isNullOrBlank()) {
            continue
          }

          val accumulator =
            accumulators.getOrPut(contactId) {
              ContactAccumulator(contactId, cursor.getString(displayNameIndex) ?: "")
            }
          if (accumulator.displayName.isEmpty()) {
            cursor.getString(displayNameIndex)?.let { accumulator.displayName = it }
          }

          if (accumulator.numbers.add(number)) {
            val label =
              Phone.getTypeLabel(
                reactApplicationContext.resources,
                cursor.getInt(typeIndex),
                cursor.getString(labelIndex),
              ).toString()
            accumulator.phones.add(LabeledValue(label, number))
          }
        }
      }

      reactApplicationContext.contentResolver.query(
        Email.CONTENT_URI,
        EMAIL_PROJECTION,
        selection,
        selectionArgs,
        null,
      )?.use { cursor ->
        val contactIdIndex = cursor.getColumnIndexOrThrow(Email.CONTACT_ID)
        val displayNameIndex = cursor.getColumnIndexOrThrow(Email.DISPLAY_NAME)
        val addressIndex = cursor.getColumnIndexOrThrow(Email.ADDRESS)
        val typeIndex = cursor.getColumnIndexOrThrow(Email.TYPE)
        val labelIndex = cursor.getColumnIndexOrThrow(Email.LABEL)

        while (cursor.moveToNext()) {
          val contactId = cursor.getString(contactIdIndex) ?: continue
          val address = cursor.getString(addressIndex)
          if (address.isNullOrBlank()) {
            continue
          }

          val accumulator =
            accumulators.getOrPut(contactId) {
              ContactAccumulator(contactId, cursor.getString(displayNameIndex) ?: "")
            }
          if (accumulator.displayName.isEmpty()) {
            cursor.getString(displayNameIndex)?.let { accumulator.displayName = it }
          }

          if (accumulator.addresses.add(address)) {
            val label =
              Email.getTypeLabel(
                reactApplicationContext.resources,
                cursor.getInt(typeIndex),
                cursor.getString(labelIndex),
              ).toString()
            accumulator.emails.add(LabeledValue(label, address))
          }
        }
      }

      val sorted = accumulators.values.sortedBy { it.displayName }
      val start = offset.toInt().coerceIn(0, sorted.size)
      val end = (start + limit.toInt()).coerceAtMost(sorted.size)

      val result = Arguments.createArray()
      val page: List<ContactAccumulator> = sorted.subList(start, end)
      for (contact in page) {
        result.pushMap(toWritableMap(contact))
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject(ERROR_FAILED, e.message ?: "Failed to read contacts", e)
    }
  }

  private fun toWritableMap(accumulator: ContactAccumulator): WritableMap {
    val map = Arguments.createMap()
    map.putString("id", accumulator.id)
    map.putNull("givenName")
    map.putNull("familyName")
    map.putString("displayName", accumulator.displayName)

    val phones = Arguments.createArray()
    for (phone in accumulator.phones) {
      phones.pushMap(
        Arguments.createMap().apply {
          putString("label", phone.label)
          putString("number", phone.value)
        },
      )
    }
    map.putArray("phoneNumbers", phones)

    val emails = Arguments.createArray()
    for (email in accumulator.emails) {
      emails.pushMap(
        Arguments.createMap().apply {
          putString("label", email.label)
          putString("address", email.value)
        },
      )
    }
    map.putArray("emails", emails)
    return map
  }

  

  

  override fun addContact(
    givenName: String?,
    familyName: String?,
    organization: String?,
    phoneNumbers: ReadableArray,
    emails: ReadableArray,
    promise: Promise,
  ) {
    try {
      val operations = arrayListOf<ContentProviderOperation>()

      operations.add(
        ContentProviderOperation.newInsert(RawContacts.CONTENT_URI)
          .withValue(RawContacts.ACCOUNT_TYPE, null)
          .withValue(RawContacts.ACCOUNT_NAME, null)
          .build(),
      )

      if (!givenName.isNullOrEmpty() || !familyName.isNullOrEmpty()) {
        operations.add(
          ContentProviderOperation.newInsert(Data.CONTENT_URI)
            .withValueBackReference(Data.RAW_CONTACT_ID, RAW_CONTACT_BACK_REFERENCE)
            .withValue(Data.MIMETYPE, StructuredName.CONTENT_ITEM_TYPE)
            .withValue(StructuredName.GIVEN_NAME, givenName)
            .withValue(StructuredName.FAMILY_NAME, familyName)
            .build(),
        )
      }

      if (!organization.isNullOrEmpty()) {
        operations.add(
          ContentProviderOperation.newInsert(Data.CONTENT_URI)
            .withValueBackReference(Data.RAW_CONTACT_ID, RAW_CONTACT_BACK_REFERENCE)
            .withValue(Data.MIMETYPE, Organization.CONTENT_ITEM_TYPE)
            .withValue(Organization.COMPANY, organization)
            .build(),
        )
      }

      for (index in 0 until phoneNumbers.size()) {
        val item = phoneNumbers.getMap(index) ?: continue
        val number = item.getString("number") ?: continue
        val customLabel = optionalString(item, "label")

        val builder =
          ContentProviderOperation.newInsert(Data.CONTENT_URI)
            .withValueBackReference(Data.RAW_CONTACT_ID, RAW_CONTACT_BACK_REFERENCE)
            .withValue(Data.MIMETYPE, Phone.CONTENT_ITEM_TYPE)
            .withValue(Phone.NUMBER, number)
        if (!customLabel.isNullOrEmpty()) {
          builder
            .withValue(Phone.TYPE, Phone.TYPE_CUSTOM)
            .withValue(Phone.LABEL, customLabel)
        } else {
          builder.withValue(Phone.TYPE, Phone.TYPE_OTHER)
        }
        operations.add(builder.build())
      }

      for (index in 0 until emails.size()) {
        val item = emails.getMap(index) ?: continue
        val address = item.getString("address") ?: continue
        val customLabel = optionalString(item, "label")

        val builder =
          ContentProviderOperation.newInsert(Data.CONTENT_URI)
            .withValueBackReference(Data.RAW_CONTACT_ID, RAW_CONTACT_BACK_REFERENCE)
            .withValue(Data.MIMETYPE, Email.CONTENT_ITEM_TYPE)
            .withValue(Email.ADDRESS, address)
        if (!customLabel.isNullOrEmpty()) {
          builder
            .withValue(Email.TYPE, Email.TYPE_CUSTOM)
            .withValue(Email.LABEL, customLabel)
        } else {
          builder.withValue(Email.TYPE, Email.TYPE_OTHER)
        }
        operations.add(builder.build())
      }

      val results =
        reactApplicationContext.contentResolver.applyBatch(ContactsContract.AUTHORITY, operations)
      val id = results.firstOrNull()?.uri?.lastPathSegment ?: ""
      promise.resolve(
        Arguments.createMap().apply {
          putString("id", id)
        },
      )
    } catch (e: Exception) {
      promise.reject(ERROR_FAILED, e.message ?: "Failed to save contact", e)
    }
  }

  private fun optionalString(map: ReadableMap, key: String): String? {
    return if (map.hasKey(key) && !map.isNull(key)) map.getString(key) else null
  }

  

  private data class LabeledValue(val label: String, val value: String)

  private class ContactAccumulator(
    val id: String,
    var displayName: String,
  ) {
    val numbers = LinkedHashSet<String>()
    val addresses = LinkedHashSet<String>()
    val phones = ArrayList<LabeledValue>()
    val emails = ArrayList<LabeledValue>()
  }

  companion object {
    const val NAME = NativeContactsSpec.NAME

    private const val PERMISSION_REQUEST_CODE = 4701
    private const val RAW_CONTACT_BACK_REFERENCE = 0
    private const val ERROR_FAILED = "CONTACTS_FAILED"

    private const val STATUS_GRANTED = "granted"
    private const val STATUS_DENIED = "denied"
    private const val STATUS_UNAVAILABLE = "unavailable"

    private val READ_PERMISSIONS = arrayOf(Manifest.permission.READ_CONTACTS)
    private val WRITE_PERMISSIONS =
      arrayOf(
        Manifest.permission.WRITE_CONTACTS,
        Manifest.permission.READ_CONTACTS,
      )

    private val PHONE_PROJECTION =
      arrayOf(
        Phone.CONTACT_ID,
        Phone.DISPLAY_NAME,
        Phone.NUMBER,
        Phone.TYPE,
        Phone.LABEL,
      )

    private val EMAIL_PROJECTION =
      arrayOf(
        Email.CONTACT_ID,
        Email.DISPLAY_NAME,
        Email.ADDRESS,
        Email.TYPE,
        Email.LABEL,
      )
  }
}
