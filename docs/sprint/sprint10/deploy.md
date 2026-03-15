# Sprint 10 배포 검증 체크리스트

## 자동 검증 완료 항목

- ✅ `npm run build` — 프로덕션 빌드 성공 (2026-03-15)
  - 25개 라우트 정상 컴파일
  - TypeScript 오류 없음
  - `api/dictionary/trending` 동적 라우트 정상 등록
- ✅ `npm run lint` — 오류 없음 (경고 1건: rate-limiter.ts 불필요한 eslint-disable 주석 — 기능 영향 없음)
- ✅ 로그인 화면 렌더링 — 정상
- ✅ 로그인 API (`POST /api/auth/login`) — HTTP 200, 세션 생성 정상
- ✅ 대시보드 (`/dashboard`) — 서비스 상태, 최신 분석 결과, 이력 정상 표시
- ✅ 환경설정 (`/settings`) — IMAP/AI 설정 폼 정상 표시
- ✅ 용어사전 (`/dictionary`) — 검색창, 카테고리 필터, 트렌드 표시
- ✅ 사용자 관리 (`/admin/users`) — 사용자 목록 정상 표시
- ✅ 보안 헤더 — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy 모두 확인
- ✅ Rate Limiting — 10회 초과 시 HTTP 429 응답 확인
- ✅ 404 페이지 — "페이지를 찾을 수 없습니다" 정상 표시
- ✅ 콘솔 에러 없음 — 대시보드 기준 에러 0건

## 수동 검증 필요 항목

- ⬜ **앱 직접 실행 확인**: `npm start` 로 프로덕션 서버 시작 후 동작 확인
  - `cd domain-dictionary && npm start`
  - http://localhost:3000 접속 확인
- ⬜ **보안 헤더 확인**: 브라우저 개발자 도구 Network 탭 → 응답 헤더 확인
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- ⬜ **Rate Limiting 동작 확인**: 로그인 폼에서 잘못된 비밀번호 6회 연속 입력
  - 6번째 시도부터 "잠시 후 다시 시도해 주세요. (1분당 최대 10회)" 메시지 확인
  - HTTP 429 응답 확인
- ⬜ **전체 E2E 흐름**: 로그인 → 대시보드 → 용어사전 → 설정 페이지 순차 확인
- ⬜ **PM2 배포**: `docs/deploy/README.md` 가이드에 따라 PM2로 프로덕션 배포
  - `npm install -g pm2`
  - `pm2 start ecosystem.config.js`
  - `pm2 status` 로 실행 상태 확인
- ⬜ **DB 마이그레이션**: 신규 서버 환경에서 최초 실행 시 DB 자동 생성 확인

## Playwright 검증 시나리오 (앱 실행 중 수행)

앱이 `http://localhost:3000` 에서 실행 중인 상태에서 아래 시나리오를 검증합니다.

### 전체 E2E 흐름

1. `browser_navigate` → `http://localhost:3000/login`
2. `browser_fill_form` → 관리자 아이디/비밀번호 입력 (woongs / 1@(Dndtm)#4)
3. `browser_click` → 로그인
4. `browser_navigate` → `http://localhost:3000/settings` → 환경설정 화면 확인
5. `browser_navigate` → `http://localhost:3000/` → 대시보드 확인
6. `browser_navigate` → `http://localhost:3000/dictionary` → 용어사전 확인
7. `browser_navigate` → `http://localhost:3000/admin/users` → 사용자 관리 확인

### 보안 헤더 확인

8. `browser_network_requests` → `X-Frame-Options: DENY` 헤더 존재 확인

### Rate Limiting 확인

9. `browser_navigate` → `http://localhost:3000/login`
10. 잘못된 비밀번호로 6회 연속 로그인 시도
11. "잠시 후 다시 시도해 주세요" 메시지 표시 확인

### 404 페이지 확인

12. `browser_navigate` → `http://localhost:3000/nonexistent-page`
13. 404 에러 페이지 정상 표시 확인

### 공통 확인

14. `browser_console_messages(level: "error")` → 콘솔 에러 없음 확인
