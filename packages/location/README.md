# @react-native-mcp/location

One-shot device geolocation MCP tools for React Native. Part of the [React Native MCP](https://github.com/Hector-Zhuang/react-native-mcp) toolset.

## Tools

| Name                   | Description                                                                                                                                               | Annotations    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `location_get_current` | Get the device's current geographic position once (latitude, longitude, accuracy, altitude, heading and speed). Requests location permission when needed. | `readOnlyHint` |

The tool accepts two optional parameters:

- `accuracy`: `best` (GPS, may be slower), `balanced` (default) or `low` (coarse/passive).
- `timeoutMs`: maximum wait for a position fix, from `1000` to `60000` milliseconds (default `15000`).

## Installation

```sh
npm install @react-native-mcp/location
# or
yarn add @react-native-mcp/location
```

The package contains a TurboModule and ships native iOS (Swift) and Android (Kotlin) code.
Run `pod install` after adding the dependency.

```sh
cd ios && pod install
```

## Usage

```ts
import { createReactNativeMcpServer } from '@react-native-mcp/core';
import { createLocationCapability } from '@react-native-mcp/location';

const server = createReactNativeMcpServer({
  capabilities: [createLocationCapability()],
});
```

You can also call the TurboModule directly without MCP:

```ts
import { getLocationModule } from '@react-native-mcp/location';

const permission = await getLocationModule().requestPermission();
if (permission.granted) {
  const position = await getLocationModule().getCurrentPosition('balanced', 15000);
}
```

## Platform notes

### iOS

Add the following key to your app's `Info.plist` with your own usage description:

| Key                                   | Purpose                                                                |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `NSLocationWhenInUseUsageDescription` | Explains why the app needs access to the user's location while in use. |

Location is requested once per call via `CLLocationManager.requestLocation()`.
`best` maps to `kCLLocationAccuracyBest`, `balanced` to `kCLLocationAccuracyHundredMeters`
and `low` to `kCLLocationAccuracyThreeKilometers`. Unavailable values are reported as
`-1` for `heading` and `altitudeAccuracy`.

### Android

The package declares the following permissions in its manifest:

- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_COARSE_LOCATION`

Position fixes are provided by Google Play services
(`com.google.android.gms:play-services-location:21.3.0`, added automatically as a
dependency of this package). The host app must include Google Play services, which is
available on standard Android devices and emulators with Google APIs.

`best` maps to `PRIORITY_HIGH_ACCURACY`, `balanced` to `PRIORITY_BALANCED_POWER_ACCURACY`
and `low` to `PRIORITY_LOW_POWER`.

## Behavior

- Each call returns a single position fix; the tool never subscribes to continuous updates.
- Location permission is requested automatically before the first fix.
- If no fix is available within `timeoutMs`, the call fails with a timeout error.
- Permission denials are surfaced with the stable `PERMISSION_DENIED` error code.

## License

MIT © React Native MCP contributors
