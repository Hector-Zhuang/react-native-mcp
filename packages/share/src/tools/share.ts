import { z } from 'zod';
import { defineMobileTool, jsonResult, ReactNativeMcpError } from '@react-native-mcp/core';
import { getShareModule, toMobileError } from '../native';
import type { ShareResult } from '../types';

export const shareTool = defineMobileTool({
  name: 'share_share',
  description:
    'Present the native share sheet to send text, a URL and/or one image file to apps chosen by the user. This opens system UI; the user confirms the share. At least one of text/url/imageUri is required.',
  inputShape: {
    text: z
      .string()
      .min(1, 'text must not be empty')
      .max(2000, 'text must be at most 2000 characters')
      .nullable()
      .optional(),
    url: z
      .string()
      .url('url must be a valid URL')
      .max(2000, 'url must be at most 2000 characters')
      .nullable()
      .optional(),
    imageUri: z
      .string()
      .min(1, 'imageUri must not be empty')
      .max(2000, 'imageUri must be at most 2000 characters')
      .describe('Absolute file path or file:// URI of a local image.')
      .nullable()
      .optional(),
    subject: z.string().max(200, 'subject must be at most 200 characters').nullable().optional(),
  },
  annotations: {
    idempotentHint: true,
  },
  permission: {
    reason: 'Presenting the system share sheet leaves the current app context.',
    opensSystemUI: true,
  },
  handler: async (input) => {
    const text = input.text ?? null;
    const url = input.url ?? null;
    const imageUri = input.imageUri ?? null;
    const subject = input.subject ?? null;

    if (!text && !url && !imageUri && !subject) {
      throw ReactNativeMcpError.invalidParams(
        'At least one of text, url, imageUri or subject is required.',
      );
    }

    try {
      const result = await getShareModule().share(text, url, imageUri, subject);
      return jsonResult(result as unknown as ShareResult);
    } catch (error) {
      throw toMobileError('Share', error);
    }
  },
});
