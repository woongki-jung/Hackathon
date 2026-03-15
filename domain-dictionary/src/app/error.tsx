'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error.message);
  }, [error]);

  return (
    <html lang="ko">
      <body className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-5xl font-bold text-red-300 mb-4">오류</p>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">예기치 않은 오류가 발생했습니다</h1>
          <p className="text-gray-500 text-sm mb-6">잠시 후 다시 시도해 주세요.</p>
          <button
            onClick={reset}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
