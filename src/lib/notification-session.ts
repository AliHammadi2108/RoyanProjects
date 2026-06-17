const LOGIN_EPOCH_PREFIX = 'notification-login-epoch-';
const LOGIN_SEEN_PREFIX = 'notification-login-modal-seen-';

function epochKey(userId: string) {
  return `${LOGIN_EPOCH_PREFIX}${userId}`;
}

function seenKey(userId: string) {
  return `${LOGIN_SEEN_PREFIX}${userId}`;
}

function storage() {
  if (typeof globalThis.sessionStorage === 'undefined') return null;
  return globalThis.sessionStorage;
}

/** Ensure a fresh login session bucket exists for this browser tab. */
export function ensureLoginNotificationSession(userId: string) {
  const store = storage();
  if (!store || !userId) return;
  if (!store.getItem(epochKey(userId))) {
    store.setItem(epochKey(userId), String(Date.now()));
    store.removeItem(seenKey(userId));
  }
}

export function getLoginModalSeenIds(userId: string): Set<string> {
  const store = storage();
  if (!store || !userId) return new Set();
  try {
    const raw = store.getItem(seenKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function rememberLoginModalSeenIds(userId: string, ids: string[]) {
  const store = storage();
  if (!store || !userId || ids.length === 0) return;
  const seen = getLoginModalSeenIds(userId);
  ids.forEach((id) => seen.add(id));
  store.setItem(seenKey(userId), JSON.stringify(Array.from(seen)));
}

export function clearLoginNotificationSession(userId?: string | null) {
  const store = storage();
  if (!store) return;
  if (userId) {
    store.removeItem(epochKey(userId));
    store.removeItem(seenKey(userId));
    return;
  }
  for (let i = store.length - 1; i >= 0; i -= 1) {
    const key = store.key(i);
    if (key?.startsWith(LOGIN_EPOCH_PREFIX) || key?.startsWith(LOGIN_SEEN_PREFIX)) {
      store.removeItem(key);
    }
  }
}
