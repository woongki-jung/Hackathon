# Sprint 3: GNB + 환경설정 화면/API + 사용자 관리

- **기간**: 2026-03-15 ~ 2026-03-28 (2주)
- **브랜치**: sprint3
- **상태**: ✅ 완료 (2026-03-15)

---

## 스프린트 목표

Sprint 2 이월 태스크(사용자 관리 API/화면, 공통 레이아웃)와 Sprint 3 신규 태스크(GNB, 토스트 시스템, 환경설정 API/화면)를 통합 구현하여 Phase 2의 관리자 UI 기반을 완성한다. 이 스프린트가 완료되면 관리자가 GNB를 통해 사이트를 탐색하고, 환경설정을 저장하며, 사용자 계정을 관리할 수 있다.

---

## 구현 범위

### 포함

- **T3-1 + T2-8**: GNB (Global Navigation Bar) 구현 + 공통 레이아웃 기초 흡수
- **T3-2**: 토스트 알림 시스템 (Context API 기반 전역 상태)
- **T3-3**: 환경설정 관리 서비스 (`app_settings` 테이블 CRUD)
- **T3-4**: 환경설정 API (CFG-001, CFG-002, CFG-003)
- **T3-5**: 환경설정 화면 (SET-001, `/settings`)
- **T2-6 이월**: 사용자 관리 API (USER-001, USER-002, USER-003)
- **T2-7 이월**: 사용자 관리 화면 (ADMIN-001, `/admin/users`)

### 제외

- 대시보드 화면 기능 고도화 → Sprint 4
- 메일 수신/분석 파이프라인 → Sprint 5~6

---

## 구현 파일 목록

### 생성 파일

| 파일 | 태스크 | 설명 |
|------|--------|------|
| `src/components/ui/Toast.tsx` | T3-2 | 토스트 UI 컴포넌트 |
| `src/lib/toast/toast-context.tsx` | T3-2 | 전역 토스트 Context + Provider + 훅 |
| `src/components/layout/GNB.tsx` | T3-1 | GNB 서버 컴포넌트 (역할별 메뉴 분기) |
| `src/lib/auth/require-admin.ts` | T3-1 | 관리자 권한 검사 유틸리티 |
| `src/lib/config/settings-service.ts` | T3-3 | app_settings 테이블 CRUD 서비스 |
| `src/lib/validators/config.ts` | T3-4 | 환경설정 입력값 유효성 검사 함수 |
| `src/app/api/config/route.ts` | T3-4 | CFG-001 GET, CFG-002 PUT |
| `src/app/api/config/test-mail/route.ts` | T3-4 | CFG-003 POST (IMAP 연결 테스트) |
| `src/lib/validators/user.ts` | T2-6 | 사용자 등록 유효성 검사 함수 |
| `src/app/api/users/route.ts` | T2-6 | USER-001 GET, USER-002 POST |
| `src/app/api/users/[id]/route.ts` | T2-6 | USER-003 DELETE |
| `src/app/(authenticated)/settings/page.tsx` | T3-5 | 환경설정 화면 (admin 전용) |
| `src/app/(authenticated)/admin/users/page.tsx` | T2-7 | 사용자 관리 화면 (admin 전용) |

### 수정 파일

| 파일 | 태스크 | 변경 내용 |
|------|--------|-----------|
| `src/app/(authenticated)/layout.tsx` | T3-1, T3-2 | ToastProvider 래핑 + GNB 컴포넌트 추가 |

---

## 태스크 상세

### T3-2: 토스트 알림 시스템

**우선순위**: 1번 (다른 화면에서 공통으로 사용)

**구현 파일:**
- 생성: `src/components/ui/Toast.tsx`
- 생성: `src/lib/toast/toast-context.tsx`

**Toast.tsx 컴포넌트 구조:**

```tsx
// 토스트 타입 정의
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

// Toast UI: 화면 우상단 고정, 3초 자동 사라짐 (UI-R-020)
// 색상: success=녹색, error=빨간색, info=파란색, warning=주황색
// z-index: z-50 (최상단 레이어)
```

**toast-context.tsx 구조:**

```tsx
interface ToastContextValue {
  showToast: (message: string, type: ToastType) => void;
}

// Context 생성 + ToastProvider (ToastItem 배열 상태 관리)
// useToast() 훅 export
// 각 토스트는 3000ms 후 자동 제거 (setTimeout)
// 여러 토스트 동시 표시 지원 (stacked)
```

**완료 기준:**
- ✅ `useToast().showToast('메시지', 'success')` 호출 시 우상단에 토스트 표시
- ✅ 3초 후 자동으로 사라짐
- ✅ 여러 토스트가 동시에 쌓여 표시됨

---

### T3-1 + T2-8: GNB + 공통 레이아웃

**우선순위**: 2번 (모든 인증 후 화면의 기반)

**구현 파일:**
- 생성: `src/components/layout/GNB.tsx`
- 생성: `src/lib/auth/require-admin.ts`
- 수정: `src/app/(authenticated)/layout.tsx`

**require-admin.ts 구조:**

```ts
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionOptions, type SessionData } from '@/lib/auth/session';

// 세션에서 현재 사용자 정보를 가져오는 함수
export async function getSessionUser(): Promise<SessionData | null>

// 관리자 권한 검사: admin이 아니면 /dashboard로 redirect
export async function requireAdmin(): Promise<SessionData>
```

**GNB.tsx 구조 (Server Component):**

```tsx
// getSessionUser()로 현재 사용자 정보 조회
// 메뉴 구성:
//   - 대시보드 (항상)
//   - 용어사전 (항상)
//   - 환경설정 (role === 'admin'만)
//   - 사용자 관리 (role === 'admin'만)
// 우측: 현재 사용자명 + 역할 뱃지 + 로그아웃 버튼
// 현재 경로 하이라이트: usePathname() (Client Component 래퍼 필요)
// 반응형: md(768px) 미만 햄버거 메뉴 전환 (useState로 토글)
```

**GNB 링크 경로 매핑:**

| 메뉴 | 경로 | 표시 조건 |
|------|------|-----------|
| 대시보드 | `/dashboard` | 항상 |
| 용어사전 | `/dictionary` | 항상 |
| 환경설정 | `/settings` | admin만 |
| 사용자 관리 | `/admin/users` | admin만 |

**layout.tsx 수정 내용:**

```tsx
// 변경 전: children만 렌더링하는 패스스루 레이아웃
// 변경 후:
import { ToastProvider } from '@/lib/toast/toast-context';
import { GNB } from '@/components/layout/GNB';

export default function AuthenticatedLayout({ children }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <GNB />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
```

**완료 기준:**
- ✅ 모든 인증 후 화면에서 GNB가 표시됨
- ✅ admin 로그인 시 환경설정, 사용자 관리 메뉴가 보임
- ✅ user 로그인 시 환경설정, 사용자 관리 메뉴가 숨겨짐
- ✅ 현재 경로에 해당하는 메뉴 항목이 하이라이트됨
- ✅ 360px 화면에서 햄버거 메뉴 아이콘이 표시되고, 클릭 시 메뉴 펼쳐짐
- ✅ 로그아웃 버튼 클릭 시 `/login`으로 이동

---

### T3-3: 환경설정 관리 서비스

**우선순위**: 3번 (T3-4 API의 의존성)

**구현 파일:**
- 생성: `src/lib/config/settings-service.ts`

**app_settings 테이블 키 목록:**

| 설정 키 | 타입 | 설명 |
|---------|------|------|
| `mail.imap.host` | string | IMAP 서버 호스트 |
| `mail.imap.port` | number | IMAP 서버 포트 |
| `mail.imap.username` | string | IMAP 로그인 아이디 |
| `mail.imap.use_ssl` | boolean | SSL/TLS 사용 여부 |
| `mail.check_interval` | number | 메일 확인 주기 (ms) |
| `analysis.model` | string | AI 모델명 |

**settings-service.ts 함수 목록:**

```ts
// 단일 설정 조회 (없으면 null)
export function getSetting(key: string): string | null

// 다수 설정 일괄 조회
export function getSettings(keys: string[]): Record<string, string | null>

// 단일 설정 저장 (upsert)
export function setSetting(key: string, value: string): void

// 다수 설정 일괄 저장
export function setSettings(entries: Record<string, string>): void

// 전체 환경설정 조회 (CFG-001 응답 형식)
export function getAllConfig(): ConfigData

// 환경설정 일괄 수정 (CFG-002 요청 처리)
export function updateConfig(input: Partial<ConfigInput>): ConfigData
```

**ConfigData 타입 (CFG-001/CFG-002 응답 형식):**

```ts
interface ConfigData {
  mail: {
    imapHost: string | null;
    imapPort: number | null;
    imapUsername: string | null;
    useSsl: boolean;
    checkInterval: number;
    passwordConfigured: boolean; // process.env.MAIL_PASSWORD 존재 여부
  };
  analysis: {
    model: string | null;
    apiKeyConfigured: boolean; // process.env.GEMINI_API_KEY 존재 여부
  };
}
```

> 주의: api_config.md의 `analysis.apiKeyConfigured`는 `ANTHROPIC_API_KEY`로 정의되어 있으나,
> 실제 구현에서는 Gemini API를 사용하므로 `GEMINI_API_KEY` 환경변수 존재 여부를 확인한다.

**완료 기준:**
- ✅ `setSetting` 호출 후 `getSetting`으로 동일 값 조회 가능
- ✅ `getAllConfig` 반환값에 `passwordConfigured`, `apiKeyConfigured` boolean 포함

---

### T2-6 이월: 사용자 관리 API

**우선순위**: 4번

**구현 파일:**
- 생성: `src/lib/validators/user.ts`
- 생성: `src/app/api/users/route.ts`
- 생성: `src/app/api/users/[id]/route.ts`

**validators/user.ts 구조:**

```ts
// 아이디 유효성 검사 (AUTH-R-003): 4~20자, 영소문자/숫자/_
// auth.ts의 validateUsername() 재사용

// 비밀번호 유효성 검사 (AUTH-R-005, AUTH-R-006): 8자+, 영문+숫자+특수문자
// auth.ts의 validatePassword() 재사용

// 역할 유효성 검사: "admin" | "user"
export function validateRole(role: unknown): string | null
```

**route.ts (GET, POST /api/users) 구조:**

```ts
export const runtime = 'nodejs';

// GET: 사용자 목록 조회 (USER-001)
// - requireAdmin() 호출: admin이 아니면 403
// - deletedAt IS NULL 조건으로 조회
// - passwordHash 필드 제외하여 반환
// - 응답: { success: true, data: { items: [...] } }

// POST: 사용자 등록 (USER-002)
// - requireAdmin() 호출
// - username, password 필수 검증
// - validateUsername(), validatePassword() 호출
// - username 중복 확인 (409 CONFLICT)
// - bcrypt.hash(password, 10) 후 DB 저장
// - 응답: 201, { success: true, data: { id, username, role, isActive, createdAt }, message }
```

**[id]/route.ts (DELETE /api/users/:id) 구조:**

```ts
export const runtime = 'nodejs';

// DELETE: 사용자 소프트 삭제 (USER-003)
// - requireAdmin() 호출
// - 자기 자신 삭제 시도 시 400
// - 대상 사용자 조회: 없거나 이미 삭제 시 404
// - deletedAt = datetime('now'), updatedAt 갱신
// - 응답: { success: true, data: null, message: '사용자가 삭제되었습니다.' }
```

**완료 기준:**
- ✅ `GET /api/users` 호출 시 소프트 삭제된 사용자 제외한 목록 반환
- ✅ `POST /api/users`로 사용자 등록 후 목록에 나타남
- ✅ 중복 아이디 등록 시 409 반환
- ✅ `DELETE /api/users/:id` 호출 후 목록에서 사라짐
- ✅ 자기 자신 삭제 시 400 반환
- ✅ 일반 사용자(user role)가 API 호출 시 403 반환

---

### T3-4: 환경설정 API

**우선순위**: 5번

**구현 파일:**
- 생성: `src/lib/validators/config.ts`
- 생성: `src/app/api/config/route.ts`
- 생성: `src/app/api/config/test-mail/route.ts`

**validators/config.ts 구조:**

```ts
interface ConfigInput {
  mail?: {
    imapHost?: string;
    imapPort?: number;
    imapUsername?: string;
    useSsl?: boolean;
    checkInterval?: number;
  };
  analysis?: {
    model?: string;
  };
}

// 유효성 검사 결과 타입
interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}

// CFG-002 요청 본문 유효성 검사
// - imapHost: 빈 문자열 불가
// - imapPort: 1~65535 범위 정수
// - checkInterval: 최소 60000 (1분)
// - model: 빈 문자열 불가
export function validateConfigInput(input: ConfigInput): ValidationResult
```

**config/route.ts (GET, PUT /api/config) 구조:**

```ts
export const runtime = 'nodejs';

// GET: CFG-001
// - requireAdmin() 호출
// - getAllConfig() 호출하여 반환
// - 응답: { success: true, data: ConfigData }

// PUT: CFG-002
// - requireAdmin() 호출
// - validateConfigInput() 검사
// - updateConfig() 호출
// - 응답: { success: true, data: ConfigData, message: '설정이 저장되었습니다.' }
```

**config/test-mail/route.ts (POST /api/config/test-mail) 구조:**

```ts
export const runtime = 'nodejs';

// POST: CFG-003
// - requireAdmin() 호출
// - DB에서 IMAP 설정 조회 (imapHost, imapPort 미설정 시 400)
// - imapflow로 연결 테스트 (10초 타임아웃)
// - 연결 성공: unseenCount 포함 응답
// - 연결 실패: connected: false, error 메시지 포함 200 응답
// - imapflow 의존: 이미 package.json에 포함 여부 확인 필요
```

> imapflow는 Sprint 5에서 설치 예정이나, test-mail API에서 미리 사용한다.
> 패키지 설치 여부를 먼저 확인하고, 없으면 `npm install imapflow` 실행 후 구현한다.

**완료 기준:**
- ✅ `GET /api/config` 응답에 민감정보(비밀번호, API 키) 미포함
- ✅ `PUT /api/config`로 설정 저장 후 GET 재조회 시 변경 값 반영
- ✅ 잘못된 포트(0, 99999) 전송 시 400 반환
- ✅ `POST /api/config/test-mail` - IMAP 미설정 시 400 반환

---

### T3-5: 환경설정 화면

**우선순위**: 6번

**구현 파일:**
- 생성: `src/app/(authenticated)/settings/page.tsx`

**페이지 구조 (Client Component):**

```tsx
'use client';

// 초기 렌더링: GET /api/config 호출 → 폼 초기값 설정
// 상태:
//   - settings: ConfigData (서버에서 받은 현재 값)
//   - formData: 사용자가 입력 중인 값
//   - isDirty: formData !== settings (변경 감지)
//   - isSaving: 저장 API 호출 중
//   - isTesting: 연결 테스트 API 호출 중
//   - errors: 필드별 유효성 오류

// admin 권한 없는 경우: 권한 없음 안내 UI 표시 (redirect 대신 인라인 처리)
// - GET /api/config에서 403 응답 시 "관리자 권한이 필요합니다." 메시지 + 대시보드 링크
```

**화면 레이아웃:**

```
[페이지 제목: 환경설정]
[부제: 메일 서버 및 분석 설정을 관리합니다.]

[섹션: 메일 서버 (IMAP)]
  IMAP 호스트: [input]
  IMAP 포트: [input number]
  IMAP 아이디: [input]
  SSL/TLS 사용: [toggle]
  비밀번호 상태: [뱃지 - 설정됨/미설정]
  비밀번호 안내: "비밀번호는 서버의 .env.local 파일에서 직접 설정해주세요."
  메일 확인 주기: [input number] 분
  [연결 테스트 버튼]

[섹션: AI 분석]
  모델명: [input]
  API 키 상태: [뱃지 - 설정됨/미설정]
  API 키 안내: "API 키는 서버의 .env.local 파일에서 직접 설정해주세요."

[저장 버튼] [변경 취소 버튼 - isDirty일 때만 표시]
```

**주요 동작:**
- 연결 테스트 버튼: `isDirty`가 true이면 "먼저 설정을 저장해주세요." 토스트 표시
- 저장 성공: `useToast().showToast('설정이 저장되었습니다.', 'success')`
- 저장 실패: `useToast().showToast(에러메시지, 'error')`
- 연결 테스트 성공: `showToast('메일 서버 연결에 성공했습니다. (읽지 않은 메일: N건)', 'success')`
- 연결 테스트 실패: `showToast('메일 서버 연결에 실패했습니다. 설정을 확인해주세요.', 'error')`
- 메일 확인 주기: DB 저장 단위는 ms, 화면 표시 단위는 분 (변환 처리 필요)

**완료 기준:**
- ✅ 화면 진입 시 현재 설정값이 폼에 표시됨
- ✅ 설정 저장 시 성공 토스트 표시
- ✅ 저장 중 버튼 로딩 상태로 전환
- ✅ 변경 후 취소 시 원래 값으로 복원
- ✅ 비밀번호/API 키가 API 응답에 없고, 설정 여부만 뱃지로 표시

---

### T2-7 이월: 사용자 관리 화면

**우선순위**: 7번

**구현 파일:**
- 생성: `src/app/(authenticated)/admin/users/page.tsx`

**페이지 구조 (Client Component):**

```tsx
'use client';

// 초기 렌더링: GET /api/users 호출 → 사용자 목록 표시
// 상태:
//   - users: UserItem[]
//   - showRegisterForm: boolean (등록 폼 표시 여부)
//   - isSubmitting: boolean (등록 API 호출 중)
//   - deletingId: string | null (삭제 중인 사용자 ID)
//   - formData: { username, password, confirmPassword, role }
//   - formErrors: 필드별 유효성 오류
```

**화면 레이아웃:**

```
[페이지 제목: 사용자 관리] [사용자 등록 버튼]

[사용자 목록 테이블]
  아이디 | 역할 | 상태 | 등록일 | 액션
  -------|------|------|--------|------
  admin  | admin뱃지 | 활성뱃지 | 2026-03-01 | (삭제 비활성 - 자기 자신)
  user1  | user뱃지  | 활성뱃지 | 2026-03-05 | [삭제 아이콘 버튼]

[사용자 등록 폼 - showRegisterForm일 때]
  새 사용자 등록
  아이디: [input]
  비밀번호: [input password]
  비밀번호 확인: [input password]
  역할: [select - 일반 사용자 / 관리자]
  [등록 버튼] [취소 버튼]
```

**주요 동작:**
- 삭제 버튼 클릭: `window.confirm('${username} 사용자를 삭제하시겠습니까?...')` 확인 후 API 호출
- 자기 자신 행: 삭제 버튼 비활성화 (`session.userId === user.id`)
- 등록 성공: `showToast('사용자가 등록되었습니다.', 'success')` + 목록 재조회 + 폼 닫기
- 삭제 성공: `showToast('사용자가 삭제되었습니다.', 'success')` + 목록에서 제거
- 중복 아이디(409): 폼 내 "이미 존재하는 아이디입니다." 오류 표시
- 날짜 형식: "YYYY-MM-DD HH:mm" (UI-R-015)

> 현재 로그인 사용자 확인 방법: `GET /api/auth/me` 호출 또는 세션 정보를 Context로 관리.
> 이 스프린트에서는 페이지 마운트 시 `/api/auth/me`를 호출하여 현재 userId를 조회한다.

**완료 기준:**
- ✅ 사용자 목록이 테이블로 표시됨
- ✅ 사용자 등록 후 목록에 즉시 반영
- ✅ 사용자 삭제 후 목록에서 즉시 제거
- ✅ 자기 자신의 삭제 버튼이 비활성화됨
- ✅ 일반 사용자가 접근 시 권한 없음 안내 표시

---

## 기술적 접근 방법

### 인증 가드 패턴

모든 admin 전용 API와 화면에서 `require-admin.ts`를 사용하는 일관된 패턴을 따른다.

```ts
// API Route 예시
export async function GET() {
  const session = await requireAdmin(); // admin 아니면 403 반환
  // ... 비즈니스 로직
}
```

```tsx
// Page 예시 (admin 전용 화면)
// 방법 1: 서버에서 API 호출하여 403이면 리다이렉트
// 방법 2: 클라이언트에서 403 응답 시 인라인 권한 없음 UI 표시
// → 이 스프린트에서는 방법 2 사용 (클라이언트 처리 일관성)
```

### 환경설정 ms/분 변환

```ts
// DB 저장: ms 단위
// 화면 표시: 분 단위 (checkInterval / 60000)
// 화면 입력 → DB 저장: 분 × 60000
```

### GNB의 서버/클라이언트 분리

GNB는 세션 정보를 가져오는 부분은 Server Component로, 현재 경로 하이라이트와 햄버거 메뉴 토글은 Client Component로 분리한다.

```tsx
// GNB.tsx (Server Component)
//   └── GNBClient.tsx (Client Component - 'use client')
//         └── usePathname()으로 현재 경로 확인
//         └── useState로 햄버거 메뉴 토글
```

---

## 의존성 및 리스크

### 의존성

| 태스크 | 선행 조건 |
|--------|-----------|
| T3-1 (GNB) | T3-2 (ToastProvider가 layout에 먼저 있어야 GNB 로그아웃 버튼에서 토스트 사용 가능) |
| T3-4 (환경설정 API) | T3-3 (settings-service.ts) |
| T3-5 (환경설정 화면) | T3-2 (토스트), T3-4 (API), T3-1 (GNB 레이아웃) |
| T2-7 (사용자 관리 화면) | T3-2 (토스트), T2-6 (API), T3-1 (GNB 레이아웃) |

### 리스크

| 리스크 | 가능성 | 대응 방안 |
|--------|--------|-----------|
| imapflow 패키지 미설치 | 중 | CFG-003 구현 전 `npm list imapflow` 확인, 없으면 설치 |
| GNB Server/Client 분리 복잡도 | 중 | GNBClient 래퍼 컴포넌트로 단순화 |
| dashboard 페이지 레이아웃 충돌 | 낮음 | 기존 `min-h-screen` 스타일을 layout으로 이동 |

---

## 완료 기준 (Definition of Done)

- ✅ 모든 인증 후 화면에서 GNB가 표시되며, 역할에 따라 메뉴가 다르게 보임
- ✅ 모바일(360px)에서 햄버거 메뉴가 정상 동작함
- ✅ 토스트 알림이 성공/오류/정보 타입별로 우상단에 3초간 표시됨
- ✅ 관리자가 환경설정 화면에서 IMAP 설정을 저장할 수 있음
- ✅ 메일 서버 연결 테스트 버튼이 동작함 (성공/실패 토스트 표시)
- ✅ 민감정보(비밀번호, API 키)가 API 응답에 노출되지 않음
- ✅ 사용자 관리 화면에서 등록/목록 조회/삭제가 동작함
- ✅ 자기 자신의 계정을 삭제할 수 없음
- ✅ `npm run build` 에러 없이 완료됨
- ✅ `npm run lint` 에러 없음

---

## 배포 전략

### 자동 검증 (sprint-close 시 실행)

- ✅ `npm run build` — 빌드 성공 여부
- ✅ `npm run lint` — 코드 스타일 검증

### 수동 검증 필요

- ⬜ `npm run dev` 실행 후 앱 동작 확인 → [deploy.md](sprint3/deploy.md) 참고
- ⬜ 관리자 계정으로 로그인하여 GNB 네비게이션 확인
- ⬜ 환경설정 화면 진입 및 설정 저장 확인
- ⬜ 사용자 관리 화면 진입 및 사용자 등록/삭제 확인

## 검증 결과

- [검증 보고서 (Playwright)](sprint3/test-report.md)
- [코드 리뷰 보고서](sprint3/code-review.md)
- [배포 체크리스트](sprint3/deploy.md)

---

## Playwright 검증 시나리오

> `npm run dev` 실행 후 아래 순서로 검증

### GNB 검증

1. `browser_navigate` → `http://localhost:3000/login`
2. `browser_fill_form` → 관리자 계정 로그인
3. `browser_wait_for` → `/dashboard` 이동 확인
4. `browser_snapshot` → GNB 요소 확인 (대시보드, 용어사전, 환경설정, 사용자 관리, 로그아웃)
5. `browser_resize` → 360px 너비
6. `browser_snapshot` → 햄버거 메뉴 아이콘 표시 확인
7. `browser_click` → 햄버거 메뉴 클릭
8. `browser_snapshot` → 메뉴 항목 펼쳐짐 확인

### 환경설정 화면 검증

9. `browser_navigate` → `http://localhost:3000/settings`
10. `browser_snapshot` → 환경설정 폼 렌더링 확인 (IMAP 호스트, 포트, 모델명 등)
11. `browser_fill_form` → IMAP 설정값 입력 (host: imap.gmail.com, port: 993)
12. `browser_click` → "설정 저장" 버튼 클릭
13. `browser_wait_for` → "설정이 저장되었습니다" 토스트 대기
14. `browser_network_requests` → `PUT /api/config` 200 응답 확인
15. `browser_click` → "연결 테스트" 버튼 클릭
16. `browser_snapshot` → 연결 테스트 결과 토스트 확인

### 사용자 관리 화면 검증

17. `browser_navigate` → `http://localhost:3000/admin/users`
18. `browser_snapshot` → 사용자 목록 테이블 확인
19. `browser_click` → "사용자 등록" 버튼 클릭
20. `browser_fill_form` → 테스트 사용자 정보 입력 (username: testuser01, password: Test@1234)
21. `browser_click` → "등록" 버튼 클릭
22. `browser_wait_for` → "사용자가 등록되었습니다" 토스트 대기
23. `browser_snapshot` → 목록에 새 사용자 표시 확인
24. `browser_click` → 등록된 사용자의 삭제 버튼 클릭
25. `browser_handle_dialog` → 삭제 확인 다이얼로그 수락
26. `browser_wait_for` → "사용자가 삭제되었습니다" 토스트 대기
27. `browser_snapshot` → 목록에서 사용자 제거 확인
28. `browser_console_messages` → 콘솔 에러 없음 확인

---

## 예상 산출물

스프린트 완료 시 다음 결과물이 준비된다:

| 산출물 | 경로 |
|--------|------|
| 토스트 컴포넌트 | `src/components/ui/Toast.tsx` |
| 토스트 Context | `src/lib/toast/toast-context.tsx` |
| GNB 컴포넌트 | `src/components/layout/GNB.tsx` |
| 관리자 권한 가드 | `src/lib/auth/require-admin.ts` |
| 환경설정 서비스 | `src/lib/config/settings-service.ts` |
| 환경설정 API | `src/app/api/config/route.ts`, `test-mail/route.ts` |
| 사용자 관리 API | `src/app/api/users/route.ts`, `[id]/route.ts` |
| 환경설정 화면 | `src/app/(authenticated)/settings/page.tsx` |
| 사용자 관리 화면 | `src/app/(authenticated)/admin/users/page.tsx` |
| 공통 레이아웃 | `src/app/(authenticated)/layout.tsx` (수정) |

---

## 참고 문서

- `docs/specs/screens/scr_set-001.md` — 환경설정 화면 상세 사양
- `docs/specs/screens/scr_admin-001.md` — 사용자 관리 화면 상세 사양
- `docs/specs/interface/api_config.md` — 환경설정 API 정의 (CFG-001~003)
- `docs/specs/interface/api_user.md` — 사용자 관리 API 정의 (USER-001~003)
- `docs/ROADMAP.md` — Sprint 3 태스크 (T3-1~T3-5) 및 Sprint 2 이월 항목 (T2-6~T2-8)
