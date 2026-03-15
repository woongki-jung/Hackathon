# 배포 체크리스트 (Vercel + Vercel Postgres)

> 작성일: 2026-03-15
> 배포 대상: Vercel 무료 인프라 + Vercel Postgres (Neon)
> 프로덕션 URL: https://domain-dictionary-iota.vercel.app
> GitHub 연동: `woongki-jung/Hackathon` main 브랜치 → 자동 배포

---

## 자동 검증 완료

- ✅ `npm run lint` — ESLint 오류 0건
- ✅ `npm run build` — 프로덕션 빌드 성공 (Next.js 16.1.6)
- ✅ DB 마이그레이션: SQLite(`@libsql/client`) → PostgreSQL(`@vercel/postgres`) 완료
- ✅ FTS5(SQLite) → PostgreSQL GIN 인덱스 + `tsvector` 전문 검색으로 전환 완료

---

## 수동 작업 필요 항목

### 1. Vercel Postgres DB 생성

- ⬜ Vercel 대시보드 → `domain-dictionary` 프로젝트 → **Storage** 탭
- ⬜ **Create Database** → **Neon Postgres** 선택
- ⬜ DB 이름 입력 (예: `domain-dictionary-db`) → **Create**
- ⬜ 생성 후 `domain-dictionary` 프로젝트에 **Connect** 클릭
  - 연결 완료 시 `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING` 등 자동 등록됨

### 2. 불필요한 환경변수 제거 (선택사항)

- ⬜ Vercel 대시보드 → **Environment Variables** 에서 아래 항목 제거:
  - `DATABASE_PATH`
  - `TURSO_DATABASE_URL` (있는 경우)
  - `TURSO_AUTH_TOKEN` (있는 경우)

### 3. 재배포 실행

- ⬜ Postgres 연결 후 재배포 필요:
  ```bash
  cd domain-dictionary
  npx vercel --prod --token $VERCEL_TOKEN --yes
  ```
  또는 `main` 브랜치에 Push하면 자동 배포됨

### 4. 기능 검증 (배포 후)

- ⬜ 로그인 (`/login`) — 관리자 계정으로 접속 (`ADMIN_USERNAME` / `ADMIN_PASSWORD`)
- ⬜ 대시보드 (`/dashboard`) — 서비스 상태 표시 확인
- ⬜ 환경설정 (`/settings`) — 웹훅 등록/조회 정상 동작
- ⬜ 웹훅 수신 테스트 — `POST /api/webhook/<code>` HTTP 200 응답
- ⬜ 분석 배치 수동 실행 — 정상 트리거
- ⬜ 용어사전 검색 (`/dictionary`) — 분석 완료 후 전문 검색 동작

### 5. Vercel Cron Jobs 등록 (분석 배치 자동 실행, 선택사항)

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
  > 무료 플랜: 하루 2회 / 유료 플랜: 시간당 1회

---

## 현재 환경변수 상태

| 키 | 설명 | 현재 상태 |
|----|------|-----------|
| `SESSION_SECRET` | 세션 암호화 키 | ✅ 등록됨 |
| `ADMIN_USERNAME` | 초기 관리자 아이디 | ✅ 등록됨 |
| `ADMIN_PASSWORD` | 초기 관리자 비밀번호 | ✅ 등록됨 |
| `GEMINI_API_KEY` | Gemini API 키 | ✅ 등록됨 |
| `GEMINI_MODEL` | 사용 모델명 | ✅ 등록됨 |
| `POSTGRES_URL` | Vercel Postgres 연결 URL | ⬜ Postgres 생성 후 자동 등록 |
| `POSTGRES_URL_NON_POOLING` | Drizzle 마이그레이션용 URL | ⬜ Postgres 생성 후 자동 등록 |

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
