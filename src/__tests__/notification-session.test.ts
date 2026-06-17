import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clearLoginNotificationSession,
  ensureLoginNotificationSession,
  getLoginModalSeenIds,
  rememberLoginModalSeenIds,
} from '@/lib/notification-session';

function createSessionStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe('notification-session', () => {
  const userId = 'user-test-1';

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createSessionStorageMock());
  });

  it('starts a fresh login session bucket and shows unseen notifications', () => {
    ensureLoginNotificationSession(userId);
    expect(getLoginModalSeenIds(userId).size).toBe(0);

    rememberLoginModalSeenIds(userId, ['n1', 'n2']);
    expect(getLoginModalSeenIds(userId)).toEqual(new Set(['n1', 'n2']));
  });

  it('clears session keys on logout so login popup can appear again', () => {
    ensureLoginNotificationSession(userId);
    rememberLoginModalSeenIds(userId, ['n1']);

    clearLoginNotificationSession(userId);

    ensureLoginNotificationSession(userId);
    expect(getLoginModalSeenIds(userId).size).toBe(0);
  });

  it('preserves seen ids across refresh within the same login session', () => {
    ensureLoginNotificationSession(userId);
    rememberLoginModalSeenIds(userId, ['n1']);

    ensureLoginNotificationSession(userId);
    expect(getLoginModalSeenIds(userId)).toEqual(new Set(['n1']));
  });
});
