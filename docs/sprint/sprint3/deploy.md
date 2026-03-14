# Sprint 3 배포 체크리스트

- **스프린트**: Sprint 3 — GNB + 환경설정 화면/API + 사용자 관리
- **브랜치**: sprint3
- **작성일**: 2026-03-15

---

## PR 생성 안내

gh CLI 인증이 없어 PR을 자동 생성하지 못했습니다. 아래 URL에서 직접 PR을 생성해 주세요.

```
https://github.com/woongki-jung/Hackathon/pull/new/sprint3
```

**PR 제목**: `feat: Sprint 3 완료 - GNB + 환경설정 + 사용자 관리`

**PR base**: `main` / **compare**: `sprint3`

---

## 자동 검증 완료 항목

아래 항목은 sprint-close 시점에 이미 완료된 것을 확인한 항목입니다.

- ✅ `npm run build` — 빌드 성공 (사용자 제공 정보 기준)
- ✅ `npm run lint` — 린트 에러 없음 (사용자 제공 정보 기준)
- ✅ Playwright: 로그인 → GNB 표시 확인
- ✅ Playwright: 모바일 360px 햄버거 메뉴 동작 확인
- ✅ Playwright: 환경설정 화면 렌더링 및 저장 토스트 확인
- ✅ Playwright: 민감정보(비밀번호, API 키) 미노출 확인 (뱃지만 표시)
- ✅ Playwright: 사용자 등록 및 목록 반영 확인
- ✅ Playwright: 사용자 삭제 (인라인 확인 UI) 및 목록 제거 확인
- ✅ Playwright: 자기 자신(admin) 삭제 버튼 비활성화 확인
- ✅ Playwright: 콘솔 에러 없음 확인

---

## 수동 검증 필요 항목

아래 항목은 직접 실행/확인이 필요합니다.

### 환경 설정

- ⬜ `.env.local` 파일에 아래 환경변수 설정 확인
  ```env
  SESSION_SECRET=<32자 이상 랜덤 문자열>
  ADMIN_USERNAME=<관리자 아이디>
  ADMIN_PASSWORD=<관리자 비밀번호>
  DATABASE_PATH=./data/app.db
  ```

### 앱 실행 및 기능 확인

- ⬜ `npm run dev` 실행 후 `http://localhost:3000` 접속 확인
- ⬜ 관리자 계정으로 로그인하여 `/dashboard` 이동 확인
- ⬜ GNB에서 각 메뉴 링크 클릭 시 올바른 경로로 이동 확인
  - 대시보드 → `/dashboard`
  - 용어사전 → `/dictionary`
  - 환경설정 → `/settings` (admin만 보임)
  - 사용자 관리 → `/admin/users` (admin만 보임)
- ⬜ 로그아웃 버튼 클릭 시 `/login`으로 이동 확인
- ⬜ 일반 사용자(user role) 로그인 시 환경설정/사용자 관리 메뉴 미표시 확인

### 환경설정 화면 심화 검증

- ⬜ IMAP 설정 저장 후 페이지 새로고침 시 저장된 값 유지 확인
- ⬜ SSL/TLS 토글 초기값 확인 (DB 미설정 시 `true`로 표시되어야 함)
- ⬜ 잘못된 포트 입력(예: 99999) 후 저장 시 에러 토스트 표시 확인
- ⬜ 메일 확인 주기 1분 미만 입력 시 에러 토스트 표시 확인
- ⬜ 변경 후 취소 버튼 클릭 시 원래 값으로 복원 확인
- ⬜ IMAP 설정 완료 후 연결 테스트 버튼 동작 확인 (실제 메일 서버 연결)

### 사용자 관리 심화 검증

- ⬜ 중복 아이디 등록 시 "이미 사용 중인 아이디입니다." 에러 표시 확인
- ⬜ 비밀번호 확인 불일치 시 폼 에러 표시 확인
- ⬜ 일반 사용자가 `/admin/users` 접근 시 "관리자만 접근할 수 있습니다." 안내 표시 확인
- ⬜ 일반 사용자가 직접 `GET /api/users` 호출 시 403 응답 확인

### 토스트 알림 심화 검증

- ⬜ 성공 토스트가 3초 후 자동으로 사라지는지 확인
- ⬜ X 버튼 클릭 시 즉시 닫히는지 확인
- ⬜ 여러 토스트가 동시에 쌓여 표시되는지 확인

---

## 참고 사항

- **코드 리뷰 보고서**: [code-review.md](code-review.md)
- **Playwright 검증 보고서**: [test-report.md](test-report.md)
- **코드 리뷰 High 이슈(H-1)**: `settings-service.ts`의 `async` 함수 선언 불일치 — 동작에는 문제 없으나 Sprint 4에서 개선 권장
- **코드 리뷰 Medium 이슈(M-1)**: 사용자 등록일 날짜 형식 `toLocaleDateString('ko-KR')` — Sprint 8 T8-5 통일 시 개선 예정
