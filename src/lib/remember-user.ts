const REMEMBER_KEY = 'purchase_remember_user_no';

export function getRememberedUserNo(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(REMEMBER_KEY) || '';
}

export function setRememberedUserNo(userNo: string) {
  if (typeof window === 'undefined') return;
  if (userNo) localStorage.setItem(REMEMBER_KEY, userNo);
  else localStorage.removeItem(REMEMBER_KEY);
}
