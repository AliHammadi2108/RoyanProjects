import { describe, it, expect } from 'vitest';
import { changeOwnPasswordSchema, resetUserPasswordSchema } from '@/lib/password-schema';
import { getScreenPermissionForPath } from '@/lib/screen-access';

describe('change-password schema', () => {
  it('accepts valid own password change input', () => {
    const result = changeOwnPasswordSchema.safeParse({
      currentPassword: 'oldpass',
      newPassword: 'newpass1',
      confirmPassword: 'newpass1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short new password', () => {
    const result = changeOwnPasswordSchema.safeParse({
      currentPassword: 'oldpass',
      newPassword: '123',
      confirmPassword: '123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched confirmation', () => {
    const result = changeOwnPasswordSchema.safeParse({
      currentPassword: 'oldpass',
      newPassword: 'newpass1',
      confirmPassword: 'otherpass',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('confirmPassword'))).toBe(true);
    }
  });

  it('rejects when new password equals current password', () => {
    const result = changeOwnPasswordSchema.safeParse({
      currentPassword: 'samepass',
      newPassword: 'samepass',
      confirmPassword: 'samepass',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('newPassword'))).toBe(true);
    }
  });

  it('accepts valid admin reset input', () => {
    const result = resetUserPasswordSchema.safeParse({
      userId: 'user-1',
      newPassword: 'reset123',
      confirmPassword: 'reset123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects admin reset with mismatched passwords', () => {
    const result = resetUserPasswordSchema.safeParse({
      userId: 'user-1',
      newPassword: 'reset123',
      confirmPassword: 'reset456',
    });
    expect(result.success).toBe(false);
  });
});

describe('change-password screen access', () => {
  it('maps change password screen to profile permission', () => {
    expect(getScreenPermissionForPath('/settings/change-password')).toBe(
      'profile.change_own_password'
    );
  });
});
