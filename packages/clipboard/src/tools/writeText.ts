import { z } from 'zod';
import { defineMobileTool, emptyResult } from '@react-native-mcp/core';
import { getClipboardModule } from '../native';

export const writeTextTool = defineMobileTool({
  name: 'clipboard_write_text',
  description:
    'Write plain text to the system clipboard, replacing its current content. The text can be pasted by the user in any app.',
  inputShape: {
    text: z
      .string()
      .min(1, 'text must not be empty')
      .max(10000, 'text must be at most 10000 characters')
      .describe('Plain text to place on the clipboard.'),
  },
  annotations: {
    idempotentHint: true,
  },
  handler: async (input) => {
    await getClipboardModule().setString(input.text);
    return emptyResult();
  },
});
