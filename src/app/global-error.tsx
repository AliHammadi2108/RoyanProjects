'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full rounded-lg border border-red-200 bg-white p-6 shadow-sm text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">خطأ في النظام</h2>
          <p className="text-sm text-gray-600 mb-4">حدث خطأ غير متوقع. يرجى تحديث الصفحة أو المحاولة لاحقاً.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
