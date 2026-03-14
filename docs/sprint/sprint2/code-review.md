# Sprint 2 코드 리뷰 보고서

- **검토일**: 2026-03-15
- **검토 범위**: 인증 관련 전체 구현 파일 (5개)

## 검토 결과 요약

| 등급 | 건수 |
|------|------|
| Critical | 0 |
| High | 1 |
| Medium | 2 |
| Suggestion | 2 |

---

## High 이슈

### H-1: SESSION_SECRET 미설정 시 런타임 오류 위험

- **파일**: `src/lib/auth/session.ts` (10번째 줄)
- **내용**: `process.env.SESSION_SECRET as string`로 타입 단언을 사용하고 있어, 환경변수가 없으면 iron-session이 내부적으로 빈 문자열로 세션을 암호화하거나 런타임 오류가 발생할 수 있음
- **위험**: 개발 환경에서 SESSION_SECRET 미설정 시 세션 암호화가 취약해지거나 예측 불가능한 동작이 발생할 수 있음
- **권고**: 서버 시작 시 SESSION_SECRET 존재 여부를 검증하고, 미설정 시 명시적 오류를 발생시키는 가드 추가 권장 (예: `instrumentation.ts`에서 검증)

---

## Medium 이슈

### M-1: proxy.ts 파일명이 Next.js 미들웨어 표준과 불일치

- **파일**: `src/proxy.ts`
- **내용**: Next.js의 미들웨어 파일명 표준은 `middleware.ts`이며, 현재 `proxy.ts`로 작성되어 있음. `config.matcher`가 정의되어 있으나 Next.js가 이 파일을 미들웨어로 자동 인식하는지 확인 필요
- **권고**: 실제 Next.js 미들웨어 동작 여부를 런타임에서 확인. 만약 미들웨어로 동작하지 않는다면 `middleware.ts`로 파일명 변경 필요

### M-2: 로그아웃 API에서 await 없이 session.destroy() 호출

- **파일**: `src/app/api/auth/logout/route.ts` (10번째 줄)
- **내용**: `session.destroy()`가 Promise를 반환하는 경우 await 없이 호출하면 세션이 완전히 파기되기 전에 응답이 반환될 수 있음
- **권고**: `await session.destroy()` 사용 확인 (iron-session 버전에 따라 동기/비동기 여부 상이)

---

## Suggestion (개선 제안)

### S-1: /api/auth/logout도 PUBLIC_PATHS에 추가 고려

- **파일**: `src/proxy.ts` (6번째 줄)
- **내용**: 현재 PUBLIC_PATHS에 `/api/auth/login`만 있고 `/api/auth/logout`은 없음. 미로그인 상태에서 로그아웃 호출 시 401이 반환되는데, 클라이언트가 이를 처리해야 함
- **권고**: 로그아웃은 세션 없이도 멱등적으로 동작해도 무방하므로 PUBLIC_PATHS 추가 또는 로그아웃 API에서 세션 없음을 graceful하게 처리하는 것을 고려

### S-2: 로그인 API 응답에 사용자 role을 직접 노출

- **파일**: `src/app/api/auth/login/route.ts` (66~69번째 줄)
- **내용**: 로그인 성공 응답에 `role` 정보를 포함하여 반환. 현재 사용 사례에서는 문제 없으나, 향후 권한 체계가 복잡해질 경우 클라이언트가 role을 신뢰하는 구조는 취약할 수 있음
- **권고**: role 정보는 `/api/auth/me` 엔드포인트를 통해 세션 기반으로 조회하는 단일 경로를 유지하는 것을 장기적으로 고려

---

## 종합 평가

전반적으로 인증 보안 원칙(HTTP-only 쿠키, bcrypt 검증, 통합 에러 메시지)을 올바르게 구현하였습니다. Critical 이슈는 없으며, H-1(SESSION_SECRET 가드)은 다음 스프린트에서 `instrumentation.ts` 검증 로직 추가를 권장합니다. M-1(proxy.ts 파일명)은 실제 앱에서 미들웨어가 동작하는지 수동 검증이 필요합니다.
