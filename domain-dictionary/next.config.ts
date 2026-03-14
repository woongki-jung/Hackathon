import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // better-sqlite3 네이티브 모듈 서버 전용 처리
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    // TLS 인증서 문제 해결 (Google Fonts 로드)
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
