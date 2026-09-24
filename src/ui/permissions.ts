import { Linking } from 'react-native';

import type { PermissionFlags } from '../core/permissionStatus';

export type { PermissionFlags, PermissionStatus } from '../core/permissionStatus';
export { toPermissionStatus } from '../core/permissionStatus';

export function permissionDeniedMessage(kind: 'Camera' | 'Mic'): string {
  return `${kind} permission denied.`;
}

export function permissionBlockedMessage(kind: 'Camera' | 'Mic'): string {
  return `${kind} is blocked. Enable it in Settings.`;
}

export function describeDeniedPermission(
  kind: 'Camera' | 'Mic',
  flags: PermissionFlags,
): string {
  return flags.canAskAgain === false
    ? permissionBlockedMessage(kind)
    : permissionDeniedMessage(kind);
}

export function openAppSettings(): void {
  Linking.openSettings().catch(() => {});
}
