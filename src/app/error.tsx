'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full rounded-lg border border-red-200 bg-white p-6 shadow-sm text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">حدث خطأ</h2>
        <p className="text-sm text-gray-600 mb-4">تعذر تحميل الصفحة. يمكنك المحاولة مرة أخرى.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
