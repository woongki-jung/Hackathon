# Sprint 1 배포 및 검증 체크리스트

> **스프린트**: Sprint 1 — 프로젝트 초기화 + DB 스키마 + 로그인 화면
> **작성일**: 2026-03-15
> **브랜치**: sprint1
> **앱 위치**: `domain-dictionary/`

---

## 자동 검증 결과 (sprint-close 시 실행)

| 항목 | 명령어 | 결과 |
|------|--------|------|
| 프로덕션 빌드 | `npm run build` | ✅ 성공 |
| ESLint 검사 | `npm run lint` | ✅ 경고/오류 없음 |
| DB 스키마 적용 | `npm run db:push` | ✅ 7개 테이블 생성 완료 |

### 자동 검증 상세

#### npm run build

- ✅ 프로덕션 빌드 에러 없이 완료됨
- 실행 위치: `domain-dictionary/`

#### npm run lint

- ✅ ESLint 경고/오류 없음
- 실행 위치: `domain-dictionary/`

#### npm run db:push

- ✅ `data/app.db` 생성 확인
- 생성된 테이블 (7개):
  - `users` (DATA-001)
  - `app_settings` (DATA-002)
  - `mail_processing_logs` (DATA-003)
  - `terms` (DATA-004)
  - `term_source_files` (DATA-005)
  - `stop_words` (DATA-006)
  - `analysis_queue` (DATA-007)

---

## 수동 검증 필요 항목

아래 항목은 로컬 개발 서버를 직접 실행한 상태에서 검증해야 합니다.

### 사전 준비

1. `domain-dictionary/.env.local` 파일 생성 (이미 완료):

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin123!
DATABASE_PATH=./data/app.db
SESSION_SECRET=<자동 생성됨>
```

2. 개발 서버 실행:

```bash
cd domain-dictionary
npm run dev
```

---

### 검증 항목

#### 서버 기동 검증

- ✅ `npm run dev` 실행 후 `http://localhost:3000` 접속 가능 확인
- ✅ 서버 콘솔에 "Ready" 메시지 출력 확인
- ✅ 루트(`/`) 접속 시 `/login` 으로 리다이렉트 확인

#### 초기 관리자 계정 자동 생성 검증

- ✅ 서버 첫 시작 후 콘솔: `[seed-admin] 관리자 계정 'admin'이 생성되었습니다.`
- ⬜ 서버 재시작 후 중복 생성 없음 확인 (직접 확인 필요)
  - 확인 방법: `sqlite3 data/app.db "SELECT username, role FROM users;"`

#### 로그인 화면 UI 검증 (Playwright 자동 검증 완료)

- ✅ 로그인 폼 정상 렌더링 (아이디 입력, 비밀번호 입력, 로그인 버튼)
- ✅ 빈 입력 → "아이디를 입력해 주세요.", "비밀번호를 입력해 주세요." 오류 표시
- ✅ 아이디 "ab" 입력 → "아이디는 4~20자의 영소문자, 숫자, 밑줄(_)만 사용할 수 있습니다." 오류
- ✅ 비밀번호 7자 입력 → "비밀번호는 8자 이상이어야 합니다." 오류
- ✅ 유효한 입력 → 로딩 표시 후 "아이디 또는 비밀번호가 올바르지 않습니다." (API 미연결 정상)
- ✅ `?expired=true` → "세션이 만료되었습니다. 다시 로그인해 주세요." 표시
- ✅ 브라우저 콘솔 에러 없음 (404 /api/auth/login은 Sprint 2 예정)
- ⬜ Enter 키 동작 확인 (수동 필요)

#### 반응형 레이아웃 검증

- ✅ 모바일 뷰포트(360px) 레이아웃 정상 (스크린샷: screenshot-mobile-360px.png)

#### Vercel 프로덕션 검증

- ✅ 배포 URL: https://domain-dictionary-iota.vercel.app
- ✅ `/login` 로그인 폼 정상 렌더링 확인 (Playwright)

---

## 비고

- Next.js 버전: ROADMAP 명세는 v15이나 실제 설치 버전은 v16.1.6 (최신 stable)
- `drizzle/` 디렉터리: 현재 마이그레이션 파일 미생성 (`db:push`로 직접 적용됨)
- Vercel 환경: SQLite는 ephemeral filesystem으로 제한됨. instrumentation.ts에서 VERCEL=1 환경에서 시딩 스킵 처리됨 (Sprint 2에서 영구 DB 전략 결정 필요)
- 로그인 API 연동은 Sprint 2에서 수행 예정 (현재 UI만 구현)
- `.NET` 잔여 파일(src/, tests/, MailTermAnalyzer.slnx 등) 정리 완료
