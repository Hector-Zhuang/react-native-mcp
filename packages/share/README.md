# @react-native-mcp/share

System share sheet MCP tool for React Native: present the iOS `UIActivityViewController` / Android `Intent.ACTION_SEND` chooser so the user can send text, a URL and/or a local image to another app. Part of the [React Native MCP](https://github.com/Hector-Zhuang/react-native-mcp) toolset.

## Tools

| Name          | Description                                                             | Annotations      |
| ------------- | ----------------------------------------------------------------------- | ---------------- |
| `share_share` | Present the native share sheet with text, a URL and/or one local image. | `idempotentHint` |

## Installation

```sh
npm install @react-native-mcp/share
# or
yarn add @react-native-mcp/share
```

The package contains a TurboModule and ships native iOS (Swift) and Android (Kotlin) code.
Run `pod install` after adding the dependency.

## Usage

```ts
import { createReactNativeMcpServer } from '@react-native-mcp/core';
import { createShareCapability } from '@react-native-mcp/share';

const server = createReactNativeMcpServer({
  capabilities: [createShareCapability()],
});
```

You can also call the TurboModule directly without MCP:

```ts
import { getShareModule } from '@react-native-mcp/share';

const result = await getShareModule().share(
  'Hello from React Native MCP',
  'https://github.com/Hector-Zhuang/react-native-mcp',
  null,
  null,
);
// iOS:  { status: 'shared' } | { status: 'dismissed' }
// Android: { status: 'launched' }
```

## Platform notes

- **iOS**: no `Info.plist` usage description is required. On iPad the share
  sheet is presented as a popover anchored to the center of the key window, so
  no host-app configuration is needed. The promise resolves with
  `{ "status": "shared" }` when the user completes the share and
  `{ "status": "dismissed" }` when they cancel the sheet.
- **Android**: images are shared through a `FileProvider` with authority
  `${applicationId}.reactnativemcp.share.fileprovider` (declared by the package's
  manifest; `imageUri` may be an absolute path or a `file://` URI). No runtime
  permission is required. Because Android does not provide a share-completion
  callback, the promise resolves with `{ "status": "launched" }` once the
  chooser is shown; user dismissal of the sheet is not observable.

## License

MIT © React Native MCP contributors
