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

1. `domain-dictionary/.env.local` 파일 생성:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<8자 이상, 영문+숫자+특수문자>
DATABASE_PATH=./data/app.db
SESSION_SECRET=<32자 이상 임의 문자열>
```

2. 개발 서버 실행:

```bash
cd domain-dictionary
npm run dev
```

---

### 검증 항목

#### 서버 기동 검증

- ⬜ `npm run dev` 실행 후 `http://localhost:3000` 접속 가능 확인
- ⬜ 서버 콘솔에 에러 없이 "Ready" 메시지 출력 확인
- ⬜ 루트(`/`) 접속 시 `/login` 으로 리다이렉트 확인 (또는 로그인 페이지 렌더링)

#### 초기 관리자 계정 자동 생성 검증

- ⬜ 서버 첫 시작 후 `users` 테이블에 admin 계정 1건 생성됨 확인
  - 확인 방법: `npx drizzle-kit studio` 또는 SQLite 뷰어 사용
  - 예: `sqlite3 data/app.db "SELECT username, role FROM users;"`
- ⬜ 서버 재시작 후 중복 생성 없음 확인

#### 로그인 화면 UI 검증 (http://localhost:3000/login)

- ⬜ 로그인 폼 정상 렌더링 확인 (아이디 입력, 비밀번호 입력, 로그인 버튼)
- ⬜ 빈 입력 상태에서 로그인 버튼 클릭 시 유효성 오류 메시지 표시 확인
- ⬜ 아이디 4자 미만 입력 시 오류 메시지 표시 확인 ("아이디는 4자 이상이어야 합니다" 또는 유사)
- ⬜ 비밀번호 8자 미만 입력 시 오류 메시지 표시 확인
- ⬜ Enter 키로 로그인 버튼 기능 작동 확인
- ⬜ 브라우저 콘솔(F12) 에러 없음 확인

#### 반응형 레이아웃 검증

- ⬜ 모바일 뷰포트(360px) 레이아웃 정상 확인
  - 개발자 도구 > 반응형 모드에서 360px 설정 후 확인
  - 폼이 가로 전체 너비로 표시되고 요소가 잘리지 않음

#### Playwright MCP 검증 시나리오 (선택, 앱 실행 중일 때 수행)

> 아래 시나리오는 `http://localhost:3000` 이 실행 중인 상태에서 sprint-close 에이전트가 자동 수행하거나 직접 수행할 수 있습니다.

1. `http://localhost:3000/login` 접속 후 폼 요소 존재 확인
2. 로그인 버튼 클릭 (빈 입력) → 유효성 오류 메시지 확인
3. 아이디 필드에 "ab" 입력 후 로그인 클릭 → 아이디 유효성 오류 확인
4. 콘솔 에러 없음 확인
5. 360px 뷰포트 → 모바일 레이아웃 정상 확인

---

## 비고

- Next.js 버전: ROADMAP 명세는 v15이나 실제 설치 버전은 v16.1.6 (최신 stable)
- `drizzle/` 디렉터리: 현재 마이그레이션 파일 미생성 (`db:push`로 직접 적용됨)
- 로그인 API 연동은 Sprint 2에서 수행 예정 (현재 UI만 구현)
- `.NET` 잔여 파일(src/, tests/, MailTermAnalyzer.slnx 등) 정리 완료
