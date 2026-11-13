import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ComponentRef, RefObject } from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

type ViewRef = ComponentRef<typeof View>;

export async function shareFighterCardCapture(
  viewRef: RefObject<ViewRef | null>,
): Promise<{ ok: boolean; message: string }> {
  try {
    if (viewRef.current == null) {
      return { ok: false, message: 'Card not ready to capture.' };
    }
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, message: 'Sharing is not available on this device.' };
    }
    let shareUri = uri;
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const dest = new File(Paths.cache, `fighter-card-${Date.now()}.png`);
      const src = new File(uri);
      src.copy(dest);
      shareUri = dest.uri;
    }
    await Sharing.shareAsync(shareUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share Fighter Card',
    });
    return { ok: true, message: 'Shared.' };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Share failed',
    };
  }
}
