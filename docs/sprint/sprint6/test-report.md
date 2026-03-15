# Sprint 6 Playwright 검증 보고서

**검증 일자:** 2026-03-15
**검증 환경:** http://localhost:3000 (npm run dev)
**검증 브랜치:** sprint6
**관리자 계정:** admin / Admin123!

---

## 검증 결과 요약

| 항목 | 결과 | 비고 |
|------|------|------|
| 로그인 화면 렌더링 | ✅ 정상 | 로그인 폼, 버튼 정상 표시 |
| POST /api/auth/login | ✅ 200 OK | admin 계정 로그인 성공 |
| GET /api/mail/status | ✅ 200 OK | 스케줄러 상태, IMAP/API 키 설정 상태 반환 |
| GET /api/analysis/latest | ✅ 200 OK | null 반환 (분석 결과 없음, 정상) |
| GET /api/analysis/history | ✅ 200 OK | 빈 배열 반환 (정상) |
| POST /api/mail/check | ✅ 200 OK | "메일 확인이 시작되었습니다." 응답 |
| 배치 실행 후 lastRunAt 갱신 | ✅ 정상 | IMAP 미설정 상태에서도 success 기록 |
| GEMINI_API_KEY 미설정 시 건너뜀 | ✅ 정상 | analysis.apiKeyConfigured: false, 에러 없음 |
| 콘솔 에러 | ✅ 0건 | |

---

## 상세 검증 내역

### 1. 로그인 화면 렌더링

- URL: http://localhost:3000/login (미인증 접근 시 자동 리다이렉트 확인)
- 로그인 폼: 아이디 입력, 비밀번호 입력, 로그인 버튼 정상 렌더링
- 스크린샷: [screenshot-login.png](screenshot-login.png)

### 2. POST /api/auth/login

```json
{
  "status": 200,
  "data": {
    "success": true,
    "data": { "userId": "...", "username": "admin", "role": "admin" },
    "message": "로그인 성공"
  }
}
```

### 3. GET /api/mail/status

```json
{
  "success": true,
  "data": {
    "scheduler": { "status": "stopped", "checkInterval": 3600000 },
    "mail": {
      "imapConfigured": true,
      "passwordConfigured": false,
      "lastRunAt": "2026-03-15T00:02:35.527Z",
      "lastRunStatus": "success",
      "lastRunMailCount": 0
    },
    "analysis": { "apiKeyConfigured": false, "model": null }
  }
}
```

- IMAP 호스트 설정됨, 비밀번호 미설정 — 정상적으로 구분하여 표시
- GEMINI_API_KEY 미설정 — apiKeyConfigured: false 정상 반환

### 4. GET /api/analysis/latest / /api/analysis/history

- 분석 결과 없음(IMAP 비밀번호 미설정으로 메일 수신 불가) — null / 빈 배열 정상 반환

### 5. POST /api/mail/check (수동 메일 확인 트리거)

```json
{ "success": true, "message": "메일 확인이 시작되었습니다." }
```

- 배치 실행 후 `lastRunAt` 갱신 확인: `2026-03-15T00:02:35.527Z`
- IMAP 비밀번호 미설정 상태에서 에러 없이 종료(`lastRunStatus: "success"`)
- GEMINI_API_KEY 미설정 상태에서 분석 단계 건너뜀, 에러 없음

### 6. 콘솔 에러 확인

- `browser_console_messages(level: "error")` 결과: **0건**

---

## 미인증 리다이렉트 검증

- 미인증 상태에서 `http://localhost:3000/` 접근 → `/login`으로 리다이렉트 확인 (Next.js 미들웨어 정상 동작)

---

## 수동 검증 필요 항목 (GEMINI_API_KEY 설정 후)

아래 항목은 GEMINI_API_KEY 설정 및 실제 메일 수신 환경에서 수동으로 검증이 필요합니다.

- ⬜ terms 테이블에 추출된 용어와 해설이 저장되는지 확인
- ⬜ `./data/terms/` 디렉터리에 `{용어}.md` 파일이 생성되는지 확인
- ⬜ analysis_queue의 상태가 pending → processing → completed로 전이되는지 확인
- ⬜ 분석 실패 시 failed 상태 + retryCount 증가 확인
- ⬜ 대시보드에서 최신 분석 결과(요약, 용어 수) 표시 확인

자세한 설정 방법은 [deploy.md](deploy.md)를 참고하세요.
