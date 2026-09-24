import { toPermissionStatus } from './permissionStatus';

describe('toPermissionStatus', () => {
  it('treats missing and undetermined as checking', () => {
    expect(toPermissionStatus(null)).toBe('checking');
    expect(toPermissionStatus({ granted: false, status: 'undetermined' })).toBe(
      'checking',
    );
  });

  it('maps granted, denied, and blocked', () => {
    expect(toPermissionStatus({ granted: true })).toBe('granted');
    expect(toPermissionStatus({ granted: false })).toBe('denied');
    expect(toPermissionStatus({ granted: false, canAskAgain: false })).toBe(
      'blocked',
    );
  });
});
