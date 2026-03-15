# 배포 체크리스트 (Vercel)

> 작성일: 2026-03-15
> 배포 대상: Vercel 무료 인프라 (PRD 기준)
> 프로덕션 URL: https://domain-dictionary-iota.vercel.app
> GitHub 연동: `woongki-jung/Hackathon` main 브랜치 → 자동 배포

---

## 자동 검증 완료

- ✅ `npm run lint` — ESLint 오류 0건
- ✅ `npm run build` — 프로덕션 빌드 성공 (Next.js 16.1.6)
- ✅ 웹훅 아키텍처 E2E 검증 (Playwright)
  - 로그인 → 대시보드 정상 표시
  - 설정 화면: 웹훅 등록/조회 정상 동작
  - 웹훅 수신 엔드포인트 (인증 없이 POST 수신): HTTP 200 확인
  - 분석 배치 수동 트리거: 정상 실행
- ✅ Vercel 프로덕션 배포 완료 (`npx vercel --prod --token ... --yes`)
- ✅ 프로덕션 URL 로그인 화면 정상 확인

---

## Vercel 배포 수동 작업 필요 항목

### 1. Vercel 프로젝트 설정
- ✅ Vercel 프로젝트 `domain-dictionary` 생성 완료
- ✅ GitHub `woongki-jung/Hackathon` 저장소 연결 완료
- ✅ Root Directory `domain-dictionary` 설정 완료
- ⬜ Node.js Version을 20.x로 설정 확인 (Vercel 대시보드 > Settings > General)

### 2. 환경변수 등록 (Vercel 대시보드 > Environment Variables)
- ✅ `SESSION_SECRET` (32자 이상 랜덤 문자열) — 등록 완료
- ✅ `ADMIN_USERNAME` / `ADMIN_PASSWORD` (초기 관리자 계정) — 등록 완료
- ✅ `GEMINI_API_KEY` / `GEMINI_MODEL` — 등록 완료
- ✅ `DATABASE_PATH=/tmp/app.db` — 등록 완료
- ✅ `MAIL_STORAGE_PATH=/tmp/mails` — 등록 완료
- ✅ `GLOSSARY_STORAGE_PATH=/tmp/terms` — 등록 완료

> ⚠️ 메일 서버(IMAP) 관련 환경변수 불필요 — 웹훅 수신 방식으로 변경됨

### 3. 웹훅 수신기 설정 (배포 후 최초 설정)
- ⬜ 로그인 후 **환경설정 > 웹훅 수신기 관리**에서 웹훅 등록
  - 코드: 영문/숫자/하이픈/언더스코어 (예: `mail-support`)
  - 설명: 해당 웹훅의 분석 목적 (예: "고객지원 메일 분석")
  - 등록 후 엔드포인트: `POST https://domain-dictionary-iota.vercel.app/api/webhook/<code>`
- ⬜ 외부 서비스(메일, 알림 등)에서 해당 엔드포인트로 POST 요청 연동
  - 요청 형식: `{ "subject": "제목", "body": "본문 텍스트", "receivedAt": "ISO 8601" }`

> ⚠️ **Vercel 주의**: DB가 `/tmp`에 위치하여 콜드스타트 시 초기화됩니다.
> 웹훅 등록 정보도 재배포 후 다시 설정 필요합니다.

### 4. Vercel Cron Jobs 등록 (분석 배치 자동 실행)
- ⬜ `domain-dictionary/vercel.json` 생성:
  ```json
  {
    "crons": [
      {
        "path": "/api/mail/check",
        "schedule": "0 * * * *"
      }
    ]
  }
  ```
  > 무료 플랜: 하루 2회 / 유료 플랜: 시간당 1회 실행 가능

### 5. 기능 검증 (Vercel 배포 후)
- ✅ 로그인 (`/login`) — 관리자 계정으로 접속
- ✅ 대시보드 (`/dashboard`) — 서비스 상태 표시
- ✅ 환경설정 (`/settings`) — 웹훅 등록/조회
- ✅ 웹훅 수신 테스트 — `POST /api/webhook/<code>` HTTP 200 응답
- ✅ 분석 배치 수동 실행 — 정상 트리거
- ⬜ 용어사전 검색 (`/dictionary`) — 분석 완료 후 용어 조회

---

## Vercel 환경 주요 제약 (운영 시 유의)

| 항목 | 제약 내용 |
|------|----------|
| SQLite DB | `/tmp` 저장 → 재배포·콜드스타트 시 초기화 |
| 파일 저장소 | `/tmp` 저장 → 재배포·콜드스타트 시 초기화 |
| 웹훅 등록 정보 | DB 초기화 시 사라짐 → 재등록 필요 |
| 스케줄러 | node-cron 미지원 → Vercel Cron Jobs 또는 외부 서비스 필요 |
| seedAdmin | `VERCEL` 환경변수 가드 제거됨 → 자동 실행 |

---

## 웹훅 API 명세

### 수신 엔드포인트 (공개, 인증 불필요)
```
POST /api/webhook/{code}
Content-Type: application/json

{
  "subject": "분석 대상 제목 (선택)",
  "body": "분석할 본문 텍스트 (필수)",
  "receivedAt": "2026-03-15T09:00:00Z (선택, ISO 8601)"
}
```

### 관리 API (관리자 인증 필요)
```
GET  /api/webhooks          — 웹훅 목록 조회
POST /api/webhooks          — 웹훅 생성 { code, description }
DELETE /api/webhooks/{id}   — 웹훅 삭제
```

---

## 참고 문서

- 전체 배포 가이드: `docs/deploy/README.md`
- 사용자 가이드: `docs/user-guide.md`
