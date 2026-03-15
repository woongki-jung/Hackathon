# 배포 체크리스트 (Vercel)

> 작성일: 2026-03-15
> 배포 대상: Vercel 무료 인프라 (PRD 기준)
> 프로덕션 URL: https://domain-dictionary-iota.vercel.app
> GitHub 연동: `woongki-jung/Hackathon` main 브랜치 → 자동 배포

---

## 자동 검증 완료

- ✅ `npm run lint` — ESLint 오류 0건
- ✅ `npm run build` — 프로덕션 빌드 성공 (Next.js 15)
- ✅ E2E 전체 화면 검증 통과 (로컬, `docs/sprint/test-deploy/test-report.md` 참조)

---

## Vercel 배포 수동 작업 필요 항목

### 1. Vercel 프로젝트 설정
- ✅ Vercel 프로젝트 `domain-dictionary` 생성 완료
- ✅ GitHub `woongki-jung/Hackathon` 저장소 연결 완료
- ✅ Root Directory `domain-dictionary` 설정 완료
- ⬜ Node.js Version을 20.x로 설정 확인 (Vercel 대시보드 > Settings > General)

### 2. 환경변수 등록 (Vercel 대시보드 > Environment Variables)
- ⬜ `SESSION_SECRET` (32자 이상 랜덤 문자열)
- ⬜ `ADMIN_USERNAME` / `ADMIN_PASSWORD` (초기 관리자 계정)
- ⬜ `MAIL_IMAP_HOST` / `MAIL_IMAP_PORT` / `MAIL_USERNAME` / `MAIL_PASSWORD`
- ⬜ `MAIL_USE_SSL` / `MAIL_CHECK_INTERVAL`
- ⬜ `GEMINI_API_KEY` / `GEMINI_MODEL`
- ⬜ `DATABASE_PATH=/tmp/app.db` ← **반드시 /tmp 경로로 설정**
- ⬜ `MAIL_STORAGE_PATH=/tmp/mails` ← **반드시 /tmp 경로로 설정**
- ⬜ `GLOSSARY_STORAGE_PATH=/tmp/terms` ← **반드시 /tmp 경로로 설정**

### 3. Vercel Cron Jobs 등록 (스케줄러 대체)
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

### 4. 최초 배포 후 관리자 계정 확인
- ⬜ Vercel 환경에서는 seedAdmin이 자동 실행되지 않음 (`VERCEL` 환경변수 가드)
- ⬜ 로그인 페이지(`/login`)에서 `ADMIN_USERNAME` / `ADMIN_PASSWORD`로 접속 가능 여부 확인
  - 불가 시: 로컬에서 DB 초기화 후 Vercel Storage 연동 검토

### 5. 기능 검증 (Vercel 배포 후)
- ⬜ 로그인 (`/login`) — 관리자 계정으로 접속
- ⬜ 환경설정 (`/settings`) — IMAP 설정 저장 + 연결 테스트
- ⬜ 메일 수동 수집 (`/dashboard` > "메일 확인 실행")
- ⬜ 용어사전 검색 (`/dictionary`)

---

## Vercel 환경 주요 제약 (운영 시 유의)

| 항목 | 제약 내용 |
|------|----------|
| SQLite DB | `/tmp` 저장 → 재배포·콜드스타트 시 초기화 |
| 파일 저장소 | `/tmp` 저장 → 재배포·콜드스타트 시 초기화 |
| 스케줄러 | node-cron 미지원 → Vercel Cron Jobs 또는 외부 서비스 필요 |
| seedAdmin | `VERCEL` 환경변수 가드로 자동 스킵 → 수동 실행 필요 |

---

## 참고 문서

- 전체 배포 가이드: `docs/deploy/README.md`
- E2E 테스트 보고서: `docs/sprint/test-deploy/test-report.md`
- 사용자 가이드: `docs/user-guide.md`
