import { Linking, Platform } from 'react-native';
import { z } from 'zod';
import { defineMobileTool, jsonResult, ReactNativeMcpError } from '@react-native-mcp/core';
import type { ReactNativeMcpCapability } from '@react-native-mcp/core';

export interface SmsCapabilityAdapters {
  openSmsComposer?: (url: string) => Promise<void> | void;
}

function buildSmsUrl(phoneNumber: string, body?: string): string {
  const encodedBody = body === undefined ? '' : `?body=${encodeURIComponent(body)}`;
  if (Platform.OS === 'ios' && body !== undefined) {
    return `sms:${phoneNumber}&body=${encodeURIComponent(body)}`;
  }
  return `sms:${phoneNumber}${encodedBody}`;
}

export function createSmsCapability(
  adapters: SmsCapabilityAdapters = {},
): ReactNativeMcpCapability {
  const sendSms = defineMobileTool({
    name: 'sms_send',
    description: 'Open the native SMS composer with a recipient and optional message body.',
    inputShape: {
      phoneNumber: z.string().min(1),
      body: z.string().max(10000).optional(),
    },
    permission: {
      reason: 'Open the SMS composer so the user can review and send a message.',
      opensSystemUI: true,
    },
    handler: async (input) => {
      const url = buildSmsUrl(input.phoneNumber, input.body);
      try {
        await (adapters.openSmsComposer ?? Linking.openURL)(url);
      } catch (error) {
        throw new ReactNativeMcpError(
          'UNAVAILABLE',
          'The device cannot open an SMS composer.',
          'Verify that the device has a messaging app and cellular SMS support.',
          { cause: error instanceof Error ? error.message : String(error) },
        );
      }
      return jsonResult({ status: 'composer_opened', phoneNumber: input.phoneNumber });
    },
  });

  return { name: 'sms', version: '0.1.0', tools: [sendSms] };
}
