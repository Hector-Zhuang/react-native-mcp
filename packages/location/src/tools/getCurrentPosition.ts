import { z } from 'zod';
import { defineMobileTool, jsonResult, ReactNativeMcpError } from '@react-native-mcp/core';
import { getLocationModule, toMobileError } from '../native';
import type { LocationPermissionResult, LocationPosition } from '../types';

export const getCurrentPositionTool = defineMobileTool({
  name: 'location_get_current',
  description:
    "Get the device's current geographic position once. Requests location permission when needed. accuracy: best (GPS, slower), balanced (default), low (coarse/passive). Returns latitude, longitude, accuracy in meters, altitude, heading and speed.",
  inputShape: {
    accuracy: z
      .enum(['best', 'balanced', 'low'])
      .default('balanced')
      .describe(
        'Desired accuracy: best uses GPS and may be slower, balanced is the default, low uses a coarse/passive source.',
      ),
    timeoutMs: z
      .number()
      .int()
      .min(1000)
      .max(60000)
      .default(15000)
      .describe('Maximum time to wait for a position fix, in milliseconds.'),
  },
  annotations: {
    readOnlyHint: true,
  },
  permission: {
    reason: 'Determine the current geographic position of the device.',
    iosUsageKeys: ['NSLocationWhenInUseUsageDescription'],
    androidPermissions: [
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
  },
  handler: async (input) => {
    const location = getLocationModule();

    try {
      const permission = (await location.requestPermission()) as LocationPermissionResult;

      if (!permission.granted) {
        throw ReactNativeMcpError.permissionDenied(
          `Location permission was not granted (status: ${permission.status}).`,
        );
      }

      const position = (await location.getCurrentPosition(
        input.accuracy,
        input.timeoutMs,
      )) as LocationPosition;

      return jsonResult(position);
    } catch (error) {
      throw toMobileError('Location', error);
    }
  },
});
