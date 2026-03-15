'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface GNBProps {
  username: string;
  role: 'admin' | 'user';
}

export function GNB({ username, role }: GNBProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const navLinkClass = (href: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(href)
        ? 'bg-indigo-700 text-white'
        : 'text-indigo-100 hover:bg-indigo-600 hover:text-white'
    }`;

  const mobileNavLinkClass = (href: string) =>
    `block px-3 py-2 rounded-md text-base font-medium transition-colors ${
      isActive(href)
        ? 'bg-indigo-700 text-white'
        : 'text-indigo-100 hover:bg-indigo-600 hover:text-white'
    }`;

  const ariaCurrent = (href: string): 'page' | undefined =>
    isActive(href) ? 'page' : undefined;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <nav className="bg-indigo-800 text-white shadow-md" aria-label="주 메뉴">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-white font-bold text-lg tracking-tight shrink-0">
              도메인 사전
            </Link>
            {/* 데스크탑 네비게이션 */}
            <div className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className={navLinkClass('/dashboard')} aria-current={ariaCurrent('/dashboard')}>
                대시보드
              </Link>
              <Link href="/dictionary" className={navLinkClass('/dictionary')} aria-current={ariaCurrent('/dictionary')}>
                용어사전
              </Link>
              {role === 'admin' && (
                <>
                  <Link href="/settings" className={navLinkClass('/settings')} aria-current={ariaCurrent('/settings')}>
                    환경설정
                  </Link>
                  <Link href="/admin/users" className={navLinkClass('/admin/users')} aria-current={ariaCurrent('/admin/users')}>
                    사용자 관리
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* 사용자 정보 + 로그아웃 (데스크탑) */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-indigo-200 text-sm">{username}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                role === 'admin' ? 'bg-purple-500 text-white' : 'bg-indigo-600 text-indigo-100'
              }`}
            >
              {role === 'admin' ? '관리자' : '사용자'}
            </span>
            <button
              onClick={handleLogout}
              className="ml-2 text-xs text-indigo-300 hover:text-white transition-colors underline"
            >
              로그아웃
            </button>
          </div>

          {/* 모바일 햄버거 */}
          <button
            className="md:hidden p-2 rounded-md text-indigo-100 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {menuOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-indigo-700 px-4 pt-2 pb-4 space-y-1">
          <Link href="/dashboard" className={mobileNavLinkClass('/dashboard')} aria-current={ariaCurrent('/dashboard')} onClick={() => setMenuOpen(false)}>
            대시보드
          </Link>
          <Link href="/dictionary" className={mobileNavLinkClass('/dictionary')} aria-current={ariaCurrent('/dictionary')} onClick={() => setMenuOpen(false)}>
            용어사전
          </Link>
          {role === 'admin' && (
            <>
              <Link href="/settings" className={mobileNavLinkClass('/settings')} aria-current={ariaCurrent('/settings')} onClick={() => setMenuOpen(false)}>
                환경설정
              </Link>
              <Link href="/admin/users" className={mobileNavLinkClass('/admin/users')} aria-current={ariaCurrent('/admin/users')} onClick={() => setMenuOpen(false)}>
                사용자 관리
              </Link>
            </>
          )}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-indigo-700">
            <span className="text-indigo-200 text-sm">{username}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                role === 'admin' ? 'bg-purple-500 text-white' : 'bg-indigo-600 text-indigo-100'
              }`}
            >
              {role === 'admin' ? '관리자' : '사용자'}
            </span>
            <button
              onClick={handleLogout}
              className="ml-auto text-xs text-indigo-300 hover:text-white transition-colors underline"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
