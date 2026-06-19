'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { OPERATION_MESSAGES, type OperationMessageKey } from '@/lib/operation-messages';

const AUTO_DISMISS_MS = 3500;

interface ToastContextValue {
  showSuccess: (message: string) => void;
  showOperationSuccess: (key: OperationMessageKey) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(null);
  }, []);

  const showSuccess = useCallback(
    (nextMessage: string) => {
      dismiss();
      setMessage(nextMessage);
      timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const showOperationSuccess = useCallback(
    (key: OperationMessageKey) => {
      showSuccess(OPERATION_MESSAGES[key]);
    },
    [showSuccess]
  );

  useEffect(() => dismiss, [dismiss]);

  const value = useMemo(
    () => ({ showSuccess, showOperationSuccess }),
    [showSuccess, showOperationSuccess]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? <SuccessToast message={message} onDismiss={dismiss} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
