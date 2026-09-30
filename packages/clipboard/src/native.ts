import Clipboard from '@react-native-clipboard/clipboard';

export function isClipboardAvailable(): boolean {
  return Clipboard != null;
}

export function getClipboardModule(): typeof Clipboard {
  return Clipboard;
}
