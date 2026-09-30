# @react-native-mcp/sms

Native SMS composer MCP tools for React Native.

## Tool

| Name       | Description                                                         |
| ---------- | ------------------------------------------------------------------- |
| `sms_send` | Open the native SMS composer with a phone number and optional body. |

This package opens the system composer. The user reviews and sends the message. It does not send SMS silently in the background.

## Installation

```sh
npm install @react-native-mcp/sms
```

## Usage

```ts
import { createReactNativeMcpServer } from '@react-native-mcp/core';
import { createSmsCapability } from '@react-native-mcp/sms';

const server = createReactNativeMcpServer({
  capabilities: [createSmsCapability()],
});
```

The package uses React Native's `Linking` API and does not require an additional native dependency or SMS runtime permission.

## License

MIT
