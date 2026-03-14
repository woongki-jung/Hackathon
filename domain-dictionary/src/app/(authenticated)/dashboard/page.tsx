'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">도메인 사전</h1>
        <p className="text-gray-500 text-sm mb-8">메일 용어 분석 서비스</p>
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <p className="text-green-700 text-sm font-medium">로그인되었습니다.</p>
          <p className="text-green-600 text-xs mt-1">대시보드 기능은 Sprint 3 이후 구현 예정입니다.</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center justify-center gap-2 mx-auto px-6 py-2.5 rounded-md
            border border-gray-300 text-sm text-gray-700
            hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          {isLoggingOut ? <Spinner size="sm" /> : null}
          로그아웃
        </button>
      </div>
    </div>
  );
}
