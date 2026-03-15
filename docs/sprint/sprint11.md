# Sprint 11: 프로덕션 배포 완료 및 검증

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Vercel 환경변수 등록 및 재배포를 통해 프로덕션 배포를 완료하고, 전체 기능이 실제 프로덕션 환경에서 정상 동작하는지 검증하여 서비스를 실사용 가능한 상태로 만든다.

**Architecture:** Vercel + Neon PostgreSQL 기반 서버리스 배포 환경. 기존 코드 변경 없이 환경변수 등록과 재배포만으로 배포를 완료한다. Vercel Cron Jobs를 활용하여 분석 배치를 자동화한다.

**Tech Stack:** Vercel (Serverless, Hobby 플랜), Neon PostgreSQL, Next.js 16.1.6, Vercel CLI

---

## 개요

| 항목 | 내용 |
|------|------|
| 스프린트 번호 | Sprint 11 |
| Phase | 배포 완료 (Post-M5) |
| 기간 | 1주 |
| 브랜치 | `main` (기존 브랜치 사용, 코드 변경 없음) |
| 상태 | 진행 중 |

## 스프린트 목표

Sprint 1~10 전체 완료(M5 달성) 이후, 코드/빌드/보안 자동 검증은 완료되었으나 실제 Vercel 프로덕션 배포가 미완료된 상태다. 이 스프린트는 다음 목표를 달성한다:

1. **P0 - 배포 차단 해소**: Vercel에 Postgres 환경변수 등록 및 재배포 실행
2. **P1 - 배포 후 기능 검증**: 프로덕션 URL에서 전체 기능(로그인, 대시보드, 설정, 웹훅, 분석, 용어사전) 동작 확인
3. **P2 - 선택 작업**: 불필요 환경변수 제거, Vercel Cron Jobs 설정, deploy.md 정리

## 현재 상태 파악

### 완료된 항목 (Sprint 10 이후)

| 항목 | 상태 |
|------|------|
| 소스 코드 구현 (Phase 1~5) | ✅ 완료 |
| `npm run build` (프로덕션 빌드) | ✅ 성공 |
| `npm run lint` (코드 스타일 검증) | ✅ 오류 없음 |
| SQLite → PostgreSQL 마이그레이션 | ✅ 완료 |
| 보안 점검 (하드코딩 민감정보 없음) | ✅ 완료 |
| Vercel 프로젝트 생성 및 GitHub 연동 | ✅ 완료 |
| `SESSION_SECRET`, `ADMIN_*`, `GEMINI_*` 환경변수 등록 | ✅ 등록됨 |
| 프로덕션 URL | `https://domain-dictionary-iota.vercel.app` |

### 미완료 항목 (이 스프린트 대상)

| 우선순위 | 항목 | 상태 |
|----------|------|------|
| P0 | `POSTGRES_URL` 환경변수 Vercel 등록 | ⬜ 미등록 |
| P0 | `POSTGRES_URL_NON_POOLING` 환경변수 Vercel 등록 | ⬜ 미등록 |
| P0 | Vercel 재배포 실행 | ⬜ 미실행 |
| P1 | 로그인 기능 검증 (`/login`) | ⬜ 미검증 |
| P1 | 대시보드 검증 (`/dashboard`) | ⬜ 미검증 |
| P1 | 환경설정 검증 (`/settings`) | ⬜ 미검증 |
| P1 | 웹훅 수신 검증 (`POST /api/webhook/<code>`) | ⬜ 미검증 |
| P1 | 분석 배치 수동 실행 검증 | ⬜ 미검증 |
| P1 | 용어사전 검색 검증 (`/dictionary`) | ⬜ 미검증 |
| P2 | 불필요한 환경변수 제거 (`DATABASE_PATH` 등) | ⬜ 미완료 |
| P2 | `vercel.json` Cron Jobs 설정 | ⬜ 미완료 |
| P2 | `docs/deploy/deploy.md` 정리 | ⬜ 미완료 |

---

## 태스크 목록

### Task 1: Vercel Postgres 환경변수 등록 (P0 - 배포 차단)

**Files:**
- 수정 없음 (Vercel 대시보드 작업)

> 이 태스크는 Vercel 대시보드에서 수동으로 수행해야 합니다. 코드 변경 없이 환경변수만 등록합니다.

#### 1-a. Vercel 대시보드에서 환경변수 등록

**Step 1: Vercel 대시보드 접속**

[https://vercel.com/dashboard](https://vercel.com/dashboard) 접속 → `domain-dictionary` 프로젝트 선택

**Step 2: 환경변수 등록 (방법 A - Neon DB 연결, 권장)**

```
Vercel 대시보드 → 프로젝트 → Storage 탭
→ 기존 Neon DB가 있는 경우: Connect Database → 해당 DB 선택
→ 연결 완료 시 POSTGRES_URL, POSTGRES_URL_NON_POOLING 등 자동 등록됨
```

**Step 2: 환경변수 등록 (방법 B - 직접 입력)**

`Settings` → `Environment Variables` 에서 아래 항목을 추가한다:

| 키 | 값 | 환경 |
|----|----|------|
| `POSTGRES_URL` | `postgresql://neondb_owner:...@...pooler.../neondb?channel_binding=require&sslmode=require` | Production, Preview, Development |
| `POSTGRES_URL_NON_POOLING` | `postgresql://neondb_owner:...@ep-royal-wildflower-a1zbxj5k.../neondb?sslmode=require` | Production, Preview, Development |

> 실제 연결 정보는 `CLAUDE.local.md` 또는 Neon 대시보드에서 확인

**Step 3: 등록 확인**

`Settings` → `Environment Variables` 목록에서 `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING` 항목이 표시되는지 확인

---

### Task 2: Vercel 재배포 실행 (P0 - 배포 차단)

**Files:**
- 없음 (CLI 또는 대시보드 작업)

#### 2-a. 재배포 실행

환경변수 등록 완료 후 반드시 재배포를 수행해야 새 환경변수가 반영된다.

**Step 1: Vercel CLI로 재배포 (권장)**

```bash
cd D:/Study/Hackathon/domain-dictionary
npx vercel --prod --yes
```

또는 `main` 브랜치에 push하면 자동 배포됨:
```bash
git push origin main
```

**Step 2: 배포 상태 확인**

```bash
npx vercel ls
```

또는 Vercel 대시보드 → `Deployments` 탭에서 최신 배포 상태가 `Ready`인지 확인

**Step 3: 빌드 로그 확인**

배포 실패 시 Vercel 대시보드 → 해당 배포 항목 → `Build Logs` 탭에서 에러 원인 파악

---

### Task 3: 프로덕션 기능 검증 (P1 - 배포 후 즉시 검증)

**Files:**
- 없음 (브라우저/curl 테스트)

> 배포 URL: `https://domain-dictionary-iota.vercel.app`

#### 3-a. 로그인 기능 검증

**Step 1: 로그인 페이지 접속**

브라우저에서 `https://domain-dictionary-iota.vercel.app/login` 접속

**Step 2: 관리자 로그인 시도**

- 아이디: `ADMIN_USERNAME` 환경변수 값 (Vercel에 등록된 값)
- 비밀번호: `ADMIN_PASSWORD` 환경변수 값

**Step 3: 로그인 성공 확인**

- 로그인 후 대시보드(`/`) 또는 `/dashboard`로 이동되어야 함
- 브라우저 URL이 변경되고 GNB(상단 네비게이션)가 표시되어야 함

예상 결과: 로그인 성공 → 대시보드 화면 표시

---

#### 3-b. 대시보드 검증

**Step 1: 대시보드 접속**

로그인 상태에서 `https://domain-dictionary-iota.vercel.app/` 또는 `/dashboard` 접속

**Step 2: UI 확인 항목**

- 서비스 상태 카드 (스케줄러 상태, IMAP 설정 상태, API 키 상태)
- API 미설정 시 경고 배너 표시 여부
- "아직 분석된 메일이 없습니다" 빈 상태 메시지 표시

**Step 3: API 응답 확인**

브라우저 개발자 도구 → Network 탭에서 다음 API 호출 200 응답 확인:
- `GET /api/mail/status`
- `GET /api/analysis/latest`
- `GET /api/analysis/history`

예상 결과: 대시보드 정상 렌더링, API 200 응답

---

#### 3-c. 환경설정 검증

**Step 1: 환경설정 페이지 접속**

`https://domain-dictionary-iota.vercel.app/settings` 접속 (관리자 로그인 필요)

**Step 2: 웹훅 관리 UI 확인**

- 웹훅 목록 테이블 표시 여부
- 새 웹훅 생성 버튼 동작 여부
- 웹훅 생성 시 고유 코드(`code`) 발급 확인

**Step 3: IMAP 설정 저장 테스트 (선택)**

실제 IMAP 설정이 있는 경우 입력 후 "연결 테스트" 버튼 클릭, 결과 확인

예상 결과: 환경설정 화면 렌더링, 웹훅 관리 UI 동작

---

#### 3-d. 웹훅 수신 검증

**Step 1: 웹훅 코드 확인**

환경설정 화면에서 웹훅 생성 후 발급된 `code` 값 확인

**Step 2: curl로 웹훅 수신 테스트**

```bash
curl -X POST https://domain-dictionary-iota.vercel.app/api/webhook/<발급된-code> \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Sprint 11 테스트 메일",
    "body": "EMR 시스템 연동 테스트입니다. OCS(처방전달시스템)와 LIS(검사정보시스템) 연동 관련 업무 용어를 분석합니다.",
    "receivedAt": "2026-03-15T09:00:00Z"
  }'
```

**Step 3: 응답 확인**

예상 응답:
```json
{"success": true, "message": "웹훅 수신 완료"}
```
HTTP 상태 코드 200 확인

**Step 4: analysis_queue 등록 확인**

대시보드에서 분석 이력에 "pending" 또는 "processing" 상태 항목이 나타나는지 확인

---

#### 3-e. 분석 배치 수동 실행 검증

**Step 1: 대시보드에서 수동 실행**

대시보드 → "메일 확인 실행" 버튼 클릭 (관리자 계정 필요) → 확인 다이얼로그 "확인" 클릭

**Step 2: API 직접 호출로 수동 실행 (대안)**

```bash
curl -X POST https://domain-dictionary-iota.vercel.app/api/mail/check \
  -H "Cookie: <로그인 후 세션 쿠키>"
```

**Step 3: 실행 결과 확인**

- 토스트 메시지 "메일 확인이 시작되었습니다" 표시 확인
- 잠시 후 대시보드 새로고침 → 분석 이력 상태 변화 확인 (pending → completed 또는 failed)

> Vercel Serverless 함수 실행 시간 제한(10초)으로 인해 배치 처리가 부분 완료될 수 있습니다.
> 실패 항목은 다음 실행 시 재시도됩니다.

---

#### 3-f. 용어사전 검색 검증

**Step 1: 용어사전 접속**

`https://domain-dictionary-iota.vercel.app/dictionary` 접속

**Step 2: 검색 기능 확인**

- 분석이 완료된 경우: 검색창에 용어명 입력 → 300ms 후 검색 결과 표시 확인
- 분석이 없는 경우: 빈 상태("검색 결과가 없습니다") 정상 표시 확인

**Step 3: 용어 상세 진입 확인**

검색 결과 있는 경우: 카드 클릭 → `/dictionary/{id}` 용어 상세 화면 이동 확인

---

### Task 4: 선택 작업 (P2)

#### 4-a. 불필요 환경변수 제거

**Step 1: Vercel 환경변수 목록 확인**

Vercel 대시보드 → `Settings` → `Environment Variables` 에서 아래 항목 존재 시 제거:
- `DATABASE_PATH` (SQLite 잔재, PostgreSQL로 전환 완료)
- `TURSO_DATABASE_URL` (있는 경우)
- `TURSO_AUTH_TOKEN` (있는 경우)
- `MAIL_STORAGE_PATH` (Vercel 서버리스 환경에서 로컬 파일 저장 불가)
- `GLOSSARY_STORAGE_PATH` (동일 이유)

> 제거 전 앱 동작에 영향이 없는지 확인 (코드에서 해당 변수를 참조하는 경우 에러 발생 가능)

---

#### 4-b. Vercel Cron Jobs 설정

> Vercel Hobby(무료) 플랜 제약: Cron Jobs 1일 최대 2회

**Step 1: `vercel.json` 파일 생성**

`domain-dictionary/vercel.json` 파일을 생성하거나 수정한다.

**Files:**
- Create/Modify: `domain-dictionary/vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/mail/check",
      "schedule": "0 9 * * *"
    }
  ]
}
```

> 매일 오전 9시 UTC 실행 (`0 9 * * *`)
> 더 자주 실행이 필요한 경우 Pro 플랜(월 $20) 또는 GitHub Actions, cron-job.org 활용

**Step 2: 커밋 및 배포**

```bash
cd D:/Study/Hackathon
git add domain-dictionary/vercel.json
git commit -m "feat: Vercel Cron Jobs 설정 추가 (매일 09:00 UTC 분석 배치 자동 실행)"
git push origin main
```

**Step 3: 배포 후 확인**

Vercel 대시보드 → `Settings` → `Cron Jobs` 탭에서 등록된 Cron이 표시되는지 확인

---

#### 4-c. deploy.md 최종 정리

배포 완료 후 `docs/deploy/deploy.md` 파일의 항목 상태를 업데이트하고 최종 검증 결과를 기록한다.

**Files:**
- Modify: `docs/deploy/deploy.md`

완료된 항목은 `⬜` → `✅`로 업데이트하고, 이 스프린트에서 수행한 배포 결과(배포 URL, 검증 일시)를 추가한다.

---

## 완료 기준 (Definition of Done)

| 우선순위 | 항목 | 확인 방법 |
|----------|------|-----------|
| P0 | ⬜ `POSTGRES_URL` Vercel 환경변수 등록 완료 | Vercel 대시보드 환경변수 목록 확인 |
| P0 | ⬜ `POSTGRES_URL_NON_POOLING` Vercel 환경변수 등록 완료 | Vercel 대시보드 환경변수 목록 확인 |
| P0 | ⬜ Vercel 재배포 완료 (상태: Ready) | Vercel 대시보드 Deployments 탭 |
| P1 | ⬜ `https://domain-dictionary-iota.vercel.app/login` 로그인 성공 | 브라우저 직접 접속 |
| P1 | ⬜ 대시보드 화면 정상 렌더링 (API 200 응답 포함) | 브라우저 + Network 탭 |
| P1 | ⬜ 환경설정 화면 접속 및 웹훅 관리 UI 정상 동작 | 브라우저 직접 확인 |
| P1 | ⬜ `POST /api/webhook/<code>` 200 응답 | curl 테스트 |
| P1 | ⬜ 분석 배치 수동 실행 후 이력 상태 변화 확인 | 대시보드 화면 |
| P1 | ⬜ 용어사전 검색 기능 정상 동작 (분석 완료 데이터 있는 경우) | 브라우저 직접 확인 |
| P2 | ⬜ 불필요한 환경변수 제거 | Vercel 대시보드 환경변수 목록 |
| P2 | ⬜ `vercel.json` Cron Jobs 설정 완료 및 배포 | Vercel Cron Jobs 탭 |
| P2 | ⬜ `docs/deploy/deploy.md` 최신 상태로 업데이트 | 파일 내용 확인 |

---

## 의존성 및 리스크

| 리스크 | 가능성 | 영향도 | 대응 방안 |
|--------|--------|--------|-----------|
| Neon DB 연결 실패 (환경변수 오타/누락) | 중 | 높음 | 빌드 로그 확인 → 환경변수 재확인 후 재배포 |
| Vercel Serverless 10초 타임아웃으로 배치 중단 | 높음 | 중 | 정상 동작 (비동기 즉시 응답 패턴 구현됨) — 분석이 부분 완료되어도 다음 실행 시 재시도 |
| 관리자 계정 미생성 (instrumentation.ts 미실행) | 낮음 | 높음 | 서버 초기화 훅이 최초 요청 시 실행됨 — 로그인 시도 전 대시보드 API 먼저 한 번 호출 |
| Vercel Hobby 플랜 Cron 제약 | 확실 | 낮음 | 1일 1~2회로 제한됨 — 수동 실행으로 보완 가능 |
| 웹훅 수신 후 분석 미실행 | 중 | 중 | 웹훅은 큐에 등록만 함 — 분석은 `/api/mail/check` 호출 또는 Cron으로 실행해야 함 |

---

## 배포 전략

### 자동 실행 (이미 완료)

- ✅ `npm run build` — 프로덕션 빌드 성공 확인 (Sprint 10에서 완료)
- ✅ `npm run lint` — 코드 스타일 검증 완료 (Sprint 10에서 완료)
- ✅ 보안 점검 완료 (2026-03-15)

### 수동 실행 필요 항목 (이 스프린트)

- ⬜ **[Task 1]** Vercel 환경변수 등록 — Vercel 대시보드 직접 접속 필요
- ⬜ **[Task 2]** Vercel 재배포 실행 — CLI 또는 대시보드
- ⬜ **[Task 3]** 프로덕션 URL 기능 검증 — 브라우저 직접 접속 필요
- ⬜ **[Task 4-a]** 불필요 환경변수 제거 — Vercel 대시보드 직접 접속 필요

### 코드 변경 포함 항목

- ⬜ **[Task 4-b]** `vercel.json` Cron Jobs 설정 → 커밋 후 push → 자동 배포

---

## 검증 시나리오 (Playwright MCP)

> 배포 완료 후 프로덕션 URL `https://domain-dictionary-iota.vercel.app` 기준

### 전체 E2E 흐름

1. `browser_navigate` → `https://domain-dictionary-iota.vercel.app/login`
2. `browser_snapshot` → 로그인 폼 렌더링 확인 (아이디, 비밀번호, 로그인 버튼)
3. `browser_fill_form` → 관리자 아이디/비밀번호 입력
4. `browser_click` → 로그인 버튼 클릭
5. `browser_wait_for` → 대시보드 URL로 이동 대기
6. `browser_snapshot` → 대시보드 렌더링 확인 (서비스 상태 카드, GNB)
7. `browser_network_requests` → `POST /api/auth/login` 200 응답 확인
8. `browser_navigate` → `/settings`
9. `browser_snapshot` → 환경설정 화면 (웹훅 관리 포함) 확인
10. `browser_navigate` → `/dictionary`
11. `browser_snapshot` → 용어사전 화면 (검색창, 빈 상태 또는 트렌드) 확인
12. `browser_navigate` → `/admin/users`
13. `browser_snapshot` → 사용자 관리 화면 확인
14. `browser_console_messages(level: "error")` → 콘솔 에러 없음 확인
15. `browser_network_requests` → 모든 API 호출 2xx 확인

### 웹훅 수신 검증

16. (환경설정에서 웹훅 코드 확인 후) curl로 `POST /api/webhook/<code>` 호출
17. HTTP 200 응답 및 `{"success": true}` 응답 확인
18. `browser_navigate` → 대시보드 새로고침
19. `browser_snapshot` → 분석 이력에 새 항목(pending) 표시 확인

---

## 예상 산출물

| 산출물 | 경로/위치 | 비고 |
|--------|-----------|------|
| Vercel 환경변수 등록 완료 | Vercel 대시보드 | 코드 변경 없음 |
| 프로덕션 배포 완료 | `https://domain-dictionary-iota.vercel.app` | 상태: Ready |
| Vercel Cron Jobs 설정 | `domain-dictionary/vercel.json` | P2, 선택사항 |
| 배포 검증 결과 | `docs/deploy/deploy.md` (업데이트) | 완료 항목 ✅ 처리 |
| 스프린트 완료 보고 | `docs/sprint/sprint11/` | 스크린샷, 검증 결과 |

---

## 검증 결과

> 배포 완료 후 아래 파일에 결과를 기록합니다.

- [배포 검증 체크리스트](sprint11/deploy.md)
- [테스트 보고서](sprint11/test-report.md)
