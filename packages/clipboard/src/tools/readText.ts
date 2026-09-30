import { defineMobileTool, textResult } from '@react-native-mcp/core';
import { getClipboardModule } from '../native';

export const readTextTool = defineMobileTool({
  name: 'clipboard_read_text',
  description:
    'Read plain text currently stored in the system clipboard. Returns an empty string when the clipboard is empty or does not contain text.',
  inputShape: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
  handler: async () => {
    const text = await getClipboardModule().getString();
    return textResult(text);
  },
});
