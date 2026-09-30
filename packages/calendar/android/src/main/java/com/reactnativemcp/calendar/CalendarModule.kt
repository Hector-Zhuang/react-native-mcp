package com.reactnativemcp.calendar

import android.Manifest
import android.content.ContentValues
import android.content.pm.PackageManager
import android.provider.CalendarContract
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import java.util.TimeZone

class CalendarModule(reactContext: ReactApplicationContext) :
  NativeCalendarSpec(reactContext), PermissionListener {

  private var nextRequestCode = 0
  private val permissionPromises = mutableMapOf<Int, Promise>()
  private val permissionWriteAccess = mutableMapOf<Int, Boolean>()


  override fun requestPermission(writeAccess: Boolean, promise: Promise) {
    val permissions = if (writeAccess) WRITE_PERMISSIONS else READ_PERMISSIONS
    val missing =
      permissions.filter {
        reactApplicationContext.checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
      }

    if (missing.isEmpty()) {
      promise.resolve(permissionResult(granted = true, status = STATUS_GRANTED))
      return
    }

    val activity = getCurrentActivity() as? PermissionAwareActivity
    if (activity == null) {
      promise.resolve(permissionResult(granted = false, status = STATUS_UNAVAILABLE))
      return
    }

    val requestCode = ++nextRequestCode
    permissionPromises[requestCode] = promise
    permissionWriteAccess[requestCode] = writeAccess
    activity.requestPermissions(missing.toTypedArray(), requestCode, this)
  }

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<String>,
    grantResults: IntArray
  ): Boolean {
    val promise = permissionPromises.remove(requestCode) ?: return false
    permissionWriteAccess.remove(requestCode)

    val granted =
      grantResults.isNotEmpty() &&
        grantResults.all { it == PackageManager.PERMISSION_GRANTED }
    promise.resolve(
      permissionResult(
        granted = granted,
        status = if (granted) STATUS_GRANTED else STATUS_DENIED
      )
    )
    return true
  }


  override fun listCalendars(promise: Promise) {
    try {
      val projection =
        arrayOf(
          CalendarContract.Calendars._ID,
          CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
          CalendarContract.Calendars.IS_PRIMARY,
          CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL,
          CalendarContract.Calendars.CALENDAR_COLOR,
          CalendarContract.Calendars.VISIBLE
        )

      val calendars = Arguments.createArray()
      reactApplicationContext.contentResolver
        .query(CalendarContract.Calendars.CONTENT_URI, projection, null, null, null)
        ?.use { cursor ->
          val idIndex = cursor.getColumnIndexOrThrow(CalendarContract.Calendars._ID)
          val titleIndex =
            cursor.getColumnIndexOrThrow(CalendarContract.Calendars.CALENDAR_DISPLAY_NAME)
          val primaryIndex = cursor.getColumnIndex(CalendarContract.Calendars.IS_PRIMARY)
          val accessIndex =
            cursor.getColumnIndexOrThrow(CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL)
          val colorIndex = cursor.getColumnIndex(CalendarContract.Calendars.CALENDAR_COLOR)

          while (cursor.moveToNext()) {
            val accessLevel = cursor.getInt(accessIndex)
            val calendar = Arguments.createMap()
            calendar.putString("id", cursor.getLong(idIndex).toString())
            calendar.putString(
              "title",
              if (cursor.isNull(titleIndex)) "" else cursor.getString(titleIndex)
            )
            calendar.putBoolean(
              "isPrimary",
              primaryIndex >= 0 &&
                !cursor.isNull(primaryIndex) &&
                cursor.getInt(primaryIndex) == 1
            )
            calendar.putBoolean(
              "allowsModifications",
              accessLevel >= CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR
            )
            if (colorIndex >= 0 && !cursor.isNull(colorIndex)) {
              calendar.putString("color", colorToHex(cursor.getInt(colorIndex)))
            } else {
              calendar.putNull("color")
            }
            calendars.pushMap(calendar)
          }
        }

      promise.resolve(calendars)
    } catch (e: Exception) {
      promise.reject(ERROR_LIST_CALENDARS, e.message ?: "Failed to list calendars", e)
    }
  }


  override fun listEvents(
    calendarIds: ReadableArray,
    startDate: Double,
    endDate: Double,
    promise: Promise
  ) {
    try {
      val projection =
        arrayOf(
          CalendarContract.Instances.EVENT_ID,
          CalendarContract.Events.CALENDAR_ID,
          CalendarContract.Events.TITLE,
          CalendarContract.Events.DESCRIPTION,
          CalendarContract.Events.EVENT_LOCATION,
          CalendarContract.Instances.BEGIN,
          CalendarContract.Instances.END,
          CalendarContract.Instances.ALL_DAY
        )

      val selectedIds = mutableSetOf<String>()
      for (index in 0 until calendarIds.size()) {
        calendarIds.getString(index)
          ?.takeIf { it.isNotEmpty() }
          ?.let { selectedIds.add(it) }
      }

      val rows = mutableListOf<Pair<Long, WritableMap>>()
      CalendarContract.Instances.query(
        reactApplicationContext.contentResolver,
        projection,
        startDate.toLong(),
        endDate.toLong()
      )?.use { cursor ->
        val eventIdIndex = cursor.getColumnIndexOrThrow(CalendarContract.Instances.EVENT_ID)
        val calendarIdIndex =
          cursor.getColumnIndexOrThrow(CalendarContract.Events.CALENDAR_ID)
        val titleIndex = cursor.getColumnIndex(CalendarContract.Events.TITLE)
        val notesIndex = cursor.getColumnIndex(CalendarContract.Events.DESCRIPTION)
        val locationIndex = cursor.getColumnIndex(CalendarContract.Events.EVENT_LOCATION)
        val startIndex = cursor.getColumnIndexOrThrow(CalendarContract.Instances.BEGIN)
        val endIndex = cursor.getColumnIndexOrThrow(CalendarContract.Instances.END)
        val allDayIndex = cursor.getColumnIndex(CalendarContract.Instances.ALL_DAY)

        while (cursor.moveToNext()) {
          val calendarId = cursor.getLong(calendarIdIndex).toString()
          if (selectedIds.isNotEmpty() && !selectedIds.contains(calendarId)) {
            continue
          }

          val start = cursor.getLong(startIndex)
          val event = Arguments.createMap()
          event.putString("id", cursor.getLong(eventIdIndex).toString())
          event.putString("calendarId", calendarId)
          putStringOrNull(
            event,
            "title",
            if (titleIndex >= 0 && !cursor.isNull(titleIndex)) cursor.getString(titleIndex) else null
          )
          putStringOrNull(
            event,
            "notes",
            if (notesIndex >= 0 && !cursor.isNull(notesIndex)) cursor.getString(notesIndex) else null
          )
          putStringOrNull(
            event,
            "location",
            if (locationIndex >= 0 && !cursor.isNull(locationIndex)) {
              cursor.getString(locationIndex)
            } else {
              null
            }
          )
          event.putDouble("startDate", start.toDouble())
          event.putDouble("endDate", cursor.getLong(endIndex).toDouble())
          event.putBoolean(
            "allDay",
            allDayIndex >= 0 &&
              !cursor.isNull(allDayIndex) &&
              cursor.getInt(allDayIndex) == 1
          )
          rows.add(Pair(start, event))
        }
      }

      val events = Arguments.createArray()
      rows.sortedBy { it.first }.forEach { events.pushMap(it.second) }
      promise.resolve(events)
    } catch (e: Exception) {
      promise.reject(ERROR_LIST_EVENTS, e.message ?: "Failed to list events", e)
    }
  }

  override fun createEvent(
    calendarId: String?,
    title: String,
    notes: String?,
    location: String?,
    startDate: Double,
    endDate: Double,
    allDay: Boolean,
    promise: Promise
  ) {
    try {
      val targetCalendarId = calendarId ?: findDefaultCalendarId()
      if (targetCalendarId == null) {
        promise.reject(ERROR_CALENDAR, "No writable calendar")
        return
      }

      val values =
        ContentValues().apply {
          put(CalendarContract.Events.CALENDAR_ID, targetCalendarId.toLong())
          put(CalendarContract.Events.TITLE, title)
          putStringOrNull(this, CalendarContract.Events.DESCRIPTION, notes)
          putStringOrNull(this, CalendarContract.Events.EVENT_LOCATION, location)
          put(CalendarContract.Events.DTSTART, startDate.toLong())
          put(CalendarContract.Events.DTEND, endDate.toLong())
          put(CalendarContract.Events.ALL_DAY, if (allDay) 1 else 0)
          put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().id)
        }

      val uri =
        reactApplicationContext.contentResolver.insert(CalendarContract.Events.CONTENT_URI, values)
      if (uri == null) {
        promise.reject(ERROR_CREATE_EVENT, "Failed to create the calendar event")
        return
      }

      val result = Arguments.createMap()
      result.putString("id", uri.lastPathSegment ?: "")
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject(ERROR_CREATE_EVENT, e.message ?: "Failed to create the calendar event", e)
    }
  }

  override fun deleteEvent(eventId: String, promise: Promise) {
    try {
      val deletedRows =
        reactApplicationContext.contentResolver.delete(
          CalendarContract.Events.CONTENT_URI,
          "${CalendarContract.Events._ID} = ?",
          arrayOf(eventId)
        )

      val result = Arguments.createMap()
      result.putBoolean("deleted", deletedRows > 0)
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject(ERROR_DELETE_EVENT, e.message ?: "Failed to delete the calendar event", e)
    }
  }


  private fun findDefaultCalendarId(): String? {
    val projection =
      arrayOf(
        CalendarContract.Calendars._ID,
        CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL
      )
    reactApplicationContext.contentResolver
      .query(
        CalendarContract.Calendars.CONTENT_URI,
        projection,
        "${CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL} >= ?",
        arrayOf(CalendarContract.Calendars.CAL_ACCESS_OWNER.toString()),
        null
      )
      ?.use { cursor ->
        if (cursor.moveToFirst()) {
          return cursor
            .getLong(cursor.getColumnIndexOrThrow(CalendarContract.Calendars._ID))
            .toString()
        }
      }
    return null
  }

  private fun permissionResult(granted: Boolean, status: String): WritableMap {
    return Arguments.createMap().apply {
      putBoolean("granted", granted)
      putString("status", status)
    }
  }

  private fun putStringOrNull(map: WritableMap, key: String, value: String?) {
    if (value == null) {
      map.putNull(key)
    } else {
      map.putString(key, value)
    }
  }

  private fun putStringOrNull(values: ContentValues, key: String, value: String?) {
    if (value == null) {
      values.putNull(key)
    } else {
      values.put(key, value)
    }
  }

  private fun colorToHex(color: Int): String {
    return String.format("#%06X", 0xFFFFFF and color)
  }

  companion object {
    const val NAME = NativeCalendarSpec.NAME

    private const val STATUS_GRANTED = "granted"
    private const val STATUS_DENIED = "denied"
    private const val STATUS_UNAVAILABLE = "unavailable"

    private const val ERROR_CALENDAR = "CALENDAR_FAILED"
    private const val ERROR_LIST_CALENDARS = "CALENDAR_LIST_CALENDARS_FAILED"
    private const val ERROR_LIST_EVENTS = "CALENDAR_LIST_EVENTS_FAILED"
    private const val ERROR_CREATE_EVENT = "CALENDAR_CREATE_EVENT_FAILED"
    private const val ERROR_DELETE_EVENT = "CALENDAR_DELETE_EVENT_FAILED"

    private val READ_PERMISSIONS = arrayOf(Manifest.permission.READ_CALENDAR)
    private val WRITE_PERMISSIONS =
      arrayOf(Manifest.permission.WRITE_CALENDAR, Manifest.permission.READ_CALENDAR)
  }
}
