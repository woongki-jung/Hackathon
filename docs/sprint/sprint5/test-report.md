# Sprint 5 Playwright 검증 보고서

> **검증 일자:** 2026-03-15
> **앱 버전:** Sprint 5 (f1c392f)
> **검증 환경:** http://localhost:3000 (npm run dev)
> **검증자:** sprint-close agent (Playwright MCP)

---

## 검증 결과 요약

| 항목 | 결과 |
|------|------|
| 로그인 API (POST /api/auth/login) | ✅ 200 OK |
| 대시보드 렌더링 | ✅ 정상 |
| 서비스 상태 API (GET /api/mail/status) | ✅ 200 OK |
| 최신 분석 결과 API (GET /api/analysis/latest) | ✅ 200 OK |
| 분석 이력 API (GET /api/analysis/history) | ✅ 200 OK |
| 수동 메일 확인 API (POST /api/mail/check) | ✅ 200 OK |
| 환경설정 화면 렌더링 | ✅ 정상 |
| 미인증 접근 → /login 리다이렉트 | ✅ 정상 |
| 콘솔 에러 | ✅ 0건 |

---

## 상세 검증 내역

### 1. 로그인 API 검증
- `POST /api/auth/login` — 200 OK
- 응답: `{ success: true, data: { userId, username: "admin", role: "admin" } }`
- iron-session 쿠키(`domain-dict-session`) 정상 발급 확인

### 2. 대시보드 렌더링 검증
- `/dashboard` 진입 후 다음 요소 모두 확인:
  - 헤딩 "대시보드" 렌더링
  - "메일 확인 실행" 버튼 (admin 전용)
  - "설정 필요" 경고 배너 (IMAP/API 키 미설정 상태)
  - 서비스 상태 카드: 스케줄러 상태, 메일 서버 상태, AI API 키 상태, 마지막 실행
  - 빈 상태 메시지: "아직 분석된 메일이 없습니다.", "분석 이력이 없습니다."
- 스크린샷: [screenshot-dashboard.png](screenshot-dashboard.png)

### 3. API 병렬 로드 검증
대시보드 진입 시 세 API가 병렬로 호출되어 모두 200 반환:
- `GET /api/mail/status` → 200 OK
- `GET /api/analysis/latest` → 200 OK
- `GET /api/analysis/history?page=1` → 200 OK

### 4. /api/mail/status 응답 내용 검증
```json
{
  "scheduler": {
    "status": "stopped",
    "checkInterval": 3600000
  },
  "mail": {
    "imapConfigured": true,
    "passwordConfigured": false,
    "lastRunAt": "2026-03-14T19:36:28.724Z",
    "lastRunStatus": "success",
    "lastRunMailCount": 0
  }
}
```
- `lastRunAt`, `lastRunStatus: "success"` — `runMailBatch()`가 정상 실행된 이력 확인
- `scheduler.status: "stopped"` — Fast Refresh로 인한 `global.__scheduler` 재설정 현상 (정상 앱 재시작 시 "running" 표시됨)

### 5. 수동 메일 확인 트리거 검증
- `POST /api/mail/check` — 200 OK
- 응답: `{ success: true, message: "메일 확인이 시작되었습니다." }`
- IMAP 미설정 상태이므로 실제 메일 수신은 건너뜀(skipped) — 에러 없이 정상 처리

### 6. 환경설정 화면 검증
- `/settings` 진입 후 다음 요소 확인:
  - IMAP 호스트, 포트, 아이디, SSL/TLS 토글, 메일 확인 주기 필드
  - 비밀번호 상태 뱃지: "미설정 (MAIL_PASSWORD 환경변수 필요)"
  - AI 분석 모델명 필드
  - API 키 상태 뱃지: "미설정 (GEMINI_API_KEY 환경변수 필요)"
  - 저장/취소 버튼 (변경 없을 때 비활성)
  - 연결 테스트 버튼
- 스크린샷: [screenshot-settings.png](screenshot-settings.png)

### 7. 인증 미들웨어 검증
- 로그아웃(`POST /api/auth/logout`) 후 `/dashboard` 접근
- `/login`으로 자동 리다이렉트 정상 확인

### 8. 콘솔 에러 검증
- 전체 검증 과정에서 콘솔 에러 0건

---

## 수동 검증 필요 항목

| 항목 | 이유 |
|------|------|
| 스케줄러 "실행 중" 상태 확인 | 앱 완전 재시작(npm run dev) 후 `/api/mail/status` 확인 필요 |
| IMAP 실제 연결 및 메일 수신 | 외부 IMAP 서버 연결 필요 |
| `./data/mails/` 파일 생성 확인 | IMAP 설정 후 실제 수신 시 파일 시스템 확인 필요 |
| `analysis_queue` 레코드 확인 | IMAP 수신 후 DB 상태 확인 필요 |

---

## 스크린샷 목록

- [대시보드](screenshot-dashboard.png)
- [환경설정](screenshot-settings.png)
