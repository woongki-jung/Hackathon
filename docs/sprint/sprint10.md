# Sprint 10: 성능 최적화 + 보안 강화 + 배포 + 문서화

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 5(안정화)의 마지막 스프린트로, API 응답 캐싱 / 보안 강화(rate limiting, 보안 헤더) / 기술 부채 정리 / 배포 환경 구성 / 사용자 가이드 작성을 완료하여 M5(정식 릴리스) 마일스톤을 달성한다.

**Architecture:** Next.js의 Route Segment Config(`revalidate`)를 활용하여 변경 빈도가 낮은 trending/status API에 ISR 캐싱을 적용한다. Rate limiting은 별도 패키지 없이 메모리 Map 기반으로 구현한다. 보안 헤더는 `next.config.ts`의 `headers()` 함수로 추가한다. 기술 부채는 `sync-terms/route.ts`의 중복 함수를 `dictionary-store.ts`에서 re-export하는 방식으로 제거하고, `file-manager.ts`에 이미 구현된 `fileExists()`를 활용하도록 `sync-terms/route.ts`를 수정한다. GNB의 불필요한 ARIA role 속성도 제거한다.

**Tech Stack:** Next.js 15 App Router (Route Segment Config, `headers()`), TypeScript, Tailwind CSS, PM2, better-sqlite3

---

## 개요

| 항목 | 내용 |
|------|------|
| 스프린트 번호 | Sprint 10 |
| Phase | Phase 5 (안정화) — 마지막 스프린트 |
| 기간 | 2주 |
| 브랜치 | `sprint10` |
| 상태 | ✅ 완료 (2026-03-15) |

## 스프린트 목표

Sprint 9까지 에러 처리·접근성·FTS5 최적화를 완료한 상태에서, 전체 10개 스프린트의 최종 스프린트로서 다음 목표를 달성한다:

1. **성능 최적화**: 변경 빈도가 낮은 API에 ISR 캐싱 적용, 보안 헤더 추가
2. **보안 최종 점검**: 로그인 API rate limiting, 보안 헤더, `.env.local.example` 최신화
3. **기술 부채 정리**: `sync-terms/route.ts` 중복 함수 제거, GNB 불필요 ARIA role 제거
4. **배포 환경 구성**: PM2 설정, 배포 가이드 문서, 프로덕션 환경변수 예시
5. **사용자 가이드**: 초기 설정, 주요 기능, 트러블슈팅 문서 작성

## 현재 상태 파악

### 기존 구현 확인 사항

- `domain-dictionary/src/app/api/dictionary/trending/route.ts` — `revalidate` 캐싱 **없음**, ISR 적용 필요
- `domain-dictionary/src/app/api/mail/status/route.ts` — `revalidate` 캐싱 **없음**, ISR 적용 필요
- `domain-dictionary/src/app/api/auth/login/route.ts` — rate limiting **없음**, 메모리 기반 구현 필요
- `domain-dictionary/next.config.ts` — 보안 헤더 **없음** (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)
- `domain-dictionary/src/app/api/admin/sync-terms/route.ts` — `toSafeFileName`, `buildGlossaryMarkdown` 함수 중복 정의, `fs.existsSync` 직접 사용
- `domain-dictionary/src/components/layout/GNB.tsx` — `role="list"/"listitem"` 불필요 ARIA 속성 있음
- `.env.local.example` — **미확인**, 최신화 필요
- `ecosystem.config.js` — **미존재**, PM2 설정 파일 생성 필요
- `docs/deploy/README.md` — **미존재**, 배포 가이드 생성 필요
- `docs/user-guide.md` — **미존재**, 사용자 가이드 생성 필요

### 구현해야 할 사항

| 태스크 | 대상 파일 | 작업 유형 |
|--------|-----------|-----------|
| T10-1-a: trending API 캐싱 | `src/app/api/dictionary/trending/route.ts` | 수정 |
| T10-1-b: status API 캐싱 | `src/app/api/mail/status/route.ts` | 수정 |
| T10-2-a: 로그인 rate limiting | `src/app/api/auth/login/route.ts` | 수정 |
| T10-2-b: 보안 헤더 추가 | `domain-dictionary/next.config.ts` | 수정 |
| T10-2-c: `.env.local.example` 최신화 | `domain-dictionary/.env.local.example` | 수정 |
| T10-5-a: sync-terms 중복 제거 | `src/app/api/admin/sync-terms/route.ts` | 수정 |
| T10-5-b: GNB role 속성 제거 | `src/components/layout/GNB.tsx` | 수정 |
| T10-3-a: PM2 설정 파일 | `domain-dictionary/ecosystem.config.js` | 신규 생성 |
| T10-3-b: 배포 가이드 | `docs/deploy/README.md` | 신규 생성 |
| T10-3-c: 프로덕션 환경변수 예시 | `docs/deploy/env.example` | 신규 생성 |
| T10-4: 사용자 가이드 | `docs/user-guide.md` | 신규 생성 |

---

## 태스크 목록

### Task 1: 성능 최적화 — API 응답 캐싱 (T10-1)

**Files:**
- Modify: `domain-dictionary/src/app/api/dictionary/trending/route.ts`
- Modify: `domain-dictionary/src/app/api/mail/status/route.ts`

#### 1-a. trending API에 `revalidate: 300` 적용

빈도 트렌드 상위 10개 용어는 새로운 메일이 배치 분석되기 전까지 변경되지 않는다.
Next.js Route Segment Config의 `revalidate` 옵션으로 300초(5분) ISR 캐싱을 적용한다.

**Step 1: `revalidate` 상수 추가**

`domain-dictionary/src/app/api/dictionary/trending/route.ts` 파일 상단에 다음 라인을 추가한다.
`export const runtime = 'nodejs';` 바로 아래에 위치시킨다.

```ts
export const revalidate = 300; // 5분 캐싱
```

**Step 2: 빌드 확인**

```bash
cd domain-dictionary && npm run build
```

예상: 빌드 성공, `trending` route에 `(ISR: 300 Seconds)` 표시

**Step 3: Commit**

```bash
git add domain-dictionary/src/app/api/dictionary/trending/route.ts
git commit -m "perf: trending API에 ISR 5분 캐싱 적용"
```

---

#### 1-b. status API에 `revalidate: 60` 적용

서비스 상태 API는 스케줄러 상태·마지막 실행 시간을 반환하므로, 60초 캐싱으로 빈번한 DB 조회를 줄인다.

**Step 1: `revalidate` 상수 추가**

`domain-dictionary/src/app/api/mail/status/route.ts` 파일 상단에 다음 라인을 추가한다.
`export const runtime = 'nodejs';` 바로 아래에 위치시킨다.

```ts
export const revalidate = 60; // 1분 캐싱
```

**Step 2: 빌드 확인**

```bash
cd domain-dictionary && npm run build
```

예상: 빌드 성공

**Step 3: Commit**

```bash
git add domain-dictionary/src/app/api/mail/status/route.ts
git commit -m "perf: 서비스 상태 API에 ISR 1분 캐싱 적용"
```

---

### Task 2: 보안 최종 점검 및 강화 (T10-2)

**Files:**
- Modify: `domain-dictionary/src/app/api/auth/login/route.ts`
- Modify: `domain-dictionary/next.config.ts`
- Modify: `domain-dictionary/.env.local.example`

#### 2-a. 로그인 API rate limiting 구현

IP당 5회/분 제한을 메모리 Map으로 구현한다. 외부 패키지 없이 모듈 레벨 Map을 사용하며,
Next.js는 Edge Runtime이 아닌 Node.js 런타임이므로 서버 메모리가 유지된다.
1분이 지나면 해당 IP의 카운트를 초기화한다.

**Step 1: rate limiting 유틸리티 생성**

신규 파일 `domain-dictionary/src/lib/auth/rate-limit.ts`를 생성한다.

```ts
// IP당 로그인 시도 횟수를 추적하는 메모리 기반 rate limiter
// 분당 최대 시도 횟수를 초과하면 true를 반환한다.

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix ms
}

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5; // IP당 최대 시도 횟수
const WINDOW_MS = 60 * 1000; // 1분

/**
 * 해당 IP의 시도 횟수를 증가시키고, 제한 초과 여부를 반환합니다.
 * @returns true면 제한 초과 (요청 거부해야 함)
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    // 첫 시도 또는 윈도우 만료 — 초기화
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;

  if (entry.count > MAX_ATTEMPTS) {
    return true;
  }

  return false;
}
```

**Step 2: login route에 rate limiting 적용**

`domain-dictionary/src/app/api/auth/login/route.ts` 파일의 `POST` 핸들러 최상단에 다음 코드를 추가한다.
`import` 블록에 `isRateLimited`를 추가하고, `POST` 함수 내 `try` 블록 시작 직후에 IP 체크 로직을 삽입한다.

추가할 import:
```ts
import { headers } from 'next/headers';
import { isRateLimited } from '@/lib/auth/rate-limit';
```

`POST` 함수 내 `try` 블록 첫 줄에 삽입:
```ts
// Rate limiting: IP당 5회/분
const headersList = await headers();
const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
if (isRateLimited(ip)) {
  return NextResponse.json(
    { success: false, message: '잠시 후 다시 시도해 주세요. (1분당 최대 5회)' },
    { status: 429 }
  );
}
```

**Step 3: 동작 확인**

`npm run dev` 실행 후, 로그인 폼에서 잘못된 비밀번호를 6회 연속 제출 → 6번째부터 429 응답 확인

**Step 4: Commit**

```bash
git add domain-dictionary/src/lib/auth/rate-limit.ts domain-dictionary/src/app/api/auth/login/route.ts
git commit -m "feat: 로그인 API rate limiting 추가 (IP당 5회/분)"
```

---

#### 2-b. 보안 헤더 추가

`next.config.ts`의 `headers()` 함수로 모든 경로에 보안 헤더를 추가한다.

**Step 1: `next.config.ts` 수정**

기존 내용을 다음으로 교체한다.

```ts
import type { NextConfig } from 'next';

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  // better-sqlite3 네이티브 모듈 서버 전용 처리
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    // TLS 인증서 문제 해결 (Google Fonts 로드)
    turbopackUseSystemTlsCerts: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

**Step 2: 헤더 확인**

`npm run dev` 실행 후, 브라우저 개발자 도구 Network 탭에서 응답 헤더 확인:
- `x-frame-options: DENY`
- `x-content-type-options: nosniff`
- `referrer-policy: strict-origin-when-cross-origin`

**Step 3: Commit**

```bash
git add domain-dictionary/next.config.ts
git commit -m "feat: 보안 헤더 추가 (X-Frame-Options, X-Content-Type-Options 등)"
```

---

#### 2-c. `.env.local.example` 최신화

현재 프로젝트에서 사용하는 모든 환경변수가 `.env.local.example`에 반영되도록 최신화한다.

**Step 1: 현재 파일 확인 및 수정**

`domain-dictionary/.env.local.example` 파일을 다음 내용으로 교체한다.

```env
# ================================
# 메일 서버 접속 정보 (IMAP)
# ================================
MAIL_IMAP_HOST=imap.gmail.com
MAIL_IMAP_PORT=993
MAIL_USERNAME=user@example.com
MAIL_PASSWORD=your-app-password
MAIL_USE_SSL=true

# ================================
# Gemini API 설정
# ================================
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-pro

# ================================
# iron-session 암호화 키 (32자 이상 필수)
# ================================
SESSION_SECRET=change-this-to-a-random-string-at-least-32-chars

# ================================
# 관리자 초기 계정 (최초 서버 시작 시 자동 생성)
# ================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password

# ================================
# 데이터 저장 경로
# ================================
DATABASE_PATH=./data/app.db
MAIL_STORAGE_PATH=./data/mails
GLOSSARY_STORAGE_PATH=./data/terms

# ================================
# 백그라운드 작업 설정
# ================================
MAIL_CHECK_INTERVAL=3600000
```

**Step 2: Commit**

```bash
git add domain-dictionary/.env.local.example
git commit -m "docs: .env.local.example 최신화 (SESSION_SECRET, GEMINI_MODEL 추가)"
```

---

### Task 3: 배포 환경 구성 (T10-3)

**Files:**
- Create: `domain-dictionary/ecosystem.config.js`
- Create: `docs/deploy/README.md`
- Create: `docs/deploy/env.example`

#### 3-a. PM2 설정 파일 (`ecosystem.config.js`)

**Step 1: 파일 생성**

`domain-dictionary/ecosystem.config.js`를 생성한다.

```js
// PM2 프로세스 관리 설정
// 사용법: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'domain-dictionary',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
```

**Step 2: Commit**

```bash
git add domain-dictionary/ecosystem.config.js
git commit -m "feat: PM2 ecosystem.config.js 추가"
```

---

#### 3-b. 배포 가이드 (`docs/deploy/README.md`)

**Step 1: `docs/deploy/` 디렉터리 생성 및 파일 작성**

`docs/deploy/README.md`를 생성한다.

```markdown
# 배포 가이드

도메인 사전 서비스의 프로덕션 서버 배포 절차를 안내합니다.

## 사전 요건

- Node.js 18 이상
- PM2 (`npm install -g pm2`)
- Git

## 1. 소스 코드 준비

```bash
git clone <저장소 URL>
cd domain-dictionary
npm install
```

## 2. 환경변수 설정

`docs/deploy/env.example`을 참고하여 `.env.local` 파일을 생성합니다.

```bash
cp docs/deploy/env.example .env.local
# 편집기로 .env.local을 열어 실제 값 입력
```

필수 설정 항목:

| 항목 | 설명 |
|------|------|
| `MAIL_IMAP_HOST` | IMAP 서버 주소 |
| `MAIL_PASSWORD` | IMAP 계정 비밀번호 |
| `GEMINI_API_KEY` | Gemini API 키 |
| `SESSION_SECRET` | 32자 이상의 임의 문자열 |
| `ADMIN_USERNAME` | 초기 관리자 아이디 |
| `ADMIN_PASSWORD` | 초기 관리자 비밀번호 |

## 3. DB 초기화

서버 최초 실행 시 자동으로 DB 파일(`./data/app.db`)과 관리자 계정이 생성됩니다.
별도의 마이그레이션 실행이 필요 없습니다.

데이터 디렉터리가 없는 경우 자동 생성됩니다.

```bash
mkdir -p data/mails data/terms logs
```

## 4. 프로덕션 빌드

```bash
npm run build
```

빌드 성공 시 `.next/` 디렉터리가 생성됩니다.

## 5. PM2로 서버 시작

```bash
pm2 start ecosystem.config.js
pm2 save        # 재부팅 후 자동 시작 설정
pm2 startup     # 시스템 부팅 시 PM2 자동 실행 설정 (명령어 출력 후 복붙 실행)
```

서버 상태 확인:

```bash
pm2 status
pm2 logs domain-dictionary
```

## 6. 서버 재시작 / 중지

```bash
pm2 restart domain-dictionary
pm2 stop domain-dictionary
pm2 delete domain-dictionary
```

## 7. 업데이트 배포

```bash
git pull
npm install
npm run build
pm2 restart domain-dictionary
```

## 트러블슈팅

### 서버 시작 후 DB 오류

- `data/` 디렉터리 권한 확인: `chmod 755 data/`
- DB 파일이 없으면 첫 요청 시 자동 생성됩니다.

### 메일 수신이 되지 않는 경우

1. 환경설정 화면(`/settings`)에서 IMAP 설정 확인
2. "연결 테스트" 버튼으로 IMAP 서버 연결 확인
3. 로그 확인: `pm2 logs domain-dictionary`

### Gemini API 오류

- API 키가 올바른지 확인 (`GEMINI_API_KEY`)
- 모델명이 올바른지 확인 (`GEMINI_MODEL`)
- API 할당량 초과 여부 확인 (Google Cloud Console)
```

**Step 2: Commit**

```bash
git add docs/deploy/README.md
git commit -m "docs: 배포 가이드 문서 추가"
```

---

#### 3-c. 프로덕션 환경변수 예시 (`docs/deploy/env.example`)

**Step 1: 파일 생성**

`docs/deploy/env.example`을 생성한다.

```env
# ================================
# 메일 서버 접속 정보 (IMAP)
# ================================
MAIL_IMAP_HOST=imap.gmail.com
MAIL_IMAP_PORT=993
MAIL_USERNAME=user@example.com
MAIL_PASSWORD=your-app-password
MAIL_USE_SSL=true

# ================================
# Gemini API 설정
# ================================
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-pro

# ================================
# iron-session 암호화 키 (32자 이상 필수)
# openssl rand -base64 32 명령으로 생성 가능
# ================================
SESSION_SECRET=change-this-to-a-random-string-at-least-32-chars

# ================================
# 관리자 초기 계정 (최초 서버 시작 시 자동 생성)
# 서버 최초 실행 후 변경을 권장합니다
# ================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!

# ================================
# 데이터 저장 경로 (프로덕션 환경에서는 절대 경로 권장)
# ================================
DATABASE_PATH=./data/app.db
MAIL_STORAGE_PATH=./data/mails
GLOSSARY_STORAGE_PATH=./data/terms

# ================================
# 백그라운드 작업 설정
# ================================
MAIL_CHECK_INTERVAL=3600000
```

**Step 2: Commit**

```bash
git add docs/deploy/env.example
git commit -m "docs: 프로덕션 환경변수 예시 파일 추가"
```

---

### Task 4: 사용자 가이드 작성 (T10-4)

**Files:**
- Create: `docs/user-guide.md`

**Step 1: `docs/user-guide.md` 생성**

```markdown
# 도메인 사전 사용자 가이드

메일 수신 내용을 분석하여 업무 용어 해설을 자동으로 생성·관리하는 서비스입니다.

## 목차

1. [초기 설정](#초기-설정)
2. [주요 기능 사용법](#주요-기능-사용법)
3. [트러블슈팅](#트러블슈팅)

---

## 초기 설정

### 1. 관리자 로그인

서버 주소(`http://localhost:3000` 또는 배포 URL)에 접속한 후,
서버 시작 시 설정한 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 환경변수 값으로 로그인합니다.

### 2. 메일 서버 설정

로그인 후 **환경설정** 메뉴로 이동하여 IMAP 정보를 입력합니다.

| 항목 | 설명 | 예시 |
|------|------|------|
| IMAP 호스트 | 메일 서버 주소 | `imap.gmail.com` |
| IMAP 포트 | 포트 번호 (SSL: 993) | `993` |
| 아이디 | 메일 계정 아이디 | `user@example.com` |
| SSL/TLS | 보안 연결 여부 | 켜기 권장 |
| 메일 확인 주기 | 자동 확인 간격 (분) | `60` |

> **Gmail 사용 시:** 앱 비밀번호를 생성하여 서버의 `.env.local` 파일에 `MAIL_PASSWORD` 값으로 설정합니다.
> 앱 비밀번호 생성: Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호

**연결 테스트** 버튼으로 설정이 올바른지 확인한 후 저장합니다.

### 3. AI 분석 설정 확인

환경설정 화면에서 AI 분석 API 키 상태가 **설정됨**으로 표시되면 준비 완료입니다.
API 키는 서버의 `.env.local` 파일에 `GEMINI_API_KEY`로 설정합니다.

### 4. 사용자 계정 추가 (선택)

**사용자 관리** 메뉴에서 추가 사용자를 등록할 수 있습니다.
일반 사용자(`user` 역할)는 대시보드와 용어사전 조회만 가능합니다.

---

## 주요 기능 사용법

### 대시보드

서비스 상태와 최신 분석 결과를 한눈에 확인할 수 있습니다.

- **서비스 상태 카드**: 스케줄러 실행 상태, IMAP·API 키 설정 상태, 마지막 실행 시간
- **최신 분석 결과**: 가장 최근에 분석된 메일의 요약·후속 작업·추출 용어
- **분석 이력**: 모든 분석 결과 목록 (상태: 완료/실패/처리 중/대기)
- **메일 확인 실행** (관리자 전용): 스케줄 주기를 기다리지 않고 즉시 메일 수신 및 분석 시작

### 업무지원 상세

분석 이력 항목을 클릭하면 해당 메일의 상세 분석 결과를 볼 수 있습니다.

- **메일 요약**: 핵심 내용 500자 이내 요약
- **후속 작업**: AI가 제안하는 액션 아이템 (최대 5개)
- **추출 용어**: 메일에서 추출된 업무 용어 태그 목록 (클릭 시 용어 상세로 이동)

### 용어사전

추출된 업무 용어를 검색하고 해설을 조회합니다.

- **검색**: 용어명으로 실시간 검색 (0.3초 디바운스)
- **카테고리 필터**: EMR / 비즈니스 / 약어 / 일반 분류별 필터
- **빈도 트렌드**: 가장 많이 등장한 상위 10개 용어 바로가기
- **용어 상세**: 용어 해설 전문과 해당 용어가 등장한 출처 메일 목록

---

## 트러블슈팅

### 메일이 자동으로 분석되지 않는 경우

1. 대시보드에서 스케줄러 상태가 **실행 중**인지 확인합니다.
2. IMAP 및 API 키 설정이 **설정됨** 상태인지 확인합니다.
3. 환경설정 화면에서 메일 확인 주기가 올바른지 확인합니다.
4. **메일 확인 실행** 버튼으로 수동 실행을 시도합니다.

### 분석 이력이 `실패` 상태로 표시되는 경우

- **IMAP 연결 실패**: 환경설정에서 IMAP 설정을 다시 확인하고 연결 테스트를 실행합니다.
- **AI 분석 실패**: Gemini API 키와 모델명이 올바른지 확인합니다. API 할당량을 초과했을 수 있습니다.
- 실패한 항목은 다음 스케줄 주기에 자동으로 재시도됩니다 (최대 3회).

### 용어사전에 용어가 없는 경우

메일 분석이 완료되어야 용어가 등록됩니다. 대시보드에서 분석 완료(`completed`) 상태의 이력이 있는지 확인합니다.

### 로그인이 되지 않는 경우

- 아이디/비밀번호를 다시 확인합니다.
- 1분에 5회 이상 시도하면 자동으로 1분간 차단됩니다. 잠시 후 다시 시도하세요.

### 파일 동기화 오류 (용어 파일 누락)

`data/terms/` 디렉터리의 용어 파일이 DB와 불일치하는 경우,
관리자 API를 통해 동기화할 수 있습니다:

```bash
curl -X POST http://localhost:3000/api/admin/sync-terms \
  -H "Cookie: <로그인 후 세션 쿠키>"
```
```

**Step 2: Commit**

```bash
git add docs/user-guide.md
git commit -m "docs: 사용자 가이드 문서 추가"
```

---

### Task 5: 기술 부채 정리 (T10-5)

**Files:**
- Modify: `domain-dictionary/src/app/api/admin/sync-terms/route.ts`
- Modify: `domain-dictionary/src/components/layout/GNB.tsx`

#### 5-a. `sync-terms/route.ts` 중복 함수 제거

현재 `sync-terms/route.ts`에는 `toSafeFileName`, `buildGlossaryMarkdown` 함수가 `dictionary-store.ts`와 동일하게 중복 정의되어 있다.
또한 `fs.existsSync`를 직접 사용하고 있어 `file-manager.ts`의 `fileExists()`와 일관성이 없다.
`dictionary-store.ts`에서 `buildGlossaryMarkdown`을 export하도록 수정하고, `sync-terms/route.ts`에서 import하여 사용한다.

**Step 1: `dictionary-store.ts`에서 `buildGlossaryMarkdown` export 추가**

`domain-dictionary/src/lib/dictionary/dictionary-store.ts` 파일에서 `buildGlossaryMarkdown` 함수의 선언을
`function buildGlossaryMarkdown(` 에서 `export function buildGlossaryMarkdown(`로 변경한다.

**Step 2: `sync-terms/route.ts` 리팩토링**

`domain-dictionary/src/app/api/admin/sync-terms/route.ts` 파일 전체를 다음 내용으로 교체한다.

```ts
import path from 'path';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { terms } from '@/db/schema';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { writeFile, fileExists } from '@/lib/fs/file-manager';
import { toSafeFileName, buildGlossaryMarkdown } from '@/lib/dictionary/dictionary-store';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const GLOSSARY_DIR = process.env.GLOSSARY_STORAGE_PATH ?? './data/terms';

// DATA-DICT-002: DB-파일 동기화 (파일 없는 용어 재생성)
export async function POST() {
  const sessionOrResponse = await requireAdmin();
  if (isNextResponse(sessionOrResponse)) return sessionOrResponse;

  try {
    const allTerms = db.select().from(terms).all();

    let synced = 0;
    let skipped = 0;

    for (const term of allTerms) {
      const filePath = path.join(GLOSSARY_DIR, `${toSafeFileName(term.name)}.md`);
      if (!fileExists(filePath)) {
        const content = buildGlossaryMarkdown({
          name: term.name,
          category: term.category ?? 'general',
          description: term.description,
          frequency: term.frequency,
          updatedAt: term.updatedAt,
        });
        writeFile(filePath, content);
        synced++;
      } else {
        skipped++;
      }
    }

    logger.info('[api/admin/sync-terms] 동기화 완료', { synced, skipped, total: allTerms.length });

    return NextResponse.json({
      success: true,
      data: { total: allTerms.length, synced, skipped },
    });
  } catch (err) {
    logger.error('[api/admin/sync-terms] 오류', { error: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

**Step 3: 빌드 확인**

```bash
cd domain-dictionary && npm run build
```

예상: 빌드 성공, TypeScript 오류 없음

**Step 4: Commit**

```bash
git add domain-dictionary/src/lib/dictionary/dictionary-store.ts domain-dictionary/src/app/api/admin/sync-terms/route.ts
git commit -m "refactor: sync-terms 중복 함수 제거 및 dictionary-store에서 import로 통일"
```

---

#### 5-b. GNB에서 불필요한 `role="list"/"listitem"` 제거

`nav` 요소 내부에 `role="list"` / `role="listitem"`은 불필요하다.
`<nav>`는 이미 랜드마크 역할을 하므로 내부 링크에 별도 list role이 필요하지 않다.

**Step 1: GNB.tsx 수정**

`domain-dictionary/src/components/layout/GNB.tsx` 파일에서 다음 속성들을 모두 제거한다:

- `role="list"` (데스크탑 nav div, 모바일 드롭다운 div)
- `role="listitem"` (각 Link 컴포넌트)

제거 대상 속성 위치:
- 52번째 줄 부근: `<div className="hidden md:flex items-center gap-1" role="list">`  → `role="list"` 제거
- 53, 56, 62, 64번째 줄 부근: Link 태그의 `role="listitem"` 제거
- 107번째 줄 부근: `<div id="mobile-menu" ... role="list">` → `role="list"` 제거
- 108, 111, 116, 119번째 줄 부근: Link 태그의 `role="listitem"` 제거

**Step 2: 빌드 및 접근성 확인**

```bash
cd domain-dictionary && npm run build && npm run lint
```

예상: 빌드 성공, lint 오류 없음

**Step 3: Commit**

```bash
git add domain-dictionary/src/components/layout/GNB.tsx
git commit -m "fix: GNB에서 불필요한 role=list/listitem ARIA 속성 제거"
```

---

## 완료 기준 (Definition of Done)

| 항목 | 확인 방법 |
|------|-----------|
| ⬜ `GET /api/dictionary/trending` 빌드 결과에 `revalidate: 300` 적용 확인 | `npm run build` 출력 |
| ⬜ `GET /api/mail/status` 빌드 결과에 `revalidate: 60` 적용 확인 | `npm run build` 출력 |
| ⬜ 로그인 API 1분 5회 초과 시 429 응답 반환 | 브라우저/curl 테스트 |
| ⬜ 응답 헤더에 `X-Frame-Options: DENY` 포함 | 개발자 도구 Network 탭 |
| ⬜ `.env.local.example`에 `SESSION_SECRET` 항목 존재 | 파일 내용 확인 |
| ⬜ `sync-terms/route.ts`에 `toSafeFileName`, `buildGlossaryMarkdown` 로컬 정의 없음 | 코드 리뷰 |
| ⬜ `sync-terms/route.ts`에 `fs.existsSync` 직접 사용 없음 | 코드 리뷰 |
| ⬜ GNB에 `role="list"/"listitem"` 없음 | 코드 리뷰 |
| ⬜ `ecosystem.config.js` 생성 완료 | 파일 존재 확인 |
| ⬜ `docs/deploy/README.md` 생성 완료 | 파일 존재 확인 |
| ⬜ `docs/deploy/env.example` 생성 완료 | 파일 존재 확인 |
| ⬜ `docs/user-guide.md` 생성 완료 | 파일 존재 확인 |
| ⬜ `npm run build` 에러 없이 완료 | 빌드 명령 실행 |
| ⬜ `npm run lint` 에러 없음 | lint 명령 실행 |

---

## 배포 전략

### 자동 실행 항목

- ✅ `npm run build` — 프로덕션 빌드 성공 여부 확인
- ✅ `npm run lint` — 코드 스타일 검증

### 수동 실행 필요 항목

- ⬜ **프로덕션 환경 앱 실행**: `npm run build` 후 `npm start` 또는 `pm2 start ecosystem.config.js`
  - 이유: 서버 환경 변수 및 실행 환경이 개발 환경과 다를 수 있음
- ⬜ **E2E 시나리오 검증**: 아래 Playwright 검증 시나리오 참고

---

## Playwright MCP 검증 시나리오

> 프로덕션 빌드 후 `npm start` 실행 상태에서 아래 순서로 검증

### 전체 E2E 흐름 검증

1. `browser_navigate` → `http://localhost:3000/login`
2. `browser_fill_form` → 관리자 아이디/비밀번호 입력
3. `browser_click` → 로그인
4. `browser_network_requests` → `POST /api/auth/login` 200 응답 확인
5. `browser_navigate` → `http://localhost:3000/settings`
6. `browser_snapshot` → 환경설정 화면 정상 렌더링 확인
7. `browser_navigate` → `http://localhost:3000/`
8. `browser_snapshot` → 대시보드 정상 렌더링 확인
9. `browser_navigate` → `http://localhost:3000/dictionary`
10. `browser_type` → 검색어 입력
11. `browser_snapshot` → 검색 결과 확인
12. `browser_navigate` → `http://localhost:3000/admin/users`
13. `browser_snapshot` → 사용자 관리 화면 확인

### 보안 헤더 검증

14. `browser_navigate` → `http://localhost:3000/`
15. `browser_network_requests` → `X-Frame-Options: DENY` 헤더 존재 확인

### Rate Limiting 검증

16. `browser_navigate` → `http://localhost:3000/login`
17. `browser_fill_form` → 잘못된 비밀번호로 6회 연속 제출
18. `browser_snapshot` → "잠시 후 다시 시도해 주세요" 메시지 표시 확인

### 공통 검증

19. `browser_console_messages(level: "error")` → 콘솔 에러 없음 확인
20. `browser_network_requests` → 모든 API 호출 2xx 확인

---

## 예상 산출물

| 산출물 | 경로 |
|--------|------|
| Rate limiting 유틸리티 | `domain-dictionary/src/lib/auth/rate-limit.ts` |
| PM2 설정 파일 | `domain-dictionary/ecosystem.config.js` |
| 배포 가이드 | `docs/deploy/README.md` |
| 프로덕션 환경변수 예시 | `docs/deploy/env.example` |
| 사용자 가이드 | `docs/user-guide.md` |
| 수정 파일 | `trending/route.ts`, `status/route.ts`, `login/route.ts`, `next.config.ts`, `.env.local.example`, `sync-terms/route.ts`, `GNB.tsx`, `dictionary-store.ts` |
