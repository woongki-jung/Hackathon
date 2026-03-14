# Sprint 1: 프로젝트 초기화 + DB 스키마 + 로그인 화면

> **Phase 1 — 프로젝트 기반 구축 (Sprint 1/2)**

---

## 스프린트 개요

| 항목 | 내용 |
|------|------|
| 스프린트 번호 | Sprint 1 |
| 기간 | 2026-03-01 ~ 2026-03-14 (2주) |
| 브랜치 | `sprint1` |
| 상태 | 완료 |

---

## 스프린트 목표

Next.js 프로젝트를 초기화하고, 전체 데이터 모델을 Drizzle ORM 스키마로 정의하여 DB에 적용하며, 로그인 화면 UI를 구현한다. 서버 시작 시 초기 관리자 계정이 자동으로 생성되고, `/login` 경로에서 클라이언트 유효성 검사가 동작하는 로그인 폼이 렌더링된다. (API 연동은 Sprint 2에서 수행)

---

## 기술 스택

| 항목 | 선택 |
|------|------|
| 프레임워크 | Next.js 16.1.6 (App Router) |
| 언어 | TypeScript |
| DB | SQLite (better-sqlite3 ^12.8.0) |
| ORM | Drizzle ORM ^0.45.1 + drizzle-kit ^0.31.9 |
| 인증 준비 | iron-session ^8.0.4, bcrypt ^6.0.0 |
| 스타일 | Tailwind CSS ^4 |
| 패키지 매니저 | npm |
| 런타임 | Node.js (Next.js 서버) |

---

## 구현 범위

### 포함 항목

- ✅ Next.js 프로젝트 초기화 (App Router, TypeScript, Tailwind CSS)
- ✅ 핵심 패키지 설치 및 설정 (better-sqlite3, drizzle-orm, iron-session, bcrypt, imapflow, @anthropic-ai/sdk, node-cron)
- ✅ Drizzle ORM 스키마 정의 (7개 테이블 전체)
- ✅ DB 마이그레이션 실행 (drizzle-kit push → `data/app.db` 생성)
- ✅ 초기 관리자 계정 자동 생성 (`instrumentation.ts`)
- ✅ 로그인 화면 UI (`/login` 경로, 클라이언트 유효성 검사)
- ✅ `npm run build` 및 `npm run lint` 통과

### 제외 항목 (Sprint 2로 이관)

- ⬜ 로그인 API 연동 (`POST /api/auth/login`)
- ⬜ iron-session 세션 관리
- ⬜ Next.js 인증 미들웨어
- ⬜ 사용자 관리 API 및 화면

---

## 작업 분해 (Task Breakdown)

### T1-1: Next.js 프로젝트 초기화 [복잡도: 중]

**목적:** 프로젝트 디렉터리 구조와 개발 환경 기반 마련

**구현 내용:**
- `create-next-app` 기반으로 `domain-dictionary/` 디렉터리에 Next.js 16.1.6 초기화
- TypeScript, App Router, Tailwind CSS 옵션 활성화
- 프로젝트 디렉터리 구조 생성 (`src/app/`, `src/components/`, `src/db/`, `src/lib/`)
- ESLint 설정 (`eslint.config.mjs`)
- `.env.local.example` 파일 생성 (환경변수 템플릿)
- `.gitignore` 업데이트 (`.env.local`, `data/`, `node_modules/`)

**완료 기준:**
- `npm run dev` 실행 시 `http://localhost:3000` 접속 가능
- `npm run lint` 에러 없음

---

### T1-2: 핵심 패키지 설치 및 설정 [복잡도: 소]

**목적:** 전체 스프린트에서 사용할 패키지를 사전에 모두 설치하여 의존성 충돌 방지

**설치 패키지:**

| 패키지 | 버전 | 용도 |
|--------|------|------|
| better-sqlite3 | ^12.8.0 | SQLite 드라이버 (동기식) |
| drizzle-orm | ^0.45.1 | ORM |
| drizzle-kit | ^0.31.9 | 마이그레이션 CLI |
| iron-session | ^8.0.4 | HTTP-only 쿠키 세션 (Sprint 2 사용) |
| bcrypt | ^6.0.0 | 비밀번호 해싱 (Sprint 2 사용) |
| imapflow | ^1.2.13 | IMAP 메일 수신 (Sprint 5 사용) |
| @anthropic-ai/sdk | ^0.78.0 | Claude API (Sprint 6 사용) |
| node-cron | ^4.2.1 | 백그라운드 스케줄러 (Sprint 5 사용) |

**설정:**
- `tsconfig.json` 경로 별칭 설정 (`@/*` → `./src/*`)
- `drizzle.config.ts` 생성 (dialect: sqlite, schema 경로, output 경로)

**완료 기준:**
- `package.json`에 모든 패키지 등록됨
- `npm run build` 에러 없음

---

### T1-3: Drizzle ORM 스키마 정의 (7개 테이블 전체) [복잡도: 중]

**목적:** 전체 서비스에서 사용할 데이터 모델을 한 번에 정의하여 이후 스프린트의 DB 의존성 제거

**파일:**
- `src/db/schema.ts` — 7개 테이블 정의
- `src/db/index.ts` — DB 연결 싱글톤 (better-sqlite3 + Drizzle)
- `drizzle.config.ts` — drizzle-kit 설정

**테이블 목록:**

| 테이블 | 데이터 정의 | 주요 컬럼 |
|--------|------------|---------|
| `users` | DATA-001 | id (TEXT, PK), username, password_hash, role, created_at, updated_at, deleted_at |
| `app_settings` | DATA-002 | id, setting_key (UNIQUE), setting_value, description, created_at, updated_at |
| `mail_processing_logs` | DATA-003 | id, executed_at, status, mail_count, error_message, created_at, updated_at |
| `terms` | DATA-004 | id, name, category, description, file_path, frequency, created_at, updated_at |
| `term_source_files` | DATA-005 | id, term_id (FK→terms), mail_file_name, mail_subject, mail_received_at, created_at |
| `stop_words` | DATA-006 | id, word (UNIQUE), created_at |
| `analysis_queue` | DATA-007 | id, file_name, status, summary, action_items, retry_count, created_at, updated_at |

**기술 고려사항:**
- 모든 id는 TEXT (UUID v4 문자열)
- 날짜/시간은 TEXT (ISO 8601: `YYYY-MM-DDTHH:mm:ssZ`)
- `data/` 디렉터리가 없으면 DB 연결 전 자동 생성
- WAL 모드 활성화 (`PRAGMA journal_mode=WAL`)

**완료 기준:**
- `npm run db:push` 실행 후 `data/app.db`에 7개 테이블 생성됨
- `npm run db:generate`로 마이그레이션 파일 생성됨

---

### T1-4: 초기 관리자 계정 자동 생성 로직 [복잡도: 소]

**목적:** 서버 첫 실행 시 관리자 계정이 자동으로 존재하도록 하여 수동 DB 작업 없이 바로 로그인 가능하게 함

**파일:**
- `src/instrumentation.ts` — Next.js 서버 초기화 훅

**구현 내용:**
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` 환경변수에서 관리자 계정 정보 읽기
- `users` 테이블에 동일 username이 없으면 bcrypt 해싱 후 INSERT (role: `admin`)
- 이미 존재하면 건너뜀 (멱등성 보장)
- 환경변수 미설정 시 경고 로그 출력 후 건너뜀

**관련 정책:** AUTH-R-001, AUTH-R-007

**완료 기준:**
- `npm run dev` 시 `users` 테이블에 admin 계정 1건 생성됨
- 재시작 시 중복 생성 없음

---

### T1-5: 로그인 화면 UI [복잡도: 중]

**목적:** 사용자가 아이디/비밀번호를 입력하여 로그인을 시도할 수 있는 화면 구현 (API 연동은 Sprint 2)

**파일:**
- `src/app/login/page.tsx` — 로그인 페이지
- `src/app/layout.tsx` — 루트 레이아웃 (폰트, 메타데이터)
- `src/app/globals.css` — 전역 스타일

**UI 요소 (LOGIN-001 기반):**
- 서비스 로고/이름 (화면 중앙 상단)
- 아이디 입력 필드 (label 연결, placeholder: "아이디")
- 비밀번호 입력 필드 (label 연결, placeholder: "비밀번호", type="password")
- 로그인 버튼 (로딩 상태 시 스피너 표시)
- 오류 메시지 표시 영역

**클라이언트 유효성 검사 규칙:**
- 아이디: 필수, 4~20자
- 비밀번호: 필수, 8자 이상
- 유효성 실패 시 각 필드 아래 오류 메시지 표시

**UX 요구사항:**
- 화면 중앙 정렬 레이아웃 (UI-R-007)
- Enter 키 제출 지원
- 반응형 디자인 (모바일 360px ~ 데스크톱)
- label 요소와 input 연결 (UI-R-021)

**완료 기준:**
- `/login` 접속 시 로그인 폼 렌더링
- 빈 입력 상태에서 로그인 버튼 클릭 시 유효성 오류 메시지 표시
- 아이디 4자 미만 입력 시 오류 메시지 표시
- 모바일(360px)에서 정상 레이아웃

---

## 기술적 접근 방법

### 프로젝트 구조

```
domain-dictionary/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 루트 레이아웃
│   │   ├── globals.css             # 전역 스타일
│   │   ├── page.tsx                # 루트 페이지 (임시)
│   │   └── login/
│   │       └── page.tsx            # 로그인 화면
│   ├── db/
│   │   ├── schema.ts               # Drizzle 스키마 (7개 테이블)
│   │   └── index.ts                # DB 연결 싱글톤
│   └── instrumentation.ts          # 서버 초기화 훅 (관리자 계정 생성)
├── drizzle/                        # 마이그레이션 파일 (drizzle-kit 생성)
├── data/
│   └── app.db                      # SQLite DB 파일
├── drizzle.config.ts               # drizzle-kit 설정
├── package.json
└── tsconfig.json
```

### DB 연결 패턴

`src/db/index.ts`는 `better-sqlite3` 동기식 드라이버를 사용하는 싱글톤 패턴으로 구현한다. `data/` 디렉터리가 없으면 `fs.mkdirSync`로 자동 생성한다.

### instrumentation.ts 패턴

Next.js 16의 `instrumentation.ts`는 서버 시작 시 1회만 실행된다. `register()` 함수 내에서 DB 연결 후 관리자 계정 존재 여부를 확인하고 없으면 생성한다.

---

## 의존성 및 리스크

| 리스크 | 영향도 | 완화 전략 |
|--------|--------|-----------|
| better-sqlite3 네이티브 빌드 실패 (Windows 환경) | 높음 | `node-gyp` 빌드 도구 사전 설치, prebuild 바이너리 사용 |
| Drizzle ORM API 변경 (^0.45.x) | 중 | drizzle-kit과 drizzle-orm 버전 핀 고정 |
| instrumentation.ts HMR 중복 실행 | 중 | `register()` 내부에서 이미 생성된 경우 건너뜀 (멱등성) |
| `data/` 디렉터리 git 추적 방지 | 낮음 | `.gitignore`에 `data/` 추가, `data/.gitkeep` 또는 디렉터리 자동 생성 코드로 대체 |

---

## 완료 기준 (Definition of Done)

- ✅ `npm run dev`로 Next.js 개발 서버가 정상 실행됨
- ✅ `npm run build`가 에러 없이 완료됨
- ✅ `npm run lint`가 에러 없이 완료됨
- ✅ 7개 테이블의 Drizzle 스키마가 정의되고 `data/app.db`에 마이그레이션이 적용됨
- ✅ 서버 시작 시 `users` 테이블에 관리자 계정이 자동 생성됨
- ✅ `/login` 경로에서 로그인 폼이 렌더링됨 (API 미연결 상태)
- ✅ 클라이언트 유효성 검사 동작 (빈 값, 아이디 4자 미만, 비밀번호 8자 미만)
- ✅ 모바일(360px)에서 정상 레이아웃 확인

---

## Playwright MCP 검증 시나리오

> `npm run dev` 실행 후 아래 순서로 검증 (Sprint Close 시 수행)

**로그인 화면 렌더링 검증:**
1. `browser_navigate` → `http://localhost:3000/login` 접속
2. `browser_snapshot` → 로그인 폼 요소 존재 확인 (아이디 입력, 비밀번호 입력, 로그인 버튼)
3. `browser_click` → 로그인 버튼 클릭 (빈 입력 상태)
4. `browser_snapshot` → 유효성 오류 메시지 표시 확인
5. `browser_type` → 아이디 필드에 "ab" 입력 (4자 미만)
6. `browser_click` → 로그인 버튼 클릭
7. `browser_snapshot` → 아이디 유효성 오류 메시지 확인
8. `browser_console_messages` → 콘솔 에러 없음 확인
9. `browser_resize` → 360px 너비로 변경
10. `browser_snapshot` → 모바일 레이아웃 정상 확인

---

## 배포 전략

### 자동 검증 (Sprint Close 시 자동 실행)

- ✅ `npm run build` — 프로덕션 빌드 성공 여부
- ✅ `npm run lint` — ESLint 코드 스타일 검증

### 수동 검증 필요

- ⬜ `npm run dev` 후 브라우저에서 `http://localhost:3000/login` 직접 확인
- ⬜ 개발 서버 재시작 후 `users` 테이블에 admin 계정 생성 여부 확인 (SQLite DB 뷰어 또는 `drizzle-kit studio` 활용)
- ⬜ 모바일 뷰포트(360px) 레이아웃 시각적 확인

### 환경변수 설정 (`.env.local`)

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<8자 이상, 영문+숫자+특수문자>
DATABASE_PATH=./data/app.db
```

---

## 예상 산출물

| 산출물 | 경로 | 설명 |
|--------|------|------|
| Next.js 프로젝트 | `domain-dictionary/` | App Router, TypeScript, Tailwind CSS |
| DB 스키마 | `src/db/schema.ts` | 7개 테이블 Drizzle 스키마 |
| DB 연결 모듈 | `src/db/index.ts` | better-sqlite3 싱글톤 |
| 서버 초기화 훅 | `src/instrumentation.ts` | 관리자 계정 자동 생성 |
| 로그인 화면 | `src/app/login/page.tsx` | 클라이언트 유효성 검사 포함 |
| SQLite DB | `data/app.db` | 7개 테이블 + admin 계정 |
| drizzle-kit 설정 | `drizzle.config.ts` | 마이그레이션 설정 |

---

## 구현 현황 (2026-03-15 기준)

### 완료된 항목

| 작업 | 상태 | 비고 |
|------|------|------|
| T1-1: Next.js 프로젝트 초기화 | ✅ 완료 | Next.js 16.1.6 (ROADMAP 명세는 15이나 16.1.6으로 설치됨) |
| T1-2: 핵심 패키지 설치 및 설정 | ✅ 완료 | 모든 패키지 설치 완료, drizzle.config.ts 작성 |
| T1-3: Drizzle ORM 스키마 정의 | ✅ 완료 | 7개 테이블 스키마 정의 및 `data/app.db` 적용 |
| T1-4: 초기 관리자 계정 자동 생성 | ✅ 완료 | `instrumentation.ts` 구현 |
| T1-5: 로그인 화면 UI | ✅ 완료 | 클라이언트 유효성 검사, 반응형 레이아웃 |
| `npm run build` 통과 | ✅ 완료 | 프로덕션 빌드 에러 없음 |
| `npm run lint` 통과 | ✅ 완료 | ESLint 에러 없음 |

### 미완료 항목 (Sprint 2로 이관)

| 작업 | 상태 | 비고 |
|------|------|------|
| 로그인 API 연동 | ⬜ Sprint 2 | `POST /api/auth/login` |
| iron-session 세션 관리 | ⬜ Sprint 2 | CMN-SESSION-001 |
| 인증 미들웨어 | ⬜ Sprint 2 | `middleware.ts` |
| 사용자 관리 화면/API | ⬜ Sprint 2 | ADMIN-001, USER-001~003 |

### 특이사항

- Next.js 버전: ROADMAP에 15로 명시되어 있으나 실제 설치 버전은 16.1.6 (최신 stable)
- `.NET` 잔여 파일 (.NET 10, WinUI 3 기반 이전 구현) 정리 완료 후 Next.js 기반으로 전환
- `drizzle/` 디렉터리는 현재 빈 상태 (마이그레이션 파일 미생성, `db:push`로 직접 적용)

---

## 다음 스프린트 (Sprint 2) 준비사항

Sprint 2에서 구현할 주요 항목:
1. iron-session 세션 관리 (`lib/auth/session.ts`)
2. 로그인/로그아웃/세션 확인 API (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`)
3. Next.js 인증 미들웨어 (`middleware.ts`)
4. 로그인 화면 API 연동 (Sprint 1 UI에 연결)
5. 사용자 관리 API (`GET/POST /api/users`, `DELETE /api/users/:id`)
6. 사용자 관리 화면 (`app/(authenticated)/admin/users/page.tsx`)
7. 공통 인증 레이아웃 기초 (`app/(authenticated)/layout.tsx`)
