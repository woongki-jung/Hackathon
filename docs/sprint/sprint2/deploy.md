# Sprint 2 배포 및 검증 체크리스트

- **작성일**: 2026-03-15
- **브랜치**: sprint2

## 자동 검증 완료 항목

- ✅ `npm run build` — 프로덕션 빌드 성공
- ✅ `npm run lint` — ESLint 에러 없음
- ✅ 로그인 성공 흐름 (admin/Admin123! → /dashboard 이동, "로그인되었습니다." 표시)
- ✅ 로그아웃 흐름 (/login으로 이동)
- ✅ 잘못된 비밀번호 처리 ("아이디 또는 비밀번호가 일치하지 않습니다." 표시, /login 유지)

## 수동 검증 필요 항목

### 환경변수 설정

- ⬜ `.env.local`에 `SESSION_SECRET` 설정 (32자 이상 랜덤 문자열)
  ```
  SESSION_SECRET=your-random-32-character-secret-here
  ```
- ⬜ SESSION_SECRET 미설정 시 서버 동작 확인 (오류 발생 여부)

### 보안 검증

- ⬜ 브라우저 DevTools → Application → Cookies에서 `mail-term-session` 쿠키 확인
  - HttpOnly: true
  - Secure: true (HTTPS 환경)
  - SameSite: Lax 이상
- ⬜ 인증 없이 `/dashboard` 직접 URL 접근 시 `/login`으로 리다이렉트 확인
- ⬜ 이미 로그인 상태에서 `/login` 접근 시 `/dashboard`로 리다이렉트 확인

### API 동작 검증

- ⬜ `GET /api/auth/me` — 로그인 상태에서 현재 사용자 정보 반환 확인
- ⬜ `GET /api/auth/me` — 미로그인 상태에서 401 반환 확인

### 앱 재시작 후 검증

- ⬜ `npm run dev` 실행 후 http://localhost:3000 접속 확인
- ⬜ 전체 로그인 → 대시보드 → 로그아웃 흐름 직접 확인

## 참고 사항

- 세션 유효기간: 24시간 (iron-session 쿠키 기반)
- bcrypt salt rounds: 10
- 미들웨어 파일 위치: `domain-dictionary/src/proxy.ts`
- public 경로 (인증 불필요): `/login`, `/api/auth/login`
