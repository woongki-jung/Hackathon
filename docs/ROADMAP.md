# 프로젝트 로드맵

## 개요
- **프로젝트 목표**: 메일 수신 내용을 분석하여 업무 용어 해설을 제공하는 웹 서비스 구축
- **전체 예상 기간**: 5 Phase / 10 Sprint (20주)
- **현재 진행 단계**: Phase 1 완료 (Sprint 1, 2 완료)
- **팀 규모**: 1~2인 소규모 팀
- **기술 스택**: Next.js 16.1.6 (App Router) + better-sqlite3 + Drizzle ORM + Tailwind CSS

## 진행 상태 범례
- ✅ 완료
- 🔄 진행 중
- 📋 예정
- ⏸️ 보류

---

## 📊 프로젝트 현황 대시보드

| 항목 | 상태 |
|------|------|
| 전체 진행률 | 90% (Sprint 1, 2, 3, 4, 5, 6, 7, 8, 9 완료) |
| 현재 Phase | Phase 5 진행 중 (Sprint 9 완료) |
| 다음 마일스톤 | Sprint 10 - 성능 최적화 + 배포 + 문서화 |
| 사양 문서 | 정책 5건, 데이터 7건, 기능 24건, API 16건, 화면 7건 정의 완료 |

---

## 🏗️ 기술 아키텍처 결정 사항

| 결정 사항 | 선택 | 이유 |
|-----------|------|------|
| 프레임워크 | Next.js 15 (App Router) | SSR/SSG 지원, API Route 통합, 반응형 웹 서비스에 적합 |
| DB | SQLite (better-sqlite3) | 단일 파일 DB, 서버 설치 불필요, 소규모 서비스에 적합 |
| ORM | Drizzle ORM | 타입 안전, 경량, SQLite 친화적 |
| 인증 | iron-session + bcrypt | HTTP-only 암호화 쿠키, 서버리스 환경 호환 |
| 스타일 | Tailwind CSS | 유틸리티 퍼스트, 반응형 디자인 생산성 |
| 메일 수신 | imapflow | IMAP 프로토콜 지원, SSL/TLS, 비동기 처리 |
| AI 분석 | @google/generative-ai | Gemini API 공식 SDK |
| 스케줄러 | node-cron | 경량 cron 스케줄링, Next.js 프로세스 내 실행 |
| 검색 | SQLite FTS5 | 전문 검색, 추가 서비스 불필요 |

---

## 🔗 의존성 맵

```
Phase 1 (기반)
  └── Sprint 1: 프로젝트 초기화 + DB 스키마 + 로그인 UI
  └── Sprint 2: 로그인 API + 세션 + 인증 미들웨어 + 사용자 관리

Phase 2 (관리자 기능)
  └── Sprint 3: 환경설정 UI/API + GNB 레이아웃
  └── Sprint 4: 대시보드 UI + 서비스 상태 API

Phase 3 (백엔드 핵심)  ← Phase 1, 2 의존
  └── Sprint 5: 메일 수신 + 파일 저장 + 스케줄러
  └── Sprint 6: 용어 추출 + 해설 생성 + 배치 파이프라인

Phase 4 (프론트엔드 완성)  ← Phase 2, 3 의존
  └── Sprint 7: 용어사전 뷰어 + 검색 + 트렌드
  └── Sprint 8: 업무지원 상세 + 대시보드 연동 완성

Phase 5 (안정화)  ← 전체 의존
  └── Sprint 9: 통합 테스트 + 에러 처리 + 접근성
  └── Sprint 10: 성능 최적화 + 배포 + 문서화
```

---

## Phase 1: 프로젝트 기반 구축 (Sprint 1-2)

### 목표
Next.js 15 프로젝트를 초기화하고, DB 스키마를 정의하며, 인증 시스템(로그인/세션/사용자 관리)을 완성한다. 이 단계가 완료되면 관리자가 로그인하고 사용자를 등록/삭제할 수 있다.

---

### Sprint 1: 프로젝트 초기화 + DB 스키마 + 로그인 화면 (2주) — ✅ 완료 (2026-03-15)

#### 작업 목록

- ✅ **T1-1: Next.js 16.1.6 프로젝트 초기화** [복잡도: 중]
  - `create-next-app` 실행 (TypeScript, App Router, Tailwind CSS)
  - 프로젝트 디렉터리 구조 생성 (`lib/`, `app/`, `components/` 등)
  - ESLint 설정
  - `.env.local.example` 파일 생성 (환경변수 템플릿)
  - `.gitignore` 업데이트 (`.env.local`, `data/`, `node_modules/`)

- ✅ **T1-2: 핵심 패키지 설치 및 설정** [복잡도: 소]
  - better-sqlite3, drizzle-orm, drizzle-kit 설치
  - iron-session, bcrypt 설치
  - imapflow, @google/generative-ai, node-cron 설치
  - tsconfig.json 경로 별칭 설정 (`@/*` → `./src/*`)

- ✅ **T1-3: Drizzle ORM 스키마 정의 (전체)** [복잡도: 중]
  - `src/db/schema.ts` 파일 생성 (7개 테이블)
  - users, app_settings, mail_processing_logs, terms, term_source_files, stop_words, analysis_queue
  - `src/db/index.ts` DB 연결 싱글톤 생성 (WAL 모드, FTS5 초기화)
  - Drizzle Kit 설정 (`drizzle.config.ts`)
  - `npm run db:push` 실행 — `data/app.db` 생성 완료

- ✅ **T1-4: 초기 관리자 계정 자동 생성 로직** [복잡도: 소]
  - `src/instrumentation.ts` — Next.js 서버 초기화 훅
  - `src/lib/auth/seed-admin.ts` — 관리자 계정 생성 로직
  - ADMIN_USERNAME, ADMIN_PASSWORD 환경변수 기반 자동 생성
  - 이미 존재하면 건너뜀 (멱등성 보장), bcrypt 해싱 적용

- ✅ **T1-5: 로그인 화면 UI (LOGIN-001)** [복잡도: 중]
  - `src/app/login/page.tsx` 생성
  - 서비스 로고/이름, 아이디 입력, 비밀번호 입력, 로그인 버튼
  - 화면 중앙 정렬 레이아웃 (UI-R-007), 반응형 디자인 (360px~)
  - 클라이언트 유효성 검사 (`src/lib/validators/auth.ts`)
  - 로딩 상태 (버튼 스피너), 오류 메시지, Enter 키 제출 지원
  - label 요소 연결 (UI-R-021)

#### 완료 기준 (Definition of Done)
- ✅ Next.js 16.1.6 프로젝트가 `npm run dev`로 정상 실행됨
- ✅ 모든 7개 테이블의 Drizzle 스키마가 정의되고 마이그레이션이 성공함
- ✅ 서버 시작 시 관리자 계정이 DB에 자동 생성됨
- ✅ `/login` 경로에서 로그인 폼이 렌더링됨 (API 미연결 상태)
- ✅ 클라이언트 유효성 검사가 동작함
- ✅ `npm run build` 에러 없이 완료됨
- ✅ `npm run lint` 에러 없음

#### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**로그인 화면 렌더링 검증:**
1. `browser_navigate` -> `http://localhost:3000/login` 접속
2. `browser_snapshot` -> 로그인 폼 요소 존재 확인 (아이디 입력, 비밀번호 입력, 로그인 버튼)
3. `browser_click` -> 로그인 버튼 클릭 (빈 입력 상태)
4. `browser_snapshot` -> 유효성 오류 메시지 표시 확인
5. `browser_type` -> 아이디 필드에 "ab" 입력 (4자 미만)
6. `browser_click` -> 로그인 버튼 클릭
7. `browser_snapshot` -> 아이디 유효성 오류 메시지 확인
8. `browser_console_messages` -> 콘솔 에러 없음 확인
9. `browser_resize` -> 360px 너비로 변경
10. `browser_snapshot` -> 모바일 레이아웃 정상 확인

**공통 검증 항목:**
- `browser_navigate`로 각 페이지 접속 후 `browser_snapshot`으로 렌더링 확인
- `browser_console_messages(level: "error")`로 콘솔 에러 없음 확인

#### 기술 고려사항
- Drizzle ORM의 SQLite 드라이버로 `better-sqlite3` 사용 (동기식)
- 스키마 정의 시 TEXT 타입으로 UUID, ISO 8601 날짜 저장
- `data/` 디렉터리 자동 생성 보장 (CMN-FS-001 참고)

---

### Sprint 2: 로그인 API + 세션 + 인증 미들웨어 + 사용자 관리 (2주) — ✅ 완료 (2026-03-15)

#### 작업 목록

- ✅ **T2-1: iron-session 세션 관리 구현 (CMN-SESSION-001)** [복잡도: 중]
  - `lib/auth/session.ts` 생성
  - iron-session 설정 (쿠키명: `mail-term-session`, 유효기간 24시간, HTTP-only)
  - 세션 데이터 타입 정의: `{ userId, username, role }`
  - 세션 생성/삭제/검증 유틸리티 함수

- ✅ **T2-2: 인증 API 구현** [복잡도: 중]
  - `POST /api/auth/login` (AUTH-001): 아이디/비밀번호 검증, bcrypt 비교, 세션 생성
  - `POST /api/auth/logout` (AUTH-002): 세션 삭제
  - `GET /api/auth/me` (AUTH-003): 현재 세션 사용자 정보 반환
  - 통합 로그인 실패 메시지 (AUTH-R-011)
  - 소프트 삭제된 사용자 로그인 차단

- ✅ **T2-3: Next.js 인증 미들웨어** [복잡도: 중]
  - `proxy.ts` 생성 (Next.js 16 미들웨어)
  - 인증 필요 경로 보호 (인증 없으면 `/login`으로 리다이렉트)
  - public 경로(/login, /api/auth/login) 제외 세션 검증
  - API 경로는 401 반환 (AUTH-R-012)

- ✅ **T2-4: 로그인 화면 API 연동** [복잡도: 소]
  - Sprint 1의 로그인 UI에 API 호출 연결
  - 로그인 성공 시 `/dashboard`로 리다이렉트
  - 실패 시 오류 메시지 표시

- ✅ **T2-5: 대시보드 플레이스홀더** [복잡도: 소]
  - `app/(authenticated)/dashboard/page.tsx` 생성
  - 로그인 후 진입하는 기본 화면 플레이스홀더

- ✅ **T2-6: 사용자 관리 API 구현** [복잡도: 중] — Sprint 3에서 완료
  - `GET /api/users` (USER-001): 사용자 목록 조회 (소프트 삭제 제외, admin 전용)
  - `POST /api/users` (USER-002): 사용자 등록 (admin 전용, 유효성 검사, bcrypt 해싱)
  - `DELETE /api/users/:id` (USER-003): 사용자 소프트 삭제 (admin 전용, 자기 자신 삭제 불가)

- ✅ **T2-7: 사용자 관리 화면 (ADMIN-001)** [복잡도: 중] — Sprint 3에서 완료
  - `app/(authenticated)/admin/users/page.tsx` 생성

- ✅ **T2-8: 공통 레이아웃 기초** [복잡도: 소] — Sprint 3에서 완료 (T3-1에 흡수)
  - `app/(authenticated)/layout.tsx` 기초 생성 (GNB 플레이스홀더)
  - 토스트 알림 컴포넌트 기초 구현 (성공/오류/정보, 3초 자동 사라짐)

#### 완료 기준 (Definition of Done)
- ✅ 관리자 계정으로 로그인하여 세션이 생성되고 /dashboard로 이동됨
- ✅ 인증되지 않은 상태에서 보호된 페이지 접근 시 `/login`으로 리다이렉트됨
- ✅ 잘못된 비밀번호 입력 시 "아이디 또는 비밀번호가 일치하지 않습니다." 오류 표시됨
- ✅ 로그아웃 후 /login으로 이동됨
- ✅ `npm run build` 에러 없이 완료됨
- ✅ `npm run lint` 에러 없음
- ✅ 사용자 관리 화면에서 사용자 등록/목록 조회/삭제 동작 — Sprint 3에서 완료

#### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**로그인 흐름 검증:**
1. `browser_navigate` -> `http://localhost:3000/login` 접속
2. `browser_fill_form` -> 관리자 아이디/비밀번호 입력
3. `browser_click` -> 로그인 버튼 클릭
4. `browser_wait_for` -> `/` 경로로 이동 대기
5. `browser_snapshot` -> 대시보드(또는 인증 후 기본 화면) 렌더링 확인
6. `browser_network_requests` -> `POST /api/auth/login` 200 응답 확인

**인증 미들웨어 검증:**
7. `browser_navigate` -> `http://localhost:3000/admin/users` 접속 (로그인 상태)
8. `browser_snapshot` -> 사용자 관리 화면 렌더링 확인
9. `browser_navigate` -> `http://localhost:3000/api/auth/logout` POST 호출 후
10. `browser_navigate` -> `http://localhost:3000/admin/users` 접속
11. `browser_snapshot` -> `/login`으로 리다이렉트 확인

**사용자 관리 검증:**
12. (관리자 로그인 후) `browser_navigate` -> `http://localhost:3000/admin/users`
13. `browser_snapshot` -> 사용자 목록 테이블 확인
14. `browser_click` -> "사용자 등록" 버튼 클릭
15. `browser_fill_form` -> 테스트 사용자 정보 입력
16. `browser_click` -> "등록" 버튼 클릭
17. `browser_wait_for` -> "사용자가 등록되었습니다" 토스트 대기
18. `browser_snapshot` -> 목록에 새 사용자 표시 확인

**공통 검증 항목:**
- `browser_console_messages(level: "error")`로 콘솔 에러 없음 확인
- `browser_network_requests`로 API 호출 성공(200/201) 확인

#### 기술 고려사항
- iron-session 암호화 키는 `SESSION_SECRET` 환경변수 (32자 이상)
- bcrypt salt rounds: 10 (AUTH-R-007)
- middleware.ts에서 matcher 패턴으로 보호할 경로 지정
- API 응답 구조는 `{ success, data, message }` 형식 통일

---

## Phase 2: 관리자 기능 + 공통 UI (Sprint 3-4)

### 목표
관리자 전용 환경설정 화면과 대시보드를 구현한다. GNB(Global Navigation Bar)와 공통 레이아웃을 완성하여 서비스의 전체 네비게이션 구조를 확립한다.

---

### Sprint 3: GNB + 환경설정 화면/API (2주) — ✅ 완료 (2026-03-15)

#### 작업 목록

- ✅ **T3-1: GNB (Global Navigation Bar) 구현** [복잡도: 중]
  - 서비스 로고/제목 (클릭 시 `/` 이동)
  - 대시보드 링크 (항상)
  - 용어사전 링크 (항상)
  - 환경설정 링크 (admin만 표시)
  - 사용자 관리 링크 (admin만 표시)
  - 현재 로그인 사용자명 및 역할 표시
  - 로그아웃 버튼
  - 현재 활성 화면 하이라이트
  - md(768px) 미만 햄버거 메뉴 전환

- ✅ **T3-2: 토스트 알림 시스템 완성** [복잡도: 소]
  - 성공(녹색), 오류(빨간색), 정보(파란색) 타입
  - 3초 후 자동 사라짐 (UI-R-020)
  - 화면 우상단 배치
  - Context API 또는 zustand로 전역 상태 관리

- ✅ **T3-3: 환경설정 관리 기능 (CMN-CFG-001)** [복잡도: 소]
  - `lib/config/settings-service.ts` 생성
  - app_settings 테이블 CRUD (키-값 저장/조회)
  - 환경변수와의 통합 관리 (DB 설정 + .env.local 환경변수)

- ✅ **T3-4: 환경설정 API 구현** [복잡도: 중]
  - `GET /api/config` (CFG-001): 현재 설정값 조회 (admin 전용, 민감정보 마스킹 AUTH-R-020)
  - `PUT /api/config` (CFG-002): 설정값 수정 (admin 전용, 유효성 검사)
  - `POST /api/config/test-mail` (CFG-003): IMAP 연결 테스트 (10초 타임아웃)
  - 비밀번호/API 키 설정 여부만 boolean으로 반환

- ✅ **T3-5: 환경설정 화면 (SET-001)** [복잡도: 중]
  - `app/(authenticated)/settings/page.tsx` 생성
  - 메일 서버 설정: IMAP 호스트, 포트, 아이디, SSL/TLS 토글
  - IMAP 비밀번호 상태 표시 (설정됨/미설정 뱃지)
  - 메일 확인 주기 입력 (분 단위, 최소 1분)
  - 연결 테스트 버튼 (10초 타임아웃, 로딩 상태)
  - AI 분석 설정: 모델명, API 키 상태 표시
  - 저장 버튼/취소 버튼 (변경 감지)
  - 클라이언트 유효성 검사
  - 비밀번호/API 키 변경 안내 문구 ("서버의 .env.local에서 설정")
  - 일반 사용자 접근 시 403 처리

#### 완료 기준 (Definition of Done)
- ✅ 모든 인증 후 화면에서 GNB가 표시되며, 역할에 따라 메뉴가 다르게 보임
- ✅ 모바일에서 햄버거 메뉴가 정상 동작함
- ✅ 관리자가 환경설정 화면에서 IMAP 설정을 저장할 수 있음
- ✅ 메일 서버 연결 테스트가 동작함 (성공/실패 토스트 표시)
- ✅ 민감정보(비밀번호, API 키)가 API 응답에 노출되지 않음
- ✅ 사용자 관리 화면에서 사용자 등록/목록 조회/삭제 동작
- ✅ `npm run build` 에러 없이 완료됨
- ✅ `npm run lint` 에러 없음

#### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**GNB 검증:**
1. `browser_navigate` -> `http://localhost:3000/` (관리자 로그인 상태)
2. `browser_snapshot` -> GNB 요소 확인 (대시보드, 용어사전, 환경설정, 사용자 관리, 로그아웃)
3. `browser_click` -> 용어사전 링크 클릭
4. `browser_snapshot` -> `/dictionary` 경로 이동 확인
5. `browser_resize` -> 360px 너비
6. `browser_snapshot` -> 햄버거 메뉴 아이콘 표시 확인

**환경설정 검증:**
7. `browser_navigate` -> `http://localhost:3000/settings`
8. `browser_snapshot` -> 환경설정 폼 렌더링 확인 (IMAP 호스트, 포트, 모델명 등)
9. `browser_fill_form` -> IMAP 설정값 입력
10. `browser_click` -> "설정 저장" 버튼 클릭
11. `browser_wait_for` -> "설정이 저장되었습니다" 토스트 대기
12. `browser_network_requests` -> `PUT /api/config` 200 응답 확인
13. `browser_click` -> "연결 테스트" 버튼 클릭
14. `browser_snapshot` -> 연결 테스트 결과 토스트 확인
15. `browser_console_messages(level: "error")` -> 콘솔 에러 없음 확인

#### 기술 고려사항
- GNB는 Server Component에서 세션 정보를 가져와 역할별 메뉴 분기
- 환경설정 조회 시 `process.env`에서 MAIL_PASSWORD, GEMINI_API_KEY 존재 여부만 확인
- 연결 테스트는 imapflow로 실제 IMAP 서버에 접속 시도

---

### Sprint 4: 대시보드 화면 + 서비스 상태 API (2주) — ✅ 완료 (2026-03-15)

#### 작업 목록

- ✅ **T4-1: 로깅 기능 (CMN-LOG-001)** [복잡도: 소]
  - `lib/logger/index.ts` 생성
  - 구조화된 로그 기록 (timestamp, level, message, context)
  - 로그 레벨: debug, info, warn, error
  - 콘솔 출력 (개발 환경)

- ✅ **T4-2: 서비스 상태 조회 API 구현** [복잡도: 중]
  - `GET /api/mail/status` (MAIL-001): 스케줄러 상태, 마지막 실행 시점/결과, IMAP/API 키 설정 상태
  - 앱 상태 정보 조회 기능 (VIEW-STATE-001) 구현
  - mail_processing_logs 테이블에서 최근 로그 조회

- ✅ **T4-3: 분석 결과 API 구현** [복잡도: 중]
  - `GET /api/analysis/latest` (ANAL-001): 최신 완료 분석 결과 1건 (summary, action_items, 추출 용어)
  - `GET /api/analysis/history` (ANAL-002): 분석 이력 목록 (페이지네이션, 최신순 정렬)
  - analysis_queue + terms 조인 쿼리

- ✅ **T4-4: 대시보드 화면 (DASH-001)** [복잡도: 높음]
  - `app/(authenticated)/page.tsx` 생성
  - 서비스 상태 카드: 스케줄러 상태 뱃지, 메일 확인 주기, IMAP/API 키 설정 상태 뱃지, 마지막 실행 정보
  - 설정 미완료 배너 (admin에게 설정 링크, user에게 "관리자에게 문의" 문구)
  - 최신 분석 결과 영역: 메일 제목, 수신일, 요약, 후속 작업, 추출 용어 수, 상세 보기 링크
  - 분석 이력 목록: 최신순 정렬, 상태 뱃지(completed/failed/processing/pending), 페이지네이션
  - 수동 메일 확인 버튼 (admin 전용, 확인 다이얼로그)
  - 빈 상태 표시 ("아직 분석된 메일이 없습니다")
  - 스켈레톤 로딩 UI
  - 3개 영역(상태/최신 결과/이력) 병렬 데이터 조회

- ✅ **T4-5: 수동 메일 확인 트리거 API** [복잡도: 소]
  - `POST /api/mail/check` (MAIL-002): 배치 분석 수동 트리거 (admin 전용)
  - 이미 실행 중이면 409 반환
  - 비동기 실행 후 즉시 응답

#### 완료 기준 (Definition of Done)
- ✅ 대시보드에서 서비스 상태(스케줄러, IMAP, API 키)가 표시됨
- ✅ IMAP/API 키 미설정 시 경고 배너가 표시됨
- ✅ 분석 이력이 있을 때 최신 결과와 이력 목록이 표시됨
- ✅ 분석 이력이 없을 때 빈 상태가 적절히 표시됨
- ✅ 수동 메일 확인 버튼이 admin에게만 표시되고, 클릭 시 트리거됨

#### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**대시보드 렌더링 검증:**
1. `browser_navigate` -> `http://localhost:3000/` (관리자 로그인 상태)
2. `browser_snapshot` -> 서비스 상태 카드 렌더링 확인 (스케줄러 상태, IMAP 상태, API 키 상태)
3. `browser_snapshot` -> 설정 미완료 배너 확인 (IMAP 미설정 시)
4. `browser_snapshot` -> 빈 상태 메시지 확인 ("아직 분석된 메일이 없습니다")
5. `browser_network_requests` -> `/api/mail/status`, `/api/analysis/latest`, `/api/analysis/history` 200 응답 확인

**수동 메일 확인 검증 (admin):**
6. `browser_click` -> "메일 확인 실행" 버튼 클릭
7. `browser_snapshot` -> 확인 다이얼로그 표시 확인
8. `browser_click` -> 확인 버튼 클릭
9. `browser_wait_for` -> 토스트 메시지 대기
10. `browser_console_messages(level: "error")` -> 콘솔 에러 없음 확인

**반응형 검증:**
11. `browser_resize` -> 360px 너비
12. `browser_snapshot` -> 모바일 레이아웃 확인

#### 기술 고려사항
- 대시보드의 3개 데이터 소스는 `Promise.all()`로 병렬 페칭
- 스켈레톤 UI는 Tailwind의 `animate-pulse` 활용
- 수동 메일 확인은 비동기 실행 (API는 즉시 응답, 백그라운드에서 처리)

---

## Phase 3: 백엔드 핵심 로직 (Sprint 5-6)

### 목표
메일 수신, 용어 추출, Claude API 해설 생성, 배치 분석 파이프라인을 구현한다. 이 단계가 완료되면 실제 메일에서 용어를 추출하고 해설을 생성하여 DB에 저장하는 전체 백엔드 흐름이 동작한다.

---

### Sprint 5: 메일 수신 + 파일 저장 + 스케줄러 (2주) — ✅ 완료 (2026-03-15)

#### 작업 목록

- ✅ **T5-1: 파일 시스템 관리 기능 (CMN-FS-001)** [복잡도: 소]
  - `lib/fs/file-manager.ts` 생성
  - 파일 읽기/쓰기/삭제, 디렉터리 보장 (존재하지 않으면 생성)
  - 경로 보안 검증 (디렉터리 탈출 방지)
  - `./data/mails/`, `./data/terms/` 경로 초기화

- ✅ **T5-2: HTTP 재시도 기능 (CMN-HTTP-001)** [복잡도: 소]
  - `lib/http/retry.ts` 생성
  - 지수 백오프 재시도 (최대 3회, 1s/2s/4s 대기)
  - 외부 API 호출 시 사용 (Claude API, IMAP 연결)

- ✅ **T5-3: IMAP 메일 수신 기능 (MAIL-RECV-001)** [복잡도: 높음]
  - `lib/mail/imap-receiver.ts` 생성
  - imapflow로 IMAP 서버 접속 (SSL/TLS 필수)
  - INBOX에서 UNSEEN 메일 목록 조회
  - 메일 UID 기반 중복 수신 방지
  - 접속 실패 시 에러 반환 (SERVICE_UNAVAILABLE)
  - 환경변수에서 IMAP 인증 정보 조회

- ✅ **T5-4: 메일 내용 추출 기능 (MAIL-PROC-001)** [복잡도: 중]
  - `lib/mail/mail-parser.ts` 생성
  - 메일 제목/본문 텍스트 추출
  - HTML-to-Text 변환 (html-to-text 패키지)
  - 첨부파일 무시 (텍스트 본문만 대상)

- ✅ **T5-5: 분석 요청 파일 생성 기능 (DATA-FILE-001)** [복잡도: 소]
  - `lib/data/analysis-file.ts` 생성
  - 메일 텍스트를 `./data/mails/{timestamp}_{uid}.txt` 형식으로 저장
  - analysis_queue 테이블에 pending 상태로 등록

- ✅ **T5-6: 메일 상태 갱신 기능 (MAIL-PROC-002)** [복잡도: 소]
  - IMAP SEEN 플래그 설정
  - mail_processing_logs 테이블에 수신 이력 기록

- ✅ **T5-7: 백그라운드 스케줄러 (SCHED-001)** [복잡도: 중]
  - `lib/scheduler/cron-scheduler.ts` 생성
  - `instrumentation.ts`에서 서버 시작 시 초기화
  - node-cron 기반 주기적 실행 (MAIL_CHECK_INTERVAL)
  - 서버 시작 시 최초 1회 즉시 실행 (MAIL-R-005)
  - 싱글톤 패턴, `global.__scheduler` HMR 중복 방지
  - Graceful Shutdown (process.on('SIGTERM'))

- ✅ **T5-8: 처리 완료 파일 관리 기능 (DATA-FILE-002)** [복잡도: 소]
  - 30일 경과 메일 임시 파일 삭제
  - 90일 경과 mail_processing_logs 하드 삭제

#### 완료 기준 (Definition of Done)
- ✅ 스케줄러가 서버 시작 시 자동으로 1회 실행됨
- ✅ IMAP 서버에서 읽지 않은 메일을 수신하여 `./data/mails/`에 텍스트 파일로 저장함
- ✅ analysis_queue 테이블에 pending 상태로 등록됨
- ✅ 메일 수신 이력이 mail_processing_logs에 기록됨
- ✅ IMAP 미설정 시 에러 없이 건너뜀
- ✅ 30일/90일 경과 파일/로그가 정리됨

#### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**서비스 상태 확인:**
1. `browser_navigate` -> `http://localhost:3000/` (관리자 로그인 상태)
2. `browser_snapshot` -> 서비스 상태 카드에서 스케줄러 "실행 중" 확인
3. `browser_network_requests` -> `/api/mail/status` 응답에서 scheduler 상태 확인

**수동 메일 확인 트리거 후 결과:**
4. `browser_click` -> "메일 확인 실행" 버튼 클릭
5. `browser_click` -> 확인 다이얼로그 "확인" 클릭
6. `browser_wait_for` -> 토스트 메시지 "메일 확인이 시작되었습니다" 대기
7. (5초 대기 후) `browser_navigate` -> `http://localhost:3000/` 새로고침
8. `browser_snapshot` -> 마지막 메일 수신 시간 갱신 확인
9. `browser_console_messages(level: "error")` -> 콘솔 에러 없음 확인

#### 기술 고려사항
- imapflow는 비동기 API이므로 async/await 패턴 사용
- `instrumentation.ts`는 Next.js 15의 서버 초기화 훅
- 개발 환경 HMR에서 스케줄러 중복 방지 필수 (`global.__scheduler`)
- html-to-text 패키지로 HTML 메일 본문을 순수 텍스트로 변환

---

### Sprint 6: 용어 분석 파이프라인 (2주) — ✅ 완료 (2026-03-15)

#### 작업 목록

- ✅ **T6-1: 개인정보 필터링 기능 (TERM-PII-001)** [복잡도: 중]
  - `lib/analysis/pii-filter.ts` 생성
  - 이메일 주소, 전화번호, 주민등록번호 등 개인정보 패턴 마스킹
  - 정규식 기반 패턴 매칭

- ✅ **T6-2: Claude API 호출 래퍼** [복잡도: 중]
  - `lib/analysis/gemini-client.ts` 생성
  - @google/generative-ai 래퍼 (API 키 환경변수 조회, 모델명 설정 조회)
  - HTTP 재시도 적용 (CMN-HTTP-001)
  - API 키 미설정 시 SERVICE_UNAVAILABLE 에러

- ✅ **T6-3: 용어 추출 기능 (TERM-EXT-001)** [복잡도: 높음]
  - `lib/analysis/term-extractor.ts` 생성
  - Claude API로 메일 본문에서 EMR/비즈니스/약어 용어 추출
  - 프롬프트 설계: 용어명, 카테고리(emr/business/abbreviation/general), 해설 요청
  - 응답 JSON 파싱 및 유효성 검증

- ✅ **T6-4: 불용어 필터링 기능 (TERM-EXT-002)** [복잡도: 소]
  - `lib/analysis/stopword-filter.ts` 생성
  - stop_words 테이블에서 불용어 목록 조회
  - 추출된 용어에서 불용어 제거

- ✅ **T6-5: 용어 분류 기능 (TERM-CLS-001)** [복잡도: 소]
  - Claude API 응답에 포함된 category 값 검증
  - emr/business/abbreviation/general 중 하나로 분류

- ✅ **T6-6: 해설 생성 기능 (TERM-GEN-001)** [복잡도: 중]
  - Claude API로 메일 요약(500자 이내) + 후속 작업 제안(최대 5개) 생성
  - 용어별 한국어 해설 생성
  - 프롬프트 설계: 한국어 해설, EMR 시스템 컨텍스트 포함

- ✅ **T6-7: 용어 사전 저장소 기능 (DATA-DICT-001)** [복잡도: 중]
  - `lib/dictionary/dictionary-store.ts` 생성
  - 용어-해설 쌍 DB 저장 (terms 테이블)
  - 용어 해설집 파일 저장 (`./data/terms/{용어}.md`)
  - 기존 용어 갱신 판단 (이름 기준 중복 시 빈도 증가, 해설 업데이트)
  - term_source_files 테이블에 출처 메일 정보 기록
  - SQLite FTS5 인덱스 동기화

- ✅ **T6-8: 배치 분석 오케스트레이션 (TERM-BATCH-001)** [복잡도: 높음]
  - `lib/analysis/batch-analyzer.ts` 생성
  - Phase 1: 메일 수신 (MAIL-RECV -> MAIL-PROC -> DATA-FILE)
  - Phase 2: 용어 분석 (PII 필터 -> 용어 추출 -> 해설 생성 -> 사전 저장)
  - Phase 3: 정리 (만료 파일 삭제)
  - 중복 실행 방지 (모듈 레벨 `isRunning` 잠금)
  - 개별 파일 실패가 전체 배치 중단하지 않음
  - 재시도 정책: retry_count < 3이면 다음 주기에 재시도
  - 대기열 상태 전이: pending -> processing -> completed/failed
  - analysis_queue에 summary, action_items 저장

#### 완료 기준 (Definition of Done)
- ✅ 메일 수신부터 용어 추출/해설 생성까지 전체 파이프라인이 자동 동작함
- ✅ terms 테이블에 추출된 용어와 해설이 저장됨
- ✅ `./data/terms/` 디렉터리에 `{용어}.md` 파일이 생성됨
- ✅ analysis_queue의 상태가 pending -> processing -> completed로 정상 전이됨
- ✅ 분석 실패 시 failed 상태로 기록되고 재시도 카운트가 증가함
- ✅ API 키 미설정 시 에러 없이 분석을 건너뜀

#### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**배치 분석 결과 확인 (대시보드):**
1. `browser_navigate` -> `http://localhost:3000/` (관리자 로그인, IMAP/API 키 설정 완료 상태)
2. `browser_click` -> "메일 확인 실행" 버튼 클릭 -> 확인
3. `browser_wait_for` -> 토스트 "메일 확인이 시작되었습니다" 대기
4. (충분히 대기 후) `browser_navigate` -> `http://localhost:3000/` 새로고침
5. `browser_snapshot` -> 최신 분석 결과 영역에 메일 제목, 요약, 추출 용어 수 표시 확인
6. `browser_snapshot` -> 분석 이력 목록에 completed 상태 항목 확인
7. `browser_network_requests` -> `/api/analysis/latest`, `/api/analysis/history` 200 응답 + 데이터 확인
8. `browser_console_messages(level: "error")` -> 콘솔 에러 없음 확인

#### 기술 고려사항
- Claude API 호출은 순차 처리 (rate limit 방지)
- 프롬프트는 JSON 형식 응답을 요구하여 파싱 안정성 확보
- FTS5 인덱스는 terms 테이블의 name + description에 적용
- 배치 실행 중 DB 트랜잭션으로 원자성 보장

---

## Phase 4: 프론트엔드 완성 (Sprint 7-8)

### 목표
용어사전 뷰어(검색/상세)와 업무지원 상세 화면을 구현하고, 대시보드와의 연동을 완성한다. 이 단계가 완료되면 모든 사용자 화면이 동작한다.

---

### Sprint 7: 용어사전 뷰어 + 검색 + 트렌드 (2주) — ✅ 완료 (2026-03-15)

#### 작업 목록

- ✅ **T7-1: 용어 검색 API (DICT-001)** [복잡도: 중]
  - `GET /api/dictionary/search`: FTS5 전문 검색, 카테고리 필터, 페이지네이션
  - 검색 정렬: FTS5 관련도 우선, 동일 관련도이면 빈도 내림차순
  - VIEW-SEARCH-001 기능 구현

- ✅ **T7-2: 빈도 트렌드 API (DICT-002)** [복잡도: 소]
  - `GET /api/dictionary/trending`: 빈도 상위 10개 용어 목록
  - VIEW-TREND-001 기능 구현

- ✅ **T7-3: 용어 상세 API (DICT-003)** [복잡도: 소]
  - `GET /api/dictionary/terms/:id`: 용어 상세 정보 + 출처 메일 목록 (최신순 최대 10건)

- ✅ **T7-4: 용어사전 뷰어 화면 (DICT-001)** [복잡도: 높음]
  - `app/(authenticated)/dictionary/page.tsx` 생성
  - 구글 검색창 스타일 검색 입력 (autofocus, placeholder: "용어를 검색하세요")
  - 300ms 디바운스 실시간 검색 (UI-R-012)
  - 카테고리 필터 (전체/EMR/비즈니스/약어/일반)
  - 검색 결과 카드 목록: 용어명, 카테고리 뱃지, 해설 미리보기(200자), 빈도, 갱신일
  - 카테고리별 색상 뱃지 (emr:파란/business:녹색/abbreviation:주황/general:회색)
  - 페이지네이션 (20건 단위)
  - 빈도 트렌드 영역: 상위 10개 용어 태그 바로가기
  - 검색어 비어 있으면 트렌드만 표시
  - 검색 결과 0건: "검색 결과가 없습니다" (UI-R-013)
  - 스켈레톤 로딩 UI

- ✅ **T7-5: 용어 상세 화면 (DICT-002)** [복잡도: 중]
  - `app/(authenticated)/dictionary/[id]/page.tsx` 생성
  - 용어 기본 정보: 용어명(h1), 카테고리 뱃지, 빈도, 최초 추출일, 최근 갱신일
  - 해설 전문 표시 (잘라내지 않음)
  - 출처 메일 목록 (메일 제목 + 수신 일시, 최신순 최대 10건)
  - 뒤로가기 버튼
  - 404 처리 ("요청하신 용어를 찾을 수 없습니다")
  - 스켈레톤 로딩 UI

#### 완료 기준 (Definition of Done)
- ✅ 용어사전 뷰어에서 키워드 검색 시 300ms 디바운스로 실시간 결과가 표시됨
- ✅ 카테고리 필터 변경 시 결과가 재필터링됨
- ✅ 빈도 트렌드 태그를 클릭하면 해당 용어 상세 화면으로 이동함
- ✅ 용어 상세 화면에서 해설 전문과 출처 메일 목록이 표시됨
- ✅ 페이지네이션이 20건 초과 시 정상 동작함

#### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**용어사전 뷰어 검증:**
1. `browser_navigate` -> `http://localhost:3000/dictionary` (로그인 상태)
2. `browser_snapshot` -> 검색 입력 필드, 트렌드 용어 태그 표시 확인
3. `browser_type` -> 검색 입력에 "EMR" 입력
4. `browser_wait_for` -> 검색 결과 목록 표시 대기 (300ms 디바운스 후)
5. `browser_snapshot` -> 검색 결과 카드 확인 (용어명, 카테고리 뱃지, 해설 미리보기)
6. `browser_click` -> 카테고리 필터 "EMR" 선택
7. `browser_snapshot` -> 필터링된 결과 확인
8. `browser_click` -> 첫 번째 검색 결과 카드 클릭
9. `browser_wait_for` -> `/dictionary/` 경로로 이동 대기
10. `browser_snapshot` -> 용어 상세 화면 확인 (용어명, 해설 전문, 출처 메일)

**빈 검색 결과 검증:**
11. `browser_navigate` -> `http://localhost:3000/dictionary`
12. `browser_type` -> "존재하지않는용어12345" 입력
13. `browser_wait_for` -> "검색 결과가 없습니다" 텍스트 대기
14. `browser_snapshot` -> 빈 상태 메시지 확인
15. `browser_console_messages(level: "error")` -> 콘솔 에러 없음 확인

**트렌드 용어 바로가기:**
16. `browser_navigate` -> `http://localhost:3000/dictionary`
17. `browser_snapshot` -> 트렌드 용어 태그 확인
18. `browser_click` -> 첫 번째 트렌드 용어 태그 클릭
19. `browser_snapshot` -> 용어 상세 화면 이동 확인

#### 기술 고려사항
- FTS5 검색은 서버 사이드에서 수행, 클라이언트는 디바운스만 담당
- 검색 URL 파라미터 동기화 (`?q=keyword&category=emr&page=1`)
- 해설 미리보기 200자 자르기는 서버에서 처리

---

### Sprint 8: 업무지원 상세 + 대시보드 연동 완성 (2주) — ✅ 완료 (2026-03-15)

#### 작업 목록

- ✅ **T8-1: 업무지원 상세 화면 (WORK-001)** [복잡도: 중]
  - `app/(authenticated)/work/[id]/page.tsx` 생성
  - 헤더: 뒤로가기 버튼, "업무지원 상세" 제목
  - 메일 정보: 메일 제목, 수신일, 분석 완료일, 상태 뱃지
  - 요약 영역: 핵심 요약 텍스트 (status=completed일 때만)
  - 후속 작업 영역: 최대 5개 항목 체크리스트 스타일
  - 추출 용어 영역: 카테고리별 색상 태그, 클릭 시 DICT-002로 이동
  - 분석 실패 영역: 오류 메시지 + 재시도 횟수 (status=failed)
  - 분석 중/대기 중 상태 표시
  - 404 처리
  - 스켈레톤 로딩 UI

- ✅ **T8-2: 대시보드 -> 업무지원 상세 연동** [복잡도: 소]
  - 최신 분석 결과 "상세 보기" 링크 -> `/work/{id}` 이동
  - 분석 이력 목록 항목 클릭 -> `/work/{id}` 이동

- ✅ **T8-3: 업무지원 상세 -> 용어 상세 연동** [복잡도: 소]
  - 추출 용어 태그 클릭 -> `/dictionary/{termId}` 이동

- ✅ **T8-4: 전체 화면 네비게이션 검증 및 수정** [복잡도: 소]
  - 모든 화면 간 이동 경로 테스트
  - 뒤로가기 동작 확인
  - GNB 활성 메뉴 하이라이트 정확성 확인

- ✅ **T8-5: 날짜/시간 표시 통일** [복잡도: 소]
  - 모든 화면에서 "YYYY-MM-DD HH:mm" 형식 적용 (UI-R-015)
  - 공통 날짜 포맷 유틸리티 함수 (`src/lib/utils/date.ts`)

#### 완료 기준 (Definition of Done)
- ✅ 대시보드에서 분석 결과 클릭 시 업무지원 상세 화면으로 이동함
- ✅ 업무지원 상세에서 요약, 후속 작업, 추출 용어가 정상 표시됨
- ✅ 추출 용어 태그 클릭 시 용어 상세 화면으로 이동함
- ✅ 모든 화면 간 네비게이션이 사양 문서대로 동작함
- ✅ 모든 날짜/시간이 "YYYY-MM-DD HH:mm" 형식으로 통일됨

#### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**업무지원 상세 검증:**
1. `browser_navigate` -> `http://localhost:3000/` (로그인 상태, 분석 결과 있는 상태)
2. `browser_click` -> 최신 분석 결과 "상세 보기" 링크 클릭
3. `browser_wait_for` -> `/work/` 경로 이동 대기
4. `browser_snapshot` -> 메일 제목, 요약, 후속 작업, 추출 용어 표시 확인
5. `browser_click` -> 추출 용어 태그 클릭
6. `browser_wait_for` -> `/dictionary/` 경로 이동 대기
7. `browser_snapshot` -> 용어 상세 화면 확인
8. `browser_click` -> 뒤로가기 버튼
9. `browser_snapshot` -> 업무지원 상세 복귀 확인

**분석 이력 연동:**
10. `browser_navigate` -> `http://localhost:3000/`
11. `browser_click` -> 이력 목록 항목 클릭
12. `browser_snapshot` -> 업무지원 상세 화면 이동 확인

**전체 네비게이션 흐름:**
13. `browser_navigate` -> `http://localhost:3000/`
14. `browser_click` -> GNB "용어사전" 클릭
15. `browser_snapshot` -> `/dictionary` 확인
16. `browser_click` -> GNB "대시보드" 클릭
17. `browser_snapshot` -> `/` 확인
18. `browser_console_messages(level: "error")` -> 콘솔 에러 없음 확인

#### 기술 고려사항
- 업무지원 상세 화면의 action_items는 JSON 파싱 필요 (TEXT 컬럼에 JSON 저장)
- 용어 태그 색상은 Tailwind 유틸리티 클래스로 분기

---

## Phase 5: 안정화 및 배포 (Sprint 9-10)

### 목표
전체 시스템의 에러 처리, 접근성, 성능을 개선하고 배포 환경을 구성한다.

---

### Sprint 9: 에러 처리 + 접근성 + FTS5 최적화 (2주) — ✅ 완료 (2026-03-15)

#### 작업 목록

- ✅ **T9-1: 전역 에러 처리 강화** [복잡도: 중]
  - API Route 공통 에러 핸들러 (에러 코드 체계 적용)
  - 사용자 친화적 에러 메시지 (UI-R-019, 스택 트레이스 미노출)
  - 네트워크 오류 시 재시도 안내
  - `app/error.tsx`, `app/not-found.tsx` 에러 페이지 구현

- ✅ **T9-2: 접근성 검증 및 개선** [복잡도: 중]
  - 모든 폼에 label 연결 확인 (UI-R-021)
  - 키보드 네비게이션 테스트 (UI-R-022)
  - 색상 대비 WCAG 2.1 AA 기준 확인 (UI-R-023)
  - 터치 대상 최소 44x44px 확인 (UI-R-006)
  - aria 속성 추가 (버튼, 뱃지, 알림 등)

- ✅ **T9-3: FTS5 인덱스 최적화** [복잡도: 소]
  - 용어 검색 성능 측정 및 인덱스 최적화
  - 검색 결과 하이라이팅 적용

- ✅ **T9-4: 용어 사전 백업 기능 (DATA-DICT-002)** [복잡도: 소]
  - 용어 해설집 파일 무결성 검증
  - DB-파일 간 동기화 (DB에 있지만 파일 없는 경우 재생성)

- ✅ **T9-5: 반응형 레이아웃 최종 점검** [복잡도: 소]
  - 모든 화면 모바일(360px), 태블릿(768px), 데스크톱(1280px) 점검
  - 햄버거 메뉴 동작 확인
  - 테이블/목록의 모바일 대응

#### 완료 기준 (Definition of Done)
- ✅ 모든 API 에러가 표준 에러 코드 체계로 반환됨
- ✅ 키보드만으로 로그인, 검색, 네비게이션이 가능함
- ✅ 색상 대비가 WCAG 2.1 AA 기준을 충족함
- ✅ 모든 화면이 360px ~ 1920px 범위에서 정상 렌더링됨
- ✅ DB-파일 동기화가 정상 동작함

#### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**에러 처리 검증:**
1. `browser_navigate` -> `http://localhost:3000/work/nonexistent-id`
2. `browser_snapshot` -> 404 메시지 확인 ("요청하신 분석 결과를 찾을 수 없습니다")
3. `browser_navigate` -> `http://localhost:3000/dictionary/nonexistent-id`
4. `browser_snapshot` -> 404 메시지 확인 ("요청하신 용어를 찾을 수 없습니다")

**접근성 검증:**
5. `browser_navigate` -> `http://localhost:3000/login`
6. `browser_press_key` -> Tab 키로 아이디 -> 비밀번호 -> 로그인 버튼 이동 확인
7. `browser_snapshot` -> 포커스 상태 확인

**반응형 검증:**
8. `browser_resize` -> 360px 너비
9. `browser_navigate` -> `http://localhost:3000/` (로그인 상태)
10. `browser_snapshot` -> 모바일 레이아웃 확인
11. `browser_resize` -> 768px 너비
12. `browser_snapshot` -> 태블릿 레이아웃 확인
13. `browser_resize` -> 1280px 너비
14. `browser_snapshot` -> 데스크톱 레이아웃 확인
15. `browser_console_messages(level: "error")` -> 콘솔 에러 없음 확인

#### 기술 고려사항
- Next.js의 `error.tsx` 파일은 각 레이아웃 세그먼트에 배치
- FTS5 인덱스 재구성은 서버 시작 시 또는 주기적으로 실행

---

### Sprint 10: 성능 최적화 + 배포 + 문서화 (2주)

#### 작업 목록

- ⬜ **T10-1: 성능 최적화** [복잡도: 중]
  - 페이지 초기 로딩 최적화 (React Server Components 활용)
  - 이미지/폰트 최적화 (next/font)
  - API 응답 캐싱 전략 (빈도 트렌드 등 변경 빈도 낮은 데이터)
  - 번들 크기 분석 및 최적화

- ⬜ **T10-2: 보안 최종 점검** [복잡도: 소]
  - 환경변수 노출 여부 확인 (빌드 결과물에 민감 정보 없음)
  - API 인증/인가 우회 가능성 점검
  - SQL Injection 방지 확인 (Drizzle ORM 파라미터 바인딩)
  - XSS 방지 확인 (React 자동 이스케이프)

- ⬜ **T10-3: 배포 환경 구성** [복잡도: 중]
  - 프로덕션 빌드 (`npm run build`) 확인
  - 환경변수 설정 가이드
  - SQLite DB 파일 위치 설정
  - PM2 또는 Docker 기반 프로세스 관리
  - 배포 스크립트 작성

- ⬜ **T10-4: 사용자 가이드** [복잡도: 소]
  - 초기 설정 가이드 (관리자 계정, IMAP 설정, Claude API 키)
  - 주요 기능 사용법 안내
  - 트러블슈팅 가이드

- ⬜ **T10-5: 기술 부채 정리** [복잡도: 소]
  - TODO 항목 정리
  - 미사용 코드 제거
  - 의존성 업데이트
  - 코드 포맷팅 최종 확인

#### 완료 기준 (Definition of Done)
- ✅ 프로덕션 빌드가 에러 없이 완료됨
- ✅ 배포 환경에서 전체 기능이 정상 동작함
- ✅ 환경변수에 민감 정보가 노출되지 않음
- ✅ 사용자 가이드가 작성됨
- ✅ 기술 부채 항목이 정리됨

#### 🧪 Playwright MCP 검증 시나리오
> 프로덕션 빌드 후 `npm start` 실행 후 아래 순서로 검증

**전체 E2E 흐름 검증:**
1. `browser_navigate` -> `http://localhost:3000/login`
2. `browser_fill_form` -> 관리자 아이디/비밀번호 입력
3. `browser_click` -> 로그인
4. `browser_navigate` -> `http://localhost:3000/settings`
5. `browser_snapshot` -> 환경설정 화면 확인
6. `browser_navigate` -> `http://localhost:3000/`
7. `browser_snapshot` -> 대시보드 정상 렌더링
8. `browser_navigate` -> `http://localhost:3000/dictionary`
9. `browser_type` -> 검색어 입력
10. `browser_snapshot` -> 검색 결과 확인
11. `browser_navigate` -> `http://localhost:3000/admin/users`
12. `browser_snapshot` -> 사용자 관리 화면 확인
13. `browser_console_messages(level: "error")` -> 콘솔 에러 없음 확인
14. `browser_network_requests` -> 모든 API 호출 2xx 확인

#### 기술 고려사항
- SQLite DB 파일은 서버 로컬 파일 시스템에 위치 (Vercel 등 서버리스 환경에서는 외부 DB 필요)
- PM2를 사용할 경우 `ecosystem.config.js` 작성
- Next.js standalone 빌드 모드 검토

---

## ⚠️ 리스크 및 완화 전략

| 리스크 | 가능성 | 영향도 | 완화 전략 |
|--------|--------|--------|-----------|
| Claude API rate limit 초과 | 중 | 높음 | 순차 처리, 재시도 로직, 배치 간격 조정 |
| IMAP 서버 연결 불안정 | 중 | 중 | 지수 백오프 재시도, 타임아웃 설정, 에러 격리 |
| SQLite 동시성 제한 | 낮음 | 중 | better-sqlite3 동기식 접근으로 잠금 충돌 최소화, WAL 모드 |
| Next.js HMR에서 스케줄러 중복 | 높음 | 중 | `global.__scheduler` 싱글톤 패턴 |
| 대용량 메일 처리 성능 | 낮음 | 중 | 메일 본문 크기 제한, 청크 처리 |
| 프롬프트 응답 파싱 실패 | 중 | 중 | JSON 스키마 검증, 실패 시 재시도, 폴백 처리 |

---

## 📈 마일스톤

| 마일스톤 | 시점 | 주요 산출물 |
|----------|------|-------------|
| M1: 인증 시스템 완성 | Phase 1 완료 (Sprint 2) | 로그인, 사용자 관리, 세션 관리 |
| M2: 관리자 화면 완성 | Phase 2 완료 (Sprint 4) | 환경설정, 대시보드, GNB |
| M3: 백엔드 파이프라인 완성 | Phase 3 완료 (Sprint 6) | 메일 수신 -> 용어 분석 -> DB 저장 자동화 |
| M4: 전체 UI 완성 (MVP) | Phase 4 완료 (Sprint 8) | 용어사전, 업무지원 상세, 전체 네비게이션 |
| M5: 정식 릴리스 | Phase 5 완료 (Sprint 10) | 안정화, 배포, 문서화 |

---

## 🔮 향후 계획 (Backlog)

MVP 이후 고려할 기능들 (PRD에 명시되지 않았으나 확장 가능):

| 우선순위 | 기능 | 설명 |
|----------|------|------|
| Could Have | 비밀번호 변경 | 사용자 본인 비밀번호 변경 기능 |
| Could Have | 용어 수동 편집 | 관리자가 용어 해설을 수동으로 수정/보완 |
| Could Have | 불용어 관리 UI | 관리자가 불용어 목록을 웹에서 관리 |
| Could Have | 메일 원본 보기 | 분석된 메일의 원본 텍스트 조회 |
| Won't Have | 다국어 지원 | 현재 한국어 단일 언어 |
| Won't Have | 실시간 알림 | WebSocket 기반 분석 완료 알림 |
| Won't Have | 용어 내보내기 | Excel/PDF 형식 용어 사전 내보내기 |

---

## 기술 부채 관리

| Phase | 기술 부채 항목 | 해결 시점 |
|-------|---------------|-----------|
| Phase 1 | 테스트 코드 미작성 (인증 관련) | Phase 5 Sprint 9 |
| Phase 3 | Claude API 프롬프트 최적화 | Phase 5 Sprint 9 |
| Phase 4 | 컴포넌트 중복 코드 리팩토링 | Phase 5 Sprint 10 |
| 전체 | E2E 테스트 자동화 | Phase 5 Sprint 10 |
