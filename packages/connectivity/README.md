# @react-native-mcp/connectivity

Flashlight, WiFi and Bluetooth Low Energy MCP tools for React Native.

## Tools

| Name                  | Description                                      |
| --------------------- | ------------------------------------------------ |
| `flashlight_set`      | Turn the device flashlight on or off.            |
| `wifi_get_info`       | Read the current WiFi SSID and connection state. |
| `bluetooth_get_state` | Read the Bluetooth adapter state.                |
| `bluetooth_scan`      | Scan for nearby Bluetooth Low Energy devices.    |
| `bluetooth_stop_scan` | Stop an active BLE scan.                         |

## Installation

```sh
npm install @react-native-mcp/connectivity
cd ios && pod install
```

The package includes these native integrations:

- `react-native-torch` for flashlight control
- `react-native-wifi-reborn` for the current WiFi SSID
- `react-native-ble-plx` for Bluetooth state and BLE scanning

Rebuild the React Native app after installing these native dependencies. Expo Go is not supported because these libraries require custom native code.

## Usage

```ts
import { createReactNativeMcpServer } from '@react-native-mcp/core';
import { createConnectivityCapability } from '@react-native-mcp/connectivity';

const server = createReactNativeMcpServer({
  capabilities: [createConnectivityCapability()],
});
```

The package creates default adapters internally. Custom adapters can override individual integrations:

```ts
const capability = createConnectivityCapability({
  getBluetoothState: () => myBluetoothManager.getState(),
});
```

## Permissions

Add the following permissions and usage descriptions to the host application as required by the platforms and installed libraries:

### iOS

- `NSCameraUsageDescription` for flashlight access
- `NSLocationWhenInUseUsageDescription` and `NSLocalNetworkUsageDescription` for WiFi information
- `NSBluetoothAlwaysUsageDescription` for BLE access
- Xcode `Access WiFi Information` capability

### Android

- `android.permission.CAMERA` for flashlight access
- `android.permission.ACCESS_FINE_LOCATION` for WiFi scanning and older BLE scanning
- `android.permission.BLUETOOTH_SCAN` for Android 12+
- `android.permission.BLUETOOTH_CONNECT` for Android 12+

Runtime permission prompts are handled by the host application or the installed native library. MCP permission policy is checked before the tool handler runs.

## License

MIT
