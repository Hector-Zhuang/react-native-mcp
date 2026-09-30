# @react-native-mcp/clipboard

System clipboard MCP tools for React Native. Part of the [React Native MCP](https://github.com/Hector-Zhuang/react-native-mcp) toolset.

## Tools

| Name                   | Description                                    | Annotations      |
| ---------------------- | ---------------------------------------------- | ---------------- |
| `clipboard_read_text`  | Read plain text from the system clipboard.     | `readOnlyHint`   |
| `clipboard_write_text` | Replace the clipboard content with plain text. | `idempotentHint` |

## Installation

```sh
npm install @react-native-mcp/clipboard
# or
yarn add @react-native-mcp/clipboard
```

The package contains a TurboModule and ships native iOS (Swift) and Android (Kotlin) code.
Run `pod install` after adding the dependency.

## Usage

```ts
import { createReactNativeMcpServer, createInProcessLink } from '@react-native-mcp/core';
import { createClipboardCapability } from '@react-native-mcp/clipboard';

const server = createReactNativeMcpServer({
  capabilities: [createClipboardCapability()],
});
```

You can also call the TurboModule directly without MCP:

```ts
import { getClipboardModule } from '@react-native-mcp/clipboard';

await getClipboardModule().setString('hello');
```

## Platform notes

- **iOS**: no `Info.plist` usage description is required. iOS may show the
  system paste confirmation when reading.
- **Android**: no runtime permission is required.

## License

MIT © React Native MCP contributors
