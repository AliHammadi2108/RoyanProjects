import { describe, it, expect } from 'vitest';
import { getScreenPermissionForPath } from '@/lib/screen-access';

describe('screen-access', () => {
  it('maps purchase screens to view permissions', () => {
    expect(getScreenPermissionForPath('/purchases/quotations')).toBe('quotations.view');
    expect(getScreenPermissionForPath('/purchases/quotations/new')).toBe('quotations.view');
    expect(getScreenPermissionForPath('/purchases/quotations/abc123')).toBe('quotations.view');
  });

  it('maps settings screens to view permissions', () => {
    expect(getScreenPermissionForPath('/settings/currencies')).toBe('master.currencies.view');
    expect(getScreenPermissionForPath('/settings/roles')).toBe('access.roles.view');
  });

  it('returns null for unknown paths', () => {
    expect(getScreenPermissionForPath('/unauthorized')).toBeNull();
  });

  it('prefers longer path prefixes', () => {
    expect(getScreenPermissionForPath('/settings/approval-matrix')).toBe('approvals.view');
  });
});
