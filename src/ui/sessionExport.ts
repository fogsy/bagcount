import * as Device from 'expo-device';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { FusionLogEntry, FusionStats } from '../core/fusion';
import type { SessionSettings } from './sessionSettings';

export const SESSION_EXPORT_APP = 'boxingai';
export const SESSION_EXPORT_APP_VERSION = '1.0.0';

export type SessionExportDevice = {
  brand: string | null;
  modelName: string | null;
  osName: string | null;
  osVersion: string | null;
  platformApiLevel: number | null;
};

export type SessionExportPayload = {
  app: string;
  appVersion: string;
  exportedAt: string;
  session: {
    startedAtMs: number;
    endedAtMs: number;
    durationMs: number;
  };
  settings: SessionSettings;
  stats: {
    hits: number;
    visionOnly: number;
    audioOnly: number;
  };
  events: FusionLogEntry[];
  device: SessionExportDevice;
};

export function buildSessionExport(input: {
  startedAtMs: number;
  endedAtMs: number;
  settings: SessionSettings;
  stats: FusionStats;
  events: readonly FusionLogEntry[];
}): SessionExportPayload {
  const startedAtMs = input.startedAtMs;
  const endedAtMs = input.endedAtMs;
  return {
    app: SESSION_EXPORT_APP,
    appVersion: SESSION_EXPORT_APP_VERSION,
    exportedAt: new Date().toISOString(),
    session: {
      startedAtMs,
      endedAtMs,
      durationMs: Math.max(0, endedAtMs - startedAtMs),
    },
    settings: input.settings,
    stats: {
      hits: input.stats.hits,
      visionOnly: input.stats.visionOnly,
      audioOnly: input.stats.audioOnly,
    },
    events: input.events.slice(),
    device: {
      brand: Device.brand,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      platformApiLevel: Device.platformApiLevel,
    },
  };
}

export async function shareSessionExport(payload: SessionExportPayload): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device');
  }
  const file = new File(Paths.cache, `bagcount-session-${Date.now()}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(payload, null, 2));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export session',
  });
}
