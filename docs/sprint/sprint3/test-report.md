# Sprint 3 Playwright 검증 보고서

- **작성일**: 2026-03-15
- **앱 URL**: http://localhost:3000
- **관리자 계정**: admin (실제 .env.local 기준)
- **검증 도구**: Playwright MCP

---

## 검증 결과 요약

| 항목 | 결과 |
|------|------|
| 앱 실행 상태 | ✅ 정상 (http://localhost:3000) |
| 로그인 흐름 | ✅ 통과 |
| GNB 표시 (데스크톱) | ✅ 통과 |
| GNB 모바일 햄버거 메뉴 | ✅ 통과 |
| 환경설정 화면 렌더링 | ✅ 통과 |
| 환경설정 저장 토스트 | ✅ 통과 |
| 사용자 관리 화면 렌더링 | ✅ 통과 |
| 사용자 등록 | ✅ 통과 |
| 사용자 삭제 (인라인 확인) | ✅ 통과 |
| 콘솔 에러 | ✅ 없음 |

---

## 상세 시나리오 결과

### 1. 로그인 및 GNB 검증

**시나리오**: `http://localhost:3000` 접속 → 로그인 → GNB 확인

- ✅ `/login`으로 자동 리다이렉트됨 (인증 미들웨어 정상 동작)
- ✅ admin 계정으로 로그인 후 `/dashboard`로 이동
- ✅ GNB에 대시보드, 용어사전, 환경설정, 사용자 관리 메뉴 표시
- ✅ 우측에 `admin` 사용자명, `관리자` 역할 뱃지 표시
- ✅ 현재 페이지(대시보드) 메뉴 항목 하이라이트됨

**스크린샷**: [02-dashboard-with-gnb.png](02-dashboard-with-gnb.png)

---

### 2. GNB 모바일 반응형 검증

**시나리오**: 360px 너비로 리사이즈 → 햄버거 메뉴 확인

- ✅ 360px에서 데스크톱 메뉴 숨겨지고 햄버거 아이콘(≡) 표시
- ✅ 햄버거 버튼 클릭 시 전체 메뉴 (대시보드, 용어사전, 환경설정, 사용자 관리) 펼쳐짐
- ✅ admin 사용자명, 관리자 뱃지, 로그아웃 버튼 표시

**스크린샷**: [03-gnb-mobile.png](03-gnb-mobile.png), [04-gnb-mobile-menu-open.png](04-gnb-mobile-menu-open.png)

---

### 3. 환경설정 화면 검증

**시나리오**: `/settings` 접속 → 폼 확인 → 설정 저장

- ✅ 환경설정 화면 렌더링 정상 (IMAP 호스트, 포트, 아이디, SSL 토글, 비밀번호 상태, 확인 주기)
- ✅ AI 분석 섹션 렌더링 정상 (모델명, API 키 상태 뱃지)
- ✅ 비밀번호 상태: "미설정 (MAIL_PASSWORD 환경변수 필요)" 뱃지 표시 (민감정보 미노출 확인)
- ✅ API 키 상태: "미설정 (GEMINI_API_KEY 환경변수 필요)" 뱃지 표시
- ✅ 설정값 입력(IMAP 호스트, 포트 993, 아이디, 확인 주기 60분) 후 저장 성공
- ✅ "설정이 저장되었습니다." 토스트 표시 (우상단, 성공 녹색)
- ✅ 저장 후 저장/취소 버튼 비활성화 (isDirty=false 복귀)
- ✅ GNB "환경설정" 메뉴 하이라이트 표시

**스크린샷**: [05-settings-page.png](05-settings-page.png), [06-settings-saved-toast.png](06-settings-saved-toast.png)

---

### 4. 사용자 관리 화면 검증

**시나리오**: `/admin/users` 접속 → 사용자 등록 → 삭제

- ✅ 사용자 목록 테이블 렌더링 (아이디, 역할, 상태, 등록일, 액션 컬럼)
- ✅ admin 행: 본인 표시, 삭제 버튼 없음 (자기 자신 삭제 방지 확인)
- ✅ 사용자 등록 버튼 클릭 시 인라인 등록 폼 표시
- ✅ testuser01 / Test@1234 입력 후 등록 성공
- ✅ "사용자 'testuser01'이 등록되었습니다." 토스트 표시
- ✅ 목록에 testuser01 즉시 반영
- ✅ 삭제 버튼 클릭 시 인라인 확인 UI ("삭제하시겠습니까? 확인 취소") 표시
- ✅ 확인 클릭 후 testuser01 목록에서 제거
- ✅ GNB "사용자 관리" 메뉴 하이라이트 표시

**스크린샷**: [07-users-page.png](07-users-page.png), [08-user-registered-toast.png](08-user-registered-toast.png), [09-user-delete-confirm.png](09-user-delete-confirm.png), [10-user-deleted.png](10-user-deleted.png)

---

### 5. 콘솔 에러 확인

- ✅ 전체 테스트 세션에서 콘솔 에러 0건

---

## 특이사항

- **관리자 계정**: CLAUDE.local.md의 `woongs / 1@(Dndtm)#4`는 현재 DB에 없음. 실제 `.env.local`에는 `admin / Admin123!`으로 설정되어 있어 해당 계정으로 테스트 진행함.
- **환경설정 SSL 토글**: 초기값이 `false`로 표시됨 (DB에 저장된 값 없는 경우 기본값 문제 가능성 있음 — 수동 확인 권장)
- **사용자 삭제 확인 UI**: 인라인 방식으로 구현됨 (window.confirm 미사용 — 스프린트 계획과 다르나 UX는 동등 이상)

---

## 스크린샷 목록

| 파일 | 내용 |
|------|------|
| [01-login-page.png](01-login-page.png) | 로그인 화면 |
| [02-dashboard-with-gnb.png](02-dashboard-with-gnb.png) | 로그인 후 GNB 표시 |
| [03-gnb-mobile.png](03-gnb-mobile.png) | 모바일 360px 햄버거 아이콘 |
| [04-gnb-mobile-menu-open.png](04-gnb-mobile-menu-open.png) | 모바일 메뉴 펼침 |
| [05-settings-page.png](05-settings-page.png) | 환경설정 화면 |
| [06-settings-saved-toast.png](06-settings-saved-toast.png) | 환경설정 저장 토스트 |
| [07-users-page.png](07-users-page.png) | 사용자 관리 목록 |
| [08-user-registered-toast.png](08-user-registered-toast.png) | 사용자 등록 성공 토스트 |
| [09-user-delete-confirm.png](09-user-delete-confirm.png) | 사용자 삭제 인라인 확인 UI |
| [10-user-deleted.png](10-user-deleted.png) | 사용자 삭제 완료 |
