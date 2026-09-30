import Foundation
import EventKit

@objc(ReactNativeMcpCalendarImpl)
public class ReactNativeMcpCalendarImpl: NSObject {
  @objc public static let shared = ReactNativeMcpCalendarImpl()

  private let eventStore = EKEventStore()

  

  @objc(requestPermission:resolve:reject:)
  public func requestPermission(
    _ writeAccess: Bool,
    resolve: @escaping ([String: Any]) -> Void,
    reject: @escaping (String, String, Error?) -> Void
  ) {
    let completion: (Error?) -> Void = { error in
      if let error = error {
        reject("INTERNAL", error.localizedDescription, error)
        return
      }
      let status = EKEventStore.authorizationStatus(for: .event)
      resolve([
        "granted": ReactNativeMcpCalendarImpl.isGranted(status, writeAccess: writeAccess),
        "status": ReactNativeMcpCalendarImpl.statusName(status),
      ])
    }

    if #available(iOS 17.0, *) {
      eventStore.requestFullAccessToEvents { _, error in
        completion(error)
      }
    } else {
      eventStore.requestAccess(to: .event) { _, error in
        completion(error)
      }
    }
  }

  private static func isGranted(_ status: EKAuthorizationStatus, writeAccess: Bool) -> Bool {
    switch status {
    case .fullAccess:
      return true
    case .writeOnly:
      
      return writeAccess
    default:
      return false
    }
  }

  private static func statusName(_ status: EKAuthorizationStatus) -> String {
    switch status {
    case .fullAccess:
      return "granted"
    case .writeOnly:
      return "writeOnly"
    case .denied:
      return "denied"
    case .restricted:
      return "restricted"
    case .notDetermined:
      return "denied"
    @unknown default:
      return "unavailable"
    }
  }

  

  @objc(listCalendars:reject:)
  public func listCalendars(
    resolve: @escaping ([[String: Any]]) -> Void,
    reject: @escaping (String, String, Error?) -> Void
  ) {
    let calendars = eventStore.calendars(for: .event)
    let primaryIdentifier = eventStore.defaultCalendarForNewEvents?.calendarIdentifier
    resolve(
      calendars.map { calendar in
        return [
          "id": calendar.calendarIdentifier,
          "title": calendar.title,
          "isPrimary": calendar.calendarIdentifier == primaryIdentifier,
          "allowsModifications": calendar.allowsContentModifications,
          "color": ReactNativeMcpCalendarImpl.hexColor(calendar.cgColor) ?? NSNull(),
        ]
      }
    )
  }

  

  @objc(listEvents:startDate:endDate:resolve:reject:)
  public func listEvents(
    _ calendarIds: [String],
    startDate: Double,
    endDate: Double,
    resolve: @escaping ([[String: Any]]) -> Void,
    reject: @escaping (String, String, Error?) -> Void
  ) {
    let calendars: [EKCalendar]
    if calendarIds.isEmpty {
      calendars = eventStore.calendars(for: .event)
    } else {
      calendars = calendarIds.compactMap { eventStore.calendar(withIdentifier: $0) }
    }

    let start = Date(timeIntervalSince1970: startDate / 1000.0)
    let end = Date(timeIntervalSince1970: endDate / 1000.0)
    let predicate = eventStore.predicateForEvents(
      withStart: start,
      end: end,
      calendars: calendars
    )
    let events = eventStore
      .events(matching: predicate)
      .sorted { $0.startDate.compare($1.startDate) == .orderedAscending }
    resolve(events.map { ReactNativeMcpCalendarImpl.mapEvent($0) })
  }

  @objc(createEvent:title:notes:location:startDate:endDate:allDay:resolve:reject:)
  public func createEvent(
    _ calendarId: String?,
    title: String,
    notes: String?,
    location: String?,
    startDate: Double,
    endDate: Double,
    allDay: Bool,
    resolve: @escaping ([String: Any]) -> Void,
    reject: @escaping (String, String, Error?) -> Void
  ) {
    let targetCalendar: EKCalendar?
    if let calendarId = calendarId {
      targetCalendar = eventStore.calendar(withIdentifier: calendarId)
    } else {
      targetCalendar = eventStore.defaultCalendarForNewEvents
    }

    guard let calendar = targetCalendar else {
      reject("CALENDAR_FAILED", "No writable calendar", nil)
      return
    }

    let event = EKEvent(eventStore: eventStore)
    event.calendar = calendar
    event.title = title
    event.notes = notes
    event.location = location
    event.timeZone = TimeZone.current

    let rawStart = Date(timeIntervalSince1970: startDate / 1000.0)
    let rawEnd = Date(timeIntervalSince1970: endDate / 1000.0)
    if allDay {
      let calendarUnits = Calendar.current
      event.startDate =
        calendarUnits.date(bySettingHour: 0, minute: 0, second: 0, of: rawStart) ?? rawStart
      event.endDate =
        calendarUnits.date(bySettingHour: 23, minute: 59, second: 0, of: rawStart) ?? rawEnd
    } else {
      event.startDate = rawStart
      event.endDate = rawEnd
    }

    do {
      try eventStore.save(event, span: .thisEvent, commit: true)
      resolve(["id": event.eventIdentifier ?? ""])
    } catch {
      reject("INTERNAL", error.localizedDescription, error)
    }
  }

  @objc(deleteEvent:resolve:reject:)
  public func deleteEvent(
    _ eventId: String,
    resolve: @escaping ([String: Any]) -> Void,
    reject: @escaping (String, String, Error?) -> Void
  ) {
    guard let event = eventStore.event(withIdentifier: eventId) else {
      resolve(["deleted": false])
      return
    }

    do {
      try eventStore.remove(event, span: .thisEvent, commit: true)
      resolve(["deleted": true])
    } catch {
      reject("INTERNAL", error.localizedDescription, error)
    }
  }

  

  private static func mapEvent(_ event: EKEvent) -> [String: Any] {
    return [
      "id": event.eventIdentifier ?? "",
      "calendarId": event.calendar.calendarIdentifier,
      "title": event.title ?? NSNull(),
      "notes": event.notes ?? NSNull(),
      "location": event.location ?? NSNull(),
      "startDate": Int((event.startDate.timeIntervalSince1970 * 1000.0).rounded()),
      "endDate": Int((event.endDate.timeIntervalSince1970 * 1000.0).rounded()),
      "allDay": event.isAllDay,
    ]
  }

  private static func hexColor(_ cgColor: CGColor?) -> String? {
    guard
      let cgColor = cgColor,
      let rgb = cgColor.converted(
        to: CGColorSpaceCreateDeviceRGB(),
        intent: .defaultIntent,
        options: nil
      ),
      let components = rgb.components,
      components.count >= 3
    else {
      return nil
    }

    let red = clamp(Int((components[0] * 255.0).rounded()))
    let green = clamp(Int((components[1] * 255.0).rounded()))
    let blue = clamp(Int((components[2] * 255.0).rounded()))
    return String(format: "#%02X%02X%02X", red, green, blue)
  }

  private static func clamp(_ value: Int) -> Int {
    return min(max(value, 0), 255)
  }
}
