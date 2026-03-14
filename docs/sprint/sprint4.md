# Sprint 4: 대시보드 화면 + 서비스 상태 API

- **기간**: 2026-03-15 ~ 2026-03-28 (2주)
- **브랜치**: sprint4
- **상태**: ⬜ 예정

---

## 스프린트 목표

로깅 기능을 기반으로 서비스 상태 조회 API, 분석 결과 API, 수동 메일 확인 트리거 API를 구현하고, 대시보드 플레이스홀더(`dashboard/page.tsx`)를 실제 기능 화면으로 교체한다. 이 스프린트가 완료되면 관리자는 대시보드에서 스케줄러 상태, IMAP/API 키 설정 현황, 최신 분석 결과, 분석 이력을 한눈에 확인하고 수동으로 메일 확인을 트리거할 수 있다.

---

## 구현 범위

### 포함

- **T4-1**: 로깅 유틸리티 (`lib/logger/index.ts`) — 구조화 로그, 4단계 레벨
- **T4-2**: 서비스 상태 조회 API (`GET /api/mail/status`, MAIL-001)
- **T4-3**: 분석 결과 API (`GET /api/analysis/latest`, `GET /api/analysis/history`)
- **T4-4**: 대시보드 화면 (`app/(authenticated)/dashboard/page.tsx` 전면 교체)
- **T4-5**: 수동 메일 확인 트리거 API (`POST /api/mail/check`, MAIL-002)

### 제외

- 실제 메일 수신 파이프라인 (스케줄러, IMAP) → Sprint 5
- 용어사전 뷰어 → Sprint 7
- 실제 분석 데이터가 없으므로 대시보드의 분석 결과 영역은 빈 상태로 렌더링됨

---

## 구현 파일 목록

### 생성 파일

| 파일 | 태스크 | 설명 |
|------|--------|------|
| `src/lib/logger/index.ts` | T4-1 | 구조화 로그 유틸리티 |
| `src/app/api/mail/status/route.ts` | T4-2 | MAIL-001 — 서비스 상태 조회 |
| `src/app/api/mail/check/route.ts` | T4-5 | MAIL-002 — 수동 메일 확인 트리거 |
| `src/app/api/analysis/latest/route.ts` | T4-3 | ANAL-001 — 최신 분석 결과 |
| `src/app/api/analysis/history/route.ts` | T4-3 | ANAL-002 — 분석 이력 목록 |

### 수정 파일

| 파일 | 태스크 | 변경 내용 |
|------|--------|-----------|
| `src/app/(authenticated)/dashboard/page.tsx` | T4-4 | 플레이스홀더 → 실제 대시보드 화면 전면 교체 |

---

## 태스크 상세

### T4-1: 로깅 유틸리티 (CMN-LOG-001)

**우선순위**: 1번 (T4-2, T4-5에서 사용)

**구현 파일:**
- 생성: `src/lib/logger/index.ts`

**logger/index.ts 구조:**

```ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;   // ISO 8601
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

// 구조화 로그 출력 (개발 환경에서 콘솔 출력)
// 프로덕션에서는 error/warn만 출력 (NODE_ENV 기반 필터링)
export function log(level: LogLevel, message: string, context?: Record<string, unknown>): void

// 편의 함수
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info:  (message: string, context?: Record<string, unknown>) => log('info',  message, context),
  warn:  (message: string, context?: Record<string, unknown>) => log('warn',  message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
};
```

**구현 규칙:**
- `console.log/warn/error`로 출력, 레벨마다 대응 console 메서드 사용
- 출력 형식: `[LEVEL] TIMESTAMP message {context_json}`
- `debug` 레벨은 `NODE_ENV !== 'production'`일 때만 출력
- 순수 유틸리티이므로 DB 의존성 없음

**완료 기준:**
- ✅ `logger.info('메시지', { key: 'val' })` 호출 시 콘솔에 구조화된 형식으로 출력됨
- ✅ 프로덕션 환경(`NODE_ENV=production`)에서 `debug` 레벨이 출력되지 않음

---

### T4-2: 서비스 상태 조회 API (MAIL-001)

**우선순위**: 2번 (T4-4 대시보드에서 호출)

**구현 파일:**
- 생성: `src/app/api/mail/status/route.ts`

**참조 파일:**
- `src/lib/auth/require-admin.ts` — `requireAdmin()`, `isNextResponse()` 재사용
- `src/db/schema.ts` — `mailProcessingLogs` 테이블 구조
- `src/lib/config/settings-service.ts` — `getAllSettings()` 재사용

**route.ts (GET /api/mail/status) 구조:**

```ts
export const runtime = 'nodejs';

// GET: MAIL-001 — 서비스 상태 조회 (인증 필요, admin/user 모두 접근 가능)
// - getIronSession으로 세션 검증 (비로그인 시 401)
// - mailProcessingLogs에서 최근 1건 조회 (executedAt DESC)
// - process.env.MAIL_PASSWORD, GEMINI_API_KEY 존재 여부 확인
// - 스케줄러 상태는 이 스프린트에서 항상 'stopped'로 반환 (Sprint 5에서 실제 상태 반영)
```

**응답 형식:**

```ts
interface ServiceStatusResponse {
  scheduler: {
    status: 'running' | 'stopped';    // Sprint 5 전까지 항상 'stopped'
    checkIntervalMs: number | null;   // app_settings mail.check_interval 값
  };
  lastExecution: {
    executedAt: string | null;        // 마지막 실행 시점 (ISO 8601)
    completedAt: string | null;
    status: string | null;            // 'success' | 'error' | null
    mailCount: number | null;
    analyzedCount: number | null;
    errorMessage: string | null;
  } | null;
  config: {
    imapConfigured: boolean;          // host + username + MAIL_PASSWORD 모두 설정 시 true
    apiKeyConfigured: boolean;        // GEMINI_API_KEY 존재 시 true
  };
}
```

**DB 쿼리:**

```ts
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { mailProcessingLogs } from '@/db/schema';

// 최근 실행 1건 조회
const lastLog = db
  .select()
  .from(mailProcessingLogs)
  .orderBy(desc(mailProcessingLogs.executedAt))
  .limit(1)
  .get();
```

**인증 처리:**
- requireAdmin() 대신 세션 유무만 확인 (admin/user 모두 조회 가능)
- `getIronSession`으로 직접 세션 검증, userId 없으면 401 반환

**완료 기준:**
- ✅ 로그인 상태에서 `GET /api/mail/status` 호출 시 200 응답 + 위 구조의 JSON 반환
- ✅ `config.imapConfigured`: MAIL_PASSWORD 환경변수 없으면 false
- ✅ `config.apiKeyConfigured`: GEMINI_API_KEY 환경변수 없으면 false
- ✅ 비로그인 상태에서 401 반환

---

### T4-3: 분석 결과 API (ANAL-001, ANAL-002)

**우선순위**: 3번 (T4-4 대시보드에서 호출)

**구현 파일:**
- 생성: `src/app/api/analysis/latest/route.ts`
- 생성: `src/app/api/analysis/history/route.ts`

**참조 파일:**
- `src/db/schema.ts` — `analysisQueue` 테이블 구조 확인
- `src/lib/auth/require-admin.ts` — `isNextResponse()` 재사용

**latest/route.ts (GET /api/analysis/latest) 구조:**

```ts
export const runtime = 'nodejs';

// GET: ANAL-001 — 최신 완료 분석 결과 1건
// - 세션 검증 (userId 없으면 401)
// - analysisQueue에서 status='completed'이고 analyzedAt DESC 기준 1건 조회
// - 없으면 data: null 반환 (404 아님 — 빈 상태 처리는 프론트에서)
```

**latest 응답 형식:**

```ts
interface LatestAnalysisResponse {
  data: {
    id: string;
    mailSubject: string | null;
    mailReceivedAt: string | null;
    summary: string | null;
    actionItems: string | null;   // JSON 문자열 (Sprint 8에서 파싱)
    extractedTermCount: number;
    analyzedAt: string | null;
    status: string;
  } | null;
}
```

**history/route.ts (GET /api/analysis/history) 구조:**

```ts
export const runtime = 'nodejs';

// GET: ANAL-002 — 분석 이력 목록 (페이지네이션)
// - 세션 검증 (userId 없으면 401)
// - 쿼리 파라미터: page (기본 1), limit (기본 10, 최대 50)
// - analysisQueue 전체 조회 (상태 무관), createdAt DESC 정렬
// - 총 건수(total) + 현재 페이지 목록(items) 반환
```

**history 응답 형식:**

```ts
interface HistoryResponse {
  data: {
    total: number;
    page: number;
    limit: number;
    items: Array<{
      id: string;
      mailSubject: string | null;
      mailReceivedAt: string | null;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      extractedTermCount: number;
      analyzedAt: string | null;
      errorMessage: string | null;
      createdAt: string;
    }>;
  };
}
```

**DB 쿼리 패턴:**

```ts
import { desc, eq, count } from 'drizzle-orm';
import { db } from '@/db';
import { analysisQueue } from '@/db/schema';

// 최신 완료 결과
const latest = db
  .select()
  .from(analysisQueue)
  .where(eq(analysisQueue.status, 'completed'))
  .orderBy(desc(analysisQueue.analyzedAt))
  .limit(1)
  .get();

// 이력 목록 (페이지네이션)
const offset = (page - 1) * limit;
const items = db
  .select()
  .from(analysisQueue)
  .orderBy(desc(analysisQueue.createdAt))
  .limit(limit)
  .offset(offset)
  .all();

// 총 건수
const [{ value: total }] = db.select({ value: count() }).from(analysisQueue).all();
```

**완료 기준:**
- ✅ `GET /api/analysis/latest` — analysisQueue에 completed 항목 없으면 `data: null` 반환
- ✅ `GET /api/analysis/history` — 빈 테이블이면 `{ total: 0, items: [] }` 반환
- ✅ `GET /api/analysis/history?page=2&limit=5` — 페이지네이션 파라미터 적용됨
- ✅ 비로그인 상태에서 401 반환

---

### T4-5: 수동 메일 확인 트리거 API (MAIL-002)

**우선순위**: 4번 (T4-4 대시보드 버튼에서 호출)

**구현 파일:**
- 생성: `src/app/api/mail/check/route.ts`

**참조 파일:**
- `src/lib/auth/require-admin.ts` — `requireAdmin()`, `isNextResponse()` 재사용
- `src/lib/logger/index.ts` — T4-1에서 구현한 logger 활용

**route.ts (POST /api/mail/check) 구조:**

```ts
export const runtime = 'nodejs';

// 모듈 레벨 실행 중 잠금 (Sprint 5에서 실제 배치로 교체)
let isRunning = false;

// POST: MAIL-002 — 수동 메일 확인 트리거 (admin 전용)
// - requireAdmin() 호출: admin 아니면 401/403
// - isRunning === true이면 409 반환 ("이미 실행 중입니다.")
// - isRunning = true 설정 후 즉시 202 응답 반환
// - 비동기로 플레이스홀더 작업 실행 (Promise 체인, await 없음)
//   → Sprint 5에서 실제 배치 로직으로 교체 예정
// - 플레이스홀더: logger.info 출력 후 isRunning = false로 리셋
```

**응답 형식:**

```ts
// 성공 (202 Accepted)
{ success: true, message: '메일 확인이 시작되었습니다.' }

// 이미 실행 중 (409 Conflict)
{ success: false, message: '이미 실행 중입니다. 잠시 후 다시 시도해주세요.' }
```

**플레이스홀더 비동기 블록:**

```ts
// API는 즉시 202 응답 후 아래 블록을 백그라운드 실행
// Sprint 5에서 실제 배치 분석기로 교체
Promise.resolve().then(async () => {
  try {
    logger.info('[manual-check] 수동 메일 확인 시작 (플레이스홀더)');
    // TODO Sprint 5: await batchAnalyzer.run();
    logger.info('[manual-check] 수동 메일 확인 완료 (플레이스홀더)');
  } catch (err) {
    logger.error('[manual-check] 오류 발생', { error: String(err) });
  } finally {
    isRunning = false;
  }
});
```

**완료 기준:**
- ✅ `POST /api/mail/check` (admin) — 202 응답 + 성공 메시지
- ✅ 연속 2회 호출 시 두 번째 요청에서 409 반환
- ✅ 비로그인/일반 사용자 호출 시 401/403 반환

---

### T4-4: 대시보드 화면 (DASH-001)

**우선순위**: 5번 (T4-2, T4-3, T4-5 완료 후 구현)

**구현 파일:**
- 수정: `src/app/(authenticated)/dashboard/page.tsx` (전면 교체)

**참조 파일:**
- `src/lib/toast/toast-context.tsx` — `useToast()` 훅 재사용
- `src/components/layout/GNB.tsx` — 현재 사용자 role 파악 방법 참고
- `src/app/(authenticated)/layout.tsx` — ToastProvider, GNB 래핑 구조 확인

**페이지 구조:**

```tsx
'use client';

// 세 개의 데이터 소스를 마운트 시 병렬 fetch
// Promise.all([fetchStatus(), fetchLatest(), fetchHistory()])

// 상태 관리:
//   - status: ServiceStatusResponse | null
//   - latestAnalysis: LatestAnalysisResponse['data'] | null
//   - history: HistoryResponse['data'] | null
//   - isLoading: boolean (초기 true)
//   - isTriggering: boolean (수동 메일 확인 버튼 클릭 중)
//   - currentPage: number (이력 페이지네이션)

// 현재 로그인 사용자 role 확인:
//   - GET /api/auth/me 호출 후 role 저장
//   - 또는 Promise.all에 포함하여 병렬 호출
```

**화면 레이아웃:**

```
[페이지 제목: 대시보드]

[경고 배너 — imapConfigured=false 또는 apiKeyConfigured=false 시]
  "서비스 설정이 완료되지 않았습니다."
  - admin: "환경설정으로 이동" 링크 버튼
  - user: "관리자에게 문의하세요." 안내 문구

[서비스 상태 카드]
  스케줄러: [실행 중 / 중지됨] 뱃지
  메일 확인 주기: N분 (미설정 시 "미설정")
  IMAP 설정: [설정됨 / 미설정] 뱃지
  API 키: [설정됨 / 미설정] 뱃지
  마지막 실행: YYYY-MM-DD HH:mm (없으면 "기록 없음")
  마지막 결과: 성공 N건 / 실패 메시지

[admin 전용] [메일 확인 실행 버튼] — 클릭 시 확인 다이얼로그

[최신 분석 결과 섹션]
  데이터 있음:
    메일 제목 / 수신일 / 분석완료일
    요약 (summary)
    후속 작업 수 / 추출 용어 수
    [상세 보기] 링크 → /work/{id} (Sprint 8 연동 예정, 현재는 href="#")
  데이터 없음:
    "아직 분석된 메일이 없습니다." 빈 상태 메시지

[분석 이력 섹션]
  상태 뱃지 색상:
    completed: 녹색 / failed: 빨간색 / processing: 파란색 / pending: 회색
  컬럼: 메일 제목 | 수신일 | 상태 | 용어 수 | 분석일
  빈 상태: "분석 이력이 없습니다."
  페이지네이션: 이전/다음 버튼, "N / M 페이지" 표시

[로딩 중] — animate-pulse 스켈레톤 UI
```

**주요 동작 구현:**

```tsx
// 수동 메일 확인 버튼 클릭 핸들러
async function handleManualCheck() {
  const confirmed = window.confirm('메일 확인을 수동으로 실행하시겠습니까?');
  if (!confirmed) return;

  setIsTriggering(true);
  try {
    const res = await fetch('/api/mail/check', { method: 'POST' });
    const json = await res.json();
    if (res.ok) {
      showToast('메일 확인이 시작되었습니다.', 'success');
    } else if (res.status === 409) {
      showToast('이미 실행 중입니다. 잠시 후 다시 시도해주세요.', 'info');
    } else {
      showToast(json.message ?? '오류가 발생했습니다.', 'error');
    }
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  } finally {
    setIsTriggering(false);
  }
}

// 날짜 포맷 유틸리티 (페이지 내 인라인 함수 또는 별도 파일)
function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace(/\. /g, '-').replace('.', '');
  // 결과: "2026-03-15 14:30" 형식 (UI-R-015)
}

// 메일 확인 주기 표시
function formatInterval(ms: number | null): string {
  if (!ms) return '미설정';
  const minutes = Math.round(ms / 60000);
  return `${minutes}분`;
}
```

**스켈레톤 UI 패턴:**

```tsx
// isLoading === true 시 표시
function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-gray-200 p-6">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/3" />
    </div>
  );
}
```

**role 확인 방법:**
```tsx
// 마운트 시 /api/auth/me 호출 (Promise.all에 포함)
const [statusRes, latestRes, historyRes, meRes] = await Promise.all([
  fetch('/api/mail/status'),
  fetch('/api/analysis/latest'),
  fetch('/api/analysis/history?page=1&limit=10'),
  fetch('/api/auth/me'),
]);
const me = await meRes.json();
const isAdmin = me.data?.role === 'admin';
```

**완료 기준:**
- ✅ 대시보드 진입 시 스켈레톤 로딩 후 서비스 상태 카드 렌더링됨
- ✅ IMAP/API 키 미설정 시 경고 배너 표시됨
- ✅ admin 로그인 시 "메일 확인 실행" 버튼 표시, user 로그인 시 버튼 숨김
- ✅ 메일 확인 버튼 클릭 → window.confirm → API 호출 → 토스트 표시
- ✅ analysisQueue에 데이터 없을 때 "아직 분석된 메일이 없습니다." 표시
- ✅ 페이지네이션 이전/다음 클릭 시 이력 목록 갱신됨
- ✅ 360px 모바일에서 카드 레이아웃 정상 표시

---

## 기술적 접근 방법

### 인증 처리 패턴 (기존 패턴 재사용)

API Route에서 인증이 필요하되 admin 전용이 아닌 경우 (status, latest, history 조회):

```ts
// requireAdmin() 대신 직접 세션 확인
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/auth/session';

const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
if (!session.userId) {
  return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
}
```

admin 전용 API (mail/check):
```ts
// 기존 requireAdmin() + isNextResponse() 패턴 그대로 사용
const authResult = await requireAdmin();
if (isNextResponse(authResult)) return authResult;
```

### 병렬 데이터 페칭 (대시보드)

```ts
// 4개 API를 한 번에 호출 — 직렬 대기 없음
const [statusRes, latestRes, historyRes, meRes] = await Promise.all([...]);
```

### 날짜/시간 포맷 (UI-R-015)

날짜 표시는 모두 "YYYY-MM-DD HH:mm" 형식으로 통일한다. `formatDateTime` 함수를 대시보드 페이지 내에 정의하고, Sprint 8에서 공통 유틸리티로 분리한다.

---

## 의존성 및 리스크

### 의존성

| 태스크 | 선행 조건 |
|--------|-----------|
| T4-2 (서비스 상태 API) | T4-1 (logger — API 내부 로그 출력에 사용) |
| T4-5 (수동 트리거 API) | T4-1 (logger) |
| T4-4 (대시보드 화면) | T4-2, T4-3, T4-5 (호출할 API가 먼저 존재해야 함) |

### 리스크

| 리스크 | 가능성 | 대응 방안 |
|--------|--------|-----------|
| `window.confirm` 대신 커스텀 모달 요구 | 낮음 | 이 스프린트에서는 `window.confirm` 사용, Sprint 8에서 UX 개선 검토 |
| `isRunning` 플래그가 HMR에서 초기화되어 409 오작동 | 중 | 개발 환경 이슈이므로 허용, Sprint 5에서 실제 배치 상태로 교체 시 해결됨 |
| `/api/auth/me` 추가 호출로 인한 대시보드 초기화 지연 | 낮음 | Promise.all로 병렬 호출하므로 실질적 지연 없음 |
| analysisQueue, mailProcessingLogs 데이터 없는 상태에서 조회 오류 | 낮음 | `.get()` 반환값이 `undefined`이므로 null 처리 필수, 계획에 반영됨 |

---

## 완료 기준 (Definition of Done)

- ⬜ 대시보드에서 서비스 상태(스케줄러, IMAP, API 키)가 표시됨
- ⬜ IMAP/API 키 미설정 시 경고 배너가 표시됨
- ⬜ 분석 이력이 있을 때 최신 결과와 이력 목록이 표시됨
- ⬜ 분석 이력이 없을 때 빈 상태가 적절히 표시됨
- ⬜ 수동 메일 확인 버튼이 admin에게만 표시되고, 클릭 시 트리거됨
- ⬜ `npm run build` 에러 없이 완료됨
- ⬜ `npm run lint` 에러 없음

---

## 배포 전략

### 자동 검증 (sprint-close 시 실행)

- ✅ `npm run build` — 빌드 성공 여부
- ✅ `npm run lint` — 코드 스타일 검증

### 수동 검증 필요

- ⬜ `npm run dev` 실행 후 앱 동작 확인 → `docs/sprint/sprint4/deploy.md` 참고
- ⬜ 관리자 계정 로그인 후 대시보드 진입 확인
- ⬜ 경고 배너 표시 확인 (IMAP/API 키 미설정 상태에서)
- ⬜ 수동 메일 확인 버튼 클릭 → confirm 다이얼로그 → 토스트 확인
- ⬜ 일반 사용자(user role) 로그인 후 메일 확인 버튼 숨김 확인

---

## Playwright 검증 시나리오

> `npm run dev` 실행 후 아래 순서로 검증

### 대시보드 렌더링 검증 (admin)

1. `browser_navigate` → `http://localhost:3000/login`
2. `browser_fill_form` → 관리자 계정 로그인 (woongs / 1@(Dndtm)#4)
3. `browser_wait_for` → `/dashboard` 이동 확인
4. `browser_snapshot` → 서비스 상태 카드 렌더링 확인 (스케줄러, IMAP 상태, API 키 상태)
5. `browser_snapshot` → 경고 배너 표시 확인 (IMAP 미설정 상태)
6. `browser_snapshot` → "아직 분석된 메일이 없습니다." 빈 상태 메시지 확인
7. `browser_network_requests` → `/api/mail/status`, `/api/analysis/latest`, `/api/analysis/history` 200 응답 확인

### 수동 메일 확인 검증 (admin)

8. `browser_snapshot` → "메일 확인 실행" 버튼 존재 확인
9. `browser_click` → "메일 확인 실행" 버튼 클릭
10. `browser_handle_dialog` → 확인 다이얼로그 수락
11. `browser_wait_for` → "메일 확인이 시작되었습니다." 토스트 대기
12. `browser_network_requests` → `POST /api/mail/check` 202 응답 확인

### user role 권한 검증

13. (로그아웃 후 일반 사용자 계정으로 로그인)
14. `browser_navigate` → `http://localhost:3000/dashboard`
15. `browser_snapshot` → "메일 확인 실행" 버튼 미표시 확인

### 반응형 검증

16. `browser_resize` → 360px 너비
17. `browser_navigate` → `http://localhost:3000/dashboard`
18. `browser_snapshot` → 모바일 레이아웃 확인 (카드 세로 배치)
19. `browser_console_messages` → 콘솔 에러 없음 확인

---

## 예상 산출물

스프린트 완료 시 다음 결과물이 준비된다:

| 산출물 | 경로 |
|--------|------|
| 로깅 유틸리티 | `src/lib/logger/index.ts` |
| 서비스 상태 API | `src/app/api/mail/status/route.ts` |
| 수동 메일 확인 API | `src/app/api/mail/check/route.ts` |
| 최신 분석 결과 API | `src/app/api/analysis/latest/route.ts` |
| 분석 이력 API | `src/app/api/analysis/history/route.ts` |
| 대시보드 화면 | `src/app/(authenticated)/dashboard/page.tsx` (전면 교체) |

---

## 참고 문서

- `docs/ROADMAP.md` — Sprint 4 태스크 (T4-1~T4-5) 및 완료 기준
- `docs/specs/screens/scr_dash-001.md` — 대시보드 화면 상세 사양 (존재 시)
- `docs/specs/interface/api_mail.md` — MAIL-001, MAIL-002 API 정의 (존재 시)
- `docs/specs/interface/api_analysis.md` — ANAL-001, ANAL-002 API 정의 (존재 시)
