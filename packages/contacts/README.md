# @react-native-mcp/contacts

Address book contacts MCP tools for React Native. Part of the [React Native MCP](https://github.com/Hector-Zhuang/react-native-mcp) toolset. The package ships a TurboModule with native iOS (Swift, Contacts framework) and Android (Kotlin, ContactsContract) implementations.

## Tools

| Name            | Description                                                                                       | Annotations                      |
| --------------- | ------------------------------------------------------------------------------------------------- | -------------------------------- |
| `contacts_find` | Search device contacts by display name (case-insensitive substring), or list all with pagination. | `readOnlyHint`, `idempotentHint` |
| `contacts_add`  | Create a new contact in the device address book.                                                  | —                                |

`contacts_find` returns normalized contacts:

```json
{
  "contacts": [
    {
      "id": "A1B2C3",
      "givenName": "Ada",
      "familyName": "Lovelace",
      "displayName": "Ada Lovelace",
      "phoneNumbers": [{ "label": "mobile", "number": "+1 555 123 4567" }],
      "emails": [{ "label": "work", "address": "ada@example.com" }]
    }
  ],
  "limit": 20,
  "offset": 0
}
```

`contacts_add` requires at least one of `givenName`, `familyName`,
`organization`, `phoneNumbers` or `emails`, and returns `{ "id": "..." }`.

## Installation

```sh
npm install @react-native-mcp/contacts
# or
yarn add @react-native-mcp/contacts
```

Then install the CocoaPods:

```sh
cd ios && pod install
```

## Usage

```ts
import { createReactNativeMcpServer } from '@react-native-mcp/core';
import { createContactsCapability } from '@react-native-mcp/contacts';

const server = createReactNativeMcpServer({
  capabilities: [createContactsCapability()],
});
```

You can also call the TurboModule directly without MCP:

```ts
import { getContactsModule } from '@react-native-mcp/contacts';

const permission = await getContactsModule().requestPermission(false);
if (permission.granted) {
  const contacts = await getContactsModule().findContacts('ada', 20, 0);
}
```

## Platform notes

### iOS

Add the Contacts usage description to your app's `Info.plist`; iOS shows this
string in the system permission dialog:

```xml
<key>NSContactsUsageDescription</key>
<string>This app needs access to contacts to search and create address book entries for you.</string>
```

Read and write share the same authorization on iOS, so a single grant covers
both tools.

### Android

The package declares the following permissions in its manifest; the module
requests them at runtime when a tool is first used:

- `android.permission.READ_CONTACTS` for `contacts_find`
- `android.permission.WRITE_CONTACTS` (plus read) for `contacts_add`

No additional Gradle dependencies are required.

## Privacy notes

- Contacts are sensitive user data. Only call these tools in response to a
  clear user intent, and surface the OS permission prompt without attempting
  to bypass it.
- `contacts_find` reads only the id, name, organization, phone numbers and
  email addresses, and paginates results with `limit`/`offset`.
- `contacts_add` writes a single new contact; existing contacts are never
  modified or deleted.

## License

MIT © React Native MCP contributors
