# @react-native-mcp/calendar

System calendar MCP tools for React Native. Part of the [React Native MCP](https://github.com/Hector-Zhuang/react-native-mcp) toolset.

## Tools

| Name                      | Description                                                                           | Annotations                         |
| ------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------- |
| `calendar_list_calendars` | List calendars available on the device.                                               | `readOnlyHint`, `idempotentHint`    |
| `calendar_list_events`    | List events inside an epoch-millisecond time window, optionally filtered by calendar. | `readOnlyHint`                      |
| `calendar_create_event`   | Create an event in the specified (or default) calendar.                               | —                                   |
| `calendar_delete_event`   | Permanently delete an event by its identifier.                                        | `destructiveHint`, `idempotentHint` |

Dates are exchanged as epoch milliseconds. Every tool requests the matching
OS permission on first use and fails with a structured `PERMISSION_DENIED`
error when authorization is missing.

## Installation

```sh
npm install @react-native-mcp/calendar
# or
yarn add @react-native-mcp/calendar
```

The package contains a TurboModule and ships native iOS (Swift, EventKit) and
Android (Kotlin, CalendarContract) code. Run `pod install` after adding the
dependency.

## Usage

```ts
import { createReactNativeMcpServer, createInProcessLink } from '@react-native-mcp/core';
import { createCalendarCapability } from '@react-native-mcp/calendar';

const server = createReactNativeMcpServer({
  capabilities: [createCalendarCapability()],
});
```

You can also call the TurboModule directly without MCP:

```ts
import { getCalendarModule } from '@react-native-mcp/calendar';

const permission = await getCalendarModule().requestPermission(true);
if (permission.granted) {
  const { id } = await getCalendarModule().createEvent(
    null,
    'Dentist appointment',
    null,
    '123 Main Street',
    Date.parse('2026-10-01T09:00:00Z'),
    Date.parse('2026-10-01T10:00:00Z'),
    false,
  );
}
```

Example MCP tool call:

```json
{
  "name": "calendar_list_events",
  "arguments": {
    "calendarIds": ["calendar-identifier"],
    "startDate": 1780272000000,
    "endDate": 1780358400000
  }
}
```

## iOS configuration

Add the following keys to your app's `Info.plist` with your own wording:

- `NSCalendarsUsageDescription` — shown when the app asks to read or write
  calendar events.
- `NSCalendarsWriteOnlyUserUsageDescription` — required on iOS 17+ when the
  user may grant write-only access.

## Android configuration

The library manifest declares the following permissions; they are requested
at runtime by the tools as needed:

- `android.permission.READ_CALENDAR`
- `android.permission.WRITE_CALENDAR`

## Platform notes

- **iOS**: event identifiers (`eventIdentifier`) are stable per device but can
  change when the calendar database is reset or migrated; treat them as
  opaque strings. iOS 17 distinguishes full access and write-only access —
  write-only authorization is rejected for the read tools.
- **Android**: recurring event instances are reported per occurrence through
  `CalendarContract.Instances`. New events are written with the device default
  timezone (`EVENT_TIMEZONE`). Event ids are the provider row ids as strings.
- All-day events are written as `00:00–23:59` in the device local timezone.

## License

MIT © React Native MCP contributors
