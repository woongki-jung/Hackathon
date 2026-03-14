'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { validateUsername } from '@/lib/validators/auth';

interface FormErrors {
  username?: string;
  password?: string;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const isExpired = searchParams.get('expired') === 'true';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): boolean {
    const newErrors: FormErrors = {};
    const usernameError = validateUsername(username);
    if (usernameError) newErrors.username = usernameError;

    // 로그인 시에는 비밀번호 형식 대신 필수/최소 길이만 체크
    if (!password || password.trim() === '') {
      newErrors.password = '비밀번호를 입력해 주세요.';
    } else if (password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      // Sprint 2에서 실제 API 연결 예정
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setServerError(data.message || '아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setServerError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* 서비스 로고/이름 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">도메인 사전</h1>
          <p className="text-sm text-gray-500 mt-1">메일 용어 분석 서비스</p>
        </div>

        {/* 세션 만료 안내 */}
        {isExpired && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-700"
          >
            세션이 만료되었습니다. 다시 로그인해 주세요.
          </div>
        )}

        {/* 로그인 카드 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">로그인</h2>

          {/* 서버 오류 */}
          {serverError && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* 아이디 필드 */}
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                아이디
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
                }}
                placeholder="아이디 입력"
                autoFocus
                autoComplete="username"
                aria-describedby={errors.username ? 'username-error' : undefined}
                aria-invalid={!!errors.username}
                className={`w-full px-3 py-3 rounded-md border text-sm outline-none transition-colors
                  ${
                    errors.username
                      ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
              />
              {errors.username && (
                <p id="username-error" className="mt-1 text-sm text-red-500">
                  {errors.username}
                </p>
              )}
            </div>

            {/* 비밀번호 필드 */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="비밀번호 입력"
                autoComplete="current-password"
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={!!errors.password}
                className={`w-full px-3 py-3 rounded-md border text-sm outline-none transition-colors
                  ${
                    errors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
              />
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-500">
                  {errors.password}
                </p>
              )}
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md
                bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                text-white text-sm font-medium
                transition-colors disabled:opacity-70 disabled:cursor-not-allowed
                min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" />
                  <span>로그인 중...</span>
                </>
              ) : (
                '로그인'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
