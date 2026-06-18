'use client';

import { useCallback, useRef, useState } from 'react';

/** Prevents duplicate save/submit clicks until navigation or explicit reset. */
export function useSaveLock() {
  const lockedRef = useRef(false);
  const [loading, setLoading] = useState(false);

  const withSaveLock = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lockedRef.current) return undefined;
    lockedRef.current = true;
    setLoading(true);
    try {
      return await fn();
    } catch (err) {
      lockedRef.current = false;
      setLoading(false);
      throw err;
    }
  }, []);

  const resetSaveLock = useCallback(() => {
    lockedRef.current = false;
    setLoading(false);
  }, []);

  return {
    loading,
    withSaveLock,
    resetSaveLock,
    isSaveLocked: loading || lockedRef.current,
  };
}
