'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AuthError]', error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-5xl font-bold text-red-300 mb-4">오류</p>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">페이지를 불러오지 못했습니다</h2>
      <p className="text-gray-500 text-sm mb-6">잠시 후 다시 시도하거나 대시보드로 이동해 주세요.</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          다시 시도
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          대시보드로 이동
        </Link>
      </div>
    </div>
  );
}
