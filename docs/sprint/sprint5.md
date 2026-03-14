# Sprint 5: 메일 수신 + 파일 저장 + 스케줄러

> **스프린트 번호:** 5
> **Phase:** Phase 3 — 백엔드 핵심 로직
> **기간:** 2주 (2026-03-16 ~ 2026-03-29)
> **목표:** IMAP 메일 수신 → 텍스트 파일 저장 → 분석 큐 등록 → 백그라운드 스케줄러 자동 실행까지의 전체 백엔드 파이프라인 1단계를 완성한다.

---

## 스프린트 목표

서버 시작 시 자동으로 IMAP 메일 수신 파이프라인이 구동되어야 한다. IMAP 서버에서 읽지 않은 메일을 가져와 텍스트 파일로 저장하고, `analysis_queue` 테이블에 `pending` 상태로 등록하며, 처리 이력을 `mail_processing_logs`에 기록한다. IMAP 미설정 상태에서도 에러 없이 건너뛰어야 한다.

---

## 구현 범위

### 포함 항목
- 파일 시스템 관리 유틸리티 (디렉터리 생성, 경로 보안)
- HTTP 지수 백오프 재시도 유틸리티
- IMAP 메일 수신 기능 (imapflow, UNSEEN 메일, UID 중복 방지)
- 메일 내용 추출 (제목/본문, HTML-to-Text)
- 분석 요청 파일 생성 및 analysis_queue 등록
- IMAP SEEN 플래그 설정 + mail_processing_logs 기록
- 백그라운드 cron 스케줄러 (node-cron, HMR 안전, Graceful Shutdown)
- `src/instrumentation.ts` 수정 — 스케줄러 초기화 추가
- `src/app/api/mail/check/route.ts` 수정 — 플레이스홀더를 실제 배치 함수로 교체
- 만료 파일 정리 (30일 메일 파일, 90일 처리 로그)

### 제외 항목
- 용어 추출 및 AI 분석 (Sprint 6)
- 프론트엔드 UI 변경 (대시보드는 Sprint 4 완료 상태 그대로)
- 테스트 코드 작성 (Phase 5 Sprint 9에서 일괄 처리)

---

## 기술 컨텍스트

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 16.1.6 (App Router), Node.js 런타임 |
| DB/ORM | better-sqlite3 + Drizzle ORM |
| 스케줄러 | node-cron ^4.2.1 (이미 설치됨) |
| IMAP 클라이언트 | imapflow ^1.2.13 (이미 설치됨) |
| HTML 변환 | html-to-text — **미설치, T5-4에서 설치 필요** |
| 로거 | `src/lib/logger/index.ts` (Sprint 4 구현 완료) |
| 설정 조회 | `src/lib/config/settings-service.ts` (DB 설정 + 환경변수) |
| 진입점 | `src/instrumentation.ts` — Next.js 서버 초기화 훅 |
| 소스 루트 | `D:\Study\Hackathon\domain-dictionary\src` |

### 환경변수 (`.env.local` 참고)
```
MAIL_IMAP_HOST=       # IMAP 서버 주소
MAIL_IMAP_PORT=993    # IMAP 포트
MAIL_USERNAME=        # 메일 계정
MAIL_PASSWORD=        # 메일 비밀번호
MAIL_USE_SSL=true     # SSL 사용 여부
MAIL_CHECK_INTERVAL=3600000  # 메일 확인 주기 (ms)
MAIL_STORAGE_PATH=./data/mails
```

### 기존 DB 스키마 (활용 대상)
- `mailProcessingLogs` — `executedAt`, `completedAt`, `processType`, `status`, `mailCount`, `errorMessage`
- `analysisQueue` — `fileName`, `status('pending')`, `mailSubject`, `mailReceivedAt`

---

## 작업 분해 (Task Breakdown)

### T5-1: 파일 시스템 관리 기능 (CMN-FS-001)

**생성 파일:** `src/lib/fs/file-manager.ts`

**구현 내용:**
- `ensureDir(dirPath: string): void` — 디렉터리가 없으면 재귀 생성 (`fs.mkdirSync`, `recursive: true`)
- `safeWriteFile(basePath: string, filename: string, content: string): string` — 경로 탈출(path traversal) 방지 후 파일 저장, 저장된 절대 경로 반환
- `safeReadFile(filePath: string): string` — 파일 읽기
- `deleteFile(filePath: string): void` — 파일 삭제 (존재하지 않으면 에러 무시)
- `listFiles(dirPath: string): string[]` — 디렉터리 내 파일 목록 (존재하지 않으면 빈 배열)
- `initDataDirs(): void` — `./data/mails/`, `./data/terms/` 디렉터리 초기화

**경로 보안 검증 방식:** `path.resolve(basePath, filename)`이 `path.resolve(basePath)`로 시작하지 않으면 `Error('경로 탈출 감지')` throw

**의존성:** `node:fs`, `node:path`

**우선순위:** 최상 (다른 T5 태스크가 모두 의존)

---

### T5-2: HTTP 재시도 기능 (CMN-HTTP-001)

**생성 파일:** `src/lib/http/retry.ts`

**구현 내용:**
```typescript
// 지수 백오프 재시도
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelayMs?: number }
): Promise<T>
```
- 기본값: `maxRetries=3`, `baseDelayMs=1000`
- 대기 시간: 1s → 2s → 4s (2^n * baseDelayMs)
- 모든 재시도 소진 시 마지막 에러를 그대로 throw
- 각 재시도 시 logger.warn으로 기록

**의존성:** `src/lib/logger/index.ts`

**우선순위:** 높음 (T5-3 IMAP 연결에 사용)

---

### T5-3: IMAP 메일 수신 기능 (MAIL-RECV-001)

**생성 파일:** `src/lib/mail/imap-receiver.ts`

**구현 내용:**

```typescript
export interface ReceivedMail {
  uid: string;
  subject: string;
  receivedAt: string; // ISO 8601
  rawBody: string;    // HTML 또는 텍스트 원본
  isHtml: boolean;
}

export async function receiveUnseenMails(): Promise<ReceivedMail[]>
```

**구현 세부 사항:**
- 환경변수(`MAIL_IMAP_HOST`, `MAIL_IMAP_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_USE_SSL`) 중 하나라도 없으면 `[]` 반환 (에러 없이 건너뜀)
- imapflow `ImapFlow` 클라이언트 사용
  ```typescript
  const client = new ImapFlow({
    host, port: Number(port),
    secure: use_ssl === 'true',
    auth: { user: username, pass: password },
    logger: false,  // imapflow 내부 로그 비활성화
  });
  ```
- `client.connect()` → `client.getMailboxLock('INBOX')` → `client.search({ seen: false })` → UID 목록 조회
- 각 UID에 대해 `client.fetchOne(uid, { source: true, envelope: true })` 로 원본 수신
- `withRetry`로 connect 감싸기
- finally에서 반드시 `client.logout()` 호출
- 접속 실패 시 로그 후 `[]` 반환

**의존성:** `imapflow`, `src/lib/http/retry.ts`, `src/lib/logger/index.ts`

**우선순위:** 높음

---

### T5-4: 메일 내용 추출 기능 (MAIL-PROC-001)

**생성 파일:** `src/lib/mail/mail-parser.ts`

**설치 필요 패키지:**
```bash
cd D:/Study/Hackathon/domain-dictionary
npm install html-to-text
npm install --save-dev @types/html-to-text
```

**구현 내용:**

```typescript
export interface ParsedMail {
  subject: string;
  bodyText: string;  // 순수 텍스트 (HTML 변환 완료)
  receivedAt: string;
}

export function parseMail(mail: ReceivedMail): ParsedMail
```

- HTML 메일이면 `html-to-text`의 `convert()` 함수로 순수 텍스트 변환
  ```typescript
  import { convert } from 'html-to-text';
  // 옵션: wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }]
  ```
- 텍스트 메일이면 그대로 사용
- 본문이 비어 있으면 `'(본문 없음)'` 반환
- 제목이 없으면 `'(제목 없음)'` 반환

**의존성:** `html-to-text`, `src/lib/mail/imap-receiver.ts`

**우선순위:** 높음

---

### T5-5: 분석 요청 파일 생성 기능 (DATA-FILE-001)

**생성 파일:** `src/lib/data/analysis-file.ts`

**구현 내용:**

```typescript
export interface AnalysisFileResult {
  fileName: string;   // {timestamp}_{uid}.txt
  filePath: string;   // 절대 경로
}

export async function createAnalysisFile(mail: ParsedMail & { uid: string }): Promise<AnalysisFileResult>
```

**세부 동작:**
- 파일명 형식: `{YYYYMMDD_HHmmss}_{uid}.txt`
  - timestamp는 `new Date().toISOString().replace(/[-:T]/g, '_').slice(0, 15)` 활용
- 저장 경로: `process.env.MAIL_STORAGE_PATH ?? './data/mails'`
- 파일 내용 형식:
  ```
  제목: {subject}
  수신일시: {receivedAt}
  ---
  {bodyText}
  ```
- `safeWriteFile`로 저장
- 저장 후 `analysis_queue` 테이블에 `{ fileName, status: 'pending', mailSubject: subject, mailReceivedAt: receivedAt }` insert
  - `fileName`이 UNIQUE 컬럼이므로 이미 존재하면 건너뜀 (중복 방지)

**의존성:** `src/lib/fs/file-manager.ts`, `src/lib/mail/mail-parser.ts`, `src/db/index.ts`, `src/db/schema.ts`

**우선순위:** 높음

---

### T5-6: 메일 상태 갱신 기능 (MAIL-PROC-002)

**생성 파일:** `src/lib/mail/imap-receiver.ts` (함수 추가)

**구현 내용:**

```typescript
export async function markMailAsSeen(uid: string): Promise<void>
```

- `receiveUnseenMails`와 동일한 환경변수 기반 클라이언트 생성
- `client.messageFlagsAdd({ uid: Number(uid) }, ['\\Seen'])` 호출
- 실패해도 에러 throw 하지 않고 logger.warn으로 기록

```typescript
export async function recordProcessingLog(params: {
  processType: string;
  status: 'success' | 'error' | 'skipped';
  mailCount: number;
  errorMessage?: string;
}): Promise<void>
```

- `mailProcessingLogs` 테이블에 insert
- `executedAt`, `completedAt` 모두 현재 시각 ISO 8601 문자열로 저장

**의존성:** `imapflow`, `src/db/index.ts`, `src/db/schema.ts`, `src/lib/logger/index.ts`

**우선순위:** 중간

---

### T5-7: 배치 오케스트레이션 함수

**생성 파일:** `src/lib/mail/mail-batch.ts`

> T5-3~T5-6을 조합하는 단일 진입점 함수. 스케줄러(T5-7)와 API route 모두 이 함수를 호출한다.

**구현 내용:**

```typescript
// 모듈 레벨 중복 실행 방지
let isRunning = false;

export async function runMailBatch(): Promise<{
  skipped: boolean;
  mailCount: number;
  errorMessage?: string;
}>
```

**실행 흐름:**
1. `isRunning` 확인 — true이면 `{ skipped: true, mailCount: 0 }` 반환
2. `isRunning = true` 설정
3. `receiveUnseenMails()` 호출
4. 환경변수 미설정으로 빈 배열 반환 시 `recordProcessingLog({ processType: 'scheduled', status: 'skipped', mailCount: 0 })` 후 반환
5. 각 메일에 대해:
   - `parseMail(mail)` 호출
   - `createAnalysisFile({ ...parsed, uid: mail.uid })` 호출
   - `markMailAsSeen(mail.uid)` 호출
   - 개별 실패 시 logger.error로 기록 후 계속 진행 (전체 배치 중단 않음)
6. `recordProcessingLog({ processType: 'scheduled', status: 'success', mailCount })` 호출
7. finally에서 `isRunning = false` 해제

**의존성:** T5-3, T5-4, T5-5, T5-6의 모든 함수

**우선순위:** 높음 (T5-7 스케줄러와 API route가 의존)

---

### T5-7: 백그라운드 스케줄러 (SCHED-001)

**생성 파일:** `src/lib/scheduler/cron-scheduler.ts`

**구현 내용:**

```typescript
export function initScheduler(): void
```

**세부 동작:**
- `global.__scheduler`가 이미 존재하면 중복 초기화 방지 (Next.js HMR 대응)
  ```typescript
  declare global { var __scheduler: import('node-cron').ScheduledTask | undefined; }
  ```
- `MAIL_CHECK_INTERVAL` 환경변수(ms 단위)를 cron 표현식으로 변환
  - 1시간(3600000ms) → `'0 * * * *'` (매 시간 정각)
  - 30분(1800000ms) → `'*/30 * * * *'`
  - 변환 로직: `Math.round(ms / 60000)`분 → `'*/{분} * * * *'`
  - 최소 1분, 기본값 60분
- `cron.schedule(expression, runMailBatch)` 으로 주기 실행 등록
- **서버 시작 시 즉시 1회 실행** (MAIL-R-005): `setTimeout(() => runMailBatch(), 0)` — 이벤트 루프 다음 틱에서 실행
- `global.__scheduler = task` 저장
- Graceful Shutdown:
  ```typescript
  process.on('SIGTERM', () => {
    global.__scheduler?.stop();
    logger.info('[scheduler] SIGTERM 수신 — 스케줄러 종료');
  });
  ```

**`src/instrumentation.ts` 수정:**
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    try {
      const { seedAdmin } = await import('@/lib/auth/seed-admin');
      await seedAdmin();
    } catch (err) {
      console.error('[instrumentation] seedAdmin 실패:', err);
    }

    // Sprint 5: 스케줄러 초기화 추가
    try {
      const { initScheduler } = await import('@/lib/scheduler/cron-scheduler');
      initScheduler();
    } catch (err) {
      console.error('[instrumentation] 스케줄러 초기화 실패:', err);
    }
  }
}
```

**`src/app/api/mail/check/route.ts` 수정:**
- 플레이스홀더 `setTimeout` 제거
- `runMailBatch()`를 import하여 비동기 실행
  ```typescript
  import { runMailBatch } from '@/lib/mail/mail-batch';

  // POST 핸들러 내부에서
  if (isRunning) { /* 409 */ }
  // runMailBatch 자체가 isRunning 관리하므로 여기서는 제거하고
  // runMailBatch().catch(err => logger.error(...)) 비동기 호출
  ```
  > 참고: `mail-batch.ts`의 `isRunning`이 모듈 레벨에서 관리되므로 `route.ts`의 별도 `isRunning` 변수는 제거

**`/api/mail/status` 응답 업데이트:**
- 스케줄러가 실행 중이면 `status: 'running'` 반환 필요
- `global.__scheduler` 존재 여부로 판단:
  ```typescript
  // status/route.ts에 추가
  const schedulerStatus = global.__scheduler ? 'running' : 'stopped';
  ```

**의존성:** `node-cron`, `src/lib/mail/mail-batch.ts`, `src/lib/logger/index.ts`

**우선순위:** 최상 (스프린트 핵심 목표)

---

### T5-8: 처리 완료 파일 관리 기능 (DATA-FILE-002)

**생성 파일:** `src/lib/data/cleanup.ts`

**구현 내용:**

```typescript
export async function cleanupExpiredFiles(): Promise<void>
```

**세부 동작:**
1. **메일 임시 파일 30일 정리:**
   - `MAIL_STORAGE_PATH` 디렉터리의 모든 파일 나열
   - 파일명의 timestamp(앞 15자) 파싱 또는 `fs.statSync().mtime`으로 수정 시각 조회
   - 현재 시각 - 30일 이전 파일 삭제
   - `analysis_queue` 테이블에서 해당 `fileName` 행의 status가 `completed` 또는 `failed`인 경우만 삭제

2. **mail_processing_logs 90일 하드 삭제:**
   ```typescript
   import { lt } from 'drizzle-orm';
   const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
   db.delete(mailProcessingLogs).where(lt(mailProcessingLogs.executedAt, cutoff)).run();
   ```

**`mail-batch.ts` runMailBatch 함수 마지막 단계에 추가:**
- `await cleanupExpiredFiles()` 호출 (실패해도 배치 결과에 영향 없음)

**의존성:** `src/lib/fs/file-manager.ts`, `src/db/index.ts`, `src/db/schema.ts`

**우선순위:** 낮음 (다른 T5 완료 후 추가)

---

## 의존성 그래프

```
T5-1 (file-manager)
  └── T5-5 (analysis-file)
  └── T5-8 (cleanup)

T5-2 (retry)
  └── T5-3 (imap-receiver)

T5-3 (imap-receiver)
  └── T5-4 (mail-parser)
    └── T5-5 (analysis-file)
      └── [배치 오케스트레이션]
  └── T5-6 (mark-seen + log)
    └── [배치 오케스트레이션]

[배치 오케스트레이션: mail-batch.ts]
  └── T5-7 (cron-scheduler) → instrumentation.ts → API route
  └── T5-8 (cleanup)
```

**권장 구현 순서:** T5-1 → T5-2 → T5-3 → T5-4 → T5-5 → T5-6 → 배치 오케스트레이션 → T5-7 → T5-8

---

## 리스크 및 대응 방안

| 리스크 | 발생 가능성 | 대응 방안 |
|--------|-----------|-----------|
| imapflow 연결 타임아웃 | 중 | `withRetry` 적용, 연결 실패 시 빈 배열 반환으로 graceful 처리 |
| Next.js HMR에서 스케줄러 중복 실행 | 높음 | `global.__scheduler` 싱글톤 + 존재 시 재초기화 방지 |
| html-to-text 미설치 | 확실 | T5-4 시작 전 반드시 `npm install html-to-text` 실행 |
| IMAP 미설정 시 에러 | 중 | 환경변수 부재 감지 후 즉시 빈 배열 반환 (에러 throw 없음) |
| analysis_queue 중복 삽입 | 중 | `fileName` UNIQUE 제약 + insert 실패 무시(try/catch) |
| Node.js `node:fs` ESM/CJS 충돌 | 낮음 | `import fs from 'node:fs'` 형식 사용 |

---

## 완료 기준 (Definition of Done)

- ✅ 스케줄러가 서버 시작 시(`npm run dev`) 자동으로 1회 `runMailBatch`를 실행함
- ✅ IMAP 설정이 완료된 환경에서 UNSEEN 메일을 수신하여 `./data/mails/{timestamp}_{uid}.txt`로 저장됨
- ✅ `analysis_queue` 테이블에 `status='pending'`으로 등록됨
- ✅ `mail_processing_logs`에 수신 이력이 기록됨 (`processType`, `status`, `mailCount`)
- ✅ IMAP 환경변수 미설정 시 에러 없이 `status='skipped'`로 로그 기록 후 종료됨
- ✅ 30일 경과 메일 파일이 정리됨 (completed/failed 상태에 한함)
- ✅ 90일 경과 `mail_processing_logs` 행이 삭제됨
- ✅ `GET /api/mail/status` 응답의 `scheduler.status`가 `'running'`으로 반환됨
- ✅ `POST /api/mail/check` 호출 시 실제 `runMailBatch()`가 비동기 실행됨
- ✅ `npm run build` 에러 없이 완료됨
- ✅ `npm run lint` 에러 없음

---

## 배포 전략 (CI/CD)

### 자동 검증 항목
- `npm run lint` — ESLint 검사
- `npm run build` — TypeScript 컴파일 + Next.js 빌드

### 수동 검증 필요 항목 (`docs/sprint/sprint5/deploy.md` 참고)

| 항목 | 이유 |
|------|------|
| `npm run dev` 서버 실행 후 스케줄러 로그 확인 | 런타임에서만 확인 가능 |
| IMAP 연결 테스트 (실제 메일 서버) | 외부 서비스 의존 |
| `./data/mails/` 파일 생성 확인 | 파일 시스템 상태 확인 |
| DB `analysis_queue` 레코드 확인 | DB 상태 확인 |

### 브랜치 전략
- 현재 브랜치: `sprint2` (ROADMAP 기준 sprint5 작업 시작)
- sprint5 작업 완료 후 sprint-close 에이전트로 PR 생성

---

## Playwright MCP 검증 시나리오

> `npm run dev` 실행 후 IMAP 설정 완료 상태에서 아래 순서로 검증

### 서비스 상태 확인 (스케줄러 구동 확인)
1. `browser_navigate` → `http://localhost:3000/` (관리자 로그인 상태)
2. `browser_snapshot` → 서비스 상태 카드에서 스케줄러 **"실행 중"** 확인
3. `browser_network_requests` → `/api/mail/status` 응답의 `scheduler.status === 'running'` 확인

### 수동 메일 확인 트리거 검증
4. `browser_click` → "메일 확인 실행" 버튼 클릭
5. `browser_click` → 확인 다이얼로그 "확인" 클릭
6. `browser_wait_for` → 토스트 메시지 "메일 확인이 시작되었습니다" 대기
7. (5초 대기 후) `browser_navigate` → `http://localhost:3000/` 새로고침
8. `browser_snapshot` → 마지막 메일 수신 시간 갱신 확인
9. `browser_network_requests` → `POST /api/mail/check` 200 응답 확인
10. `browser_console_messages` (level: "error") → 콘솔 에러 없음 확인

### IMAP 미설정 시 안전 동작 확인
11. 환경변수 `MAIL_IMAP_HOST` 제거 후 서버 재시작
12. `browser_navigate` → `http://localhost:3000/`
13. `browser_snapshot` → 에러 없이 대시보드 정상 렌더링 확인
14. `browser_network_requests` → `/api/mail/status` 200 응답 확인

---

## 예상 산출물

| 산출물 | 경로 |
|--------|------|
| 파일 시스템 유틸리티 | `src/lib/fs/file-manager.ts` |
| HTTP 재시도 유틸리티 | `src/lib/http/retry.ts` |
| IMAP 수신 모듈 | `src/lib/mail/imap-receiver.ts` |
| 메일 파서 | `src/lib/mail/mail-parser.ts` |
| 분석 파일 생성 | `src/lib/data/analysis-file.ts` |
| 배치 오케스트레이션 | `src/lib/mail/mail-batch.ts` |
| 만료 파일 정리 | `src/lib/data/cleanup.ts` |
| cron 스케줄러 | `src/lib/scheduler/cron-scheduler.ts` |
| 스케줄러 초기화 (수정) | `src/instrumentation.ts` |
| 수동 트리거 API (수정) | `src/app/api/mail/check/route.ts` |
| 서비스 상태 API (수정) | `src/app/api/mail/status/route.ts` |

---

## 품질 검증 체크리스트

- ✅ ROADMAP.md Phase 3 Sprint 5 목표와 일치
- ✅ 모든 태스크가 구체적인 파일 경로와 함수 시그니처를 포함
- ✅ 완료 기준(Definition of Done)이 측정 가능하게 정의됨
- ✅ IMAP 미설정 시 graceful 처리 방안 명시
- ✅ HMR 중복 실행 방지 전략 명시
- ✅ 의존성 그래프와 구현 순서 명시
- ✅ 파일이 `docs/sprint/sprint5.md`에 저장됨
