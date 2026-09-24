export type PermissionStatus = 'checking' | 'granted' | 'denied' | 'blocked';

export type PermissionFlags = {
  granted: boolean;
  canAskAgain?: boolean;
  status?: string;
};

export function toPermissionStatus(
  flags: PermissionFlags | null | undefined,
): PermissionStatus {
  if (flags == null || flags.status === 'undetermined') {
    return 'checking';
  }
  if (flags.granted) {
    return 'granted';
  }
  if (flags.canAskAgain === false) {
    return 'blocked';
  }
  return 'denied';
}
