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

## 보안 점검 완료 (2026-03-15)

- ✅ 소스 코드 내 하드코딩된 민감정보 없음 (전수 조사)
- ✅ git 히스토리 내 민감정보 커밋 이력 없음
- ✅ `.gitignore` 설정 적절 (`CLAUDE.local.md`, `.env.local` 모두 무시)
- ✅ `.env.local.example` — SQLite/IMAP 잔재 제거, PostgreSQL/웹훅 기준으로 업데이트
- ✅ `next.config.ts` — `better-sqlite3` 잔재(`serverExternalPackages`) 제거
- ✅ 모든 민감정보는 `process.env` 환경변수로만 참조 (안전)

---

## 수동 작업 필요 항목

### 1. Vercel Postgres 환경변수 등록

> Neon DB는 이미 생성되어 있습니다. Vercel 프로젝트에 환경변수를 수동으로 등록해야 합니다.

**방법 A: Vercel 대시보드에서 Neon 연결 (권장)**
- ⬜ Vercel 대시보드 → `domain-dictionary` 프로젝트 → **Storage** 탭
- ⬜ 기존 Neon DB가 있는 경우 **Connect Database** → 해당 DB 선택
  - 연결 완료 시 `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING` 등 자동 등록됨

**방법 B: 환경변수 직접 입력**
- ⬜ Vercel 대시보드 → **Settings** → **Environment Variables** 에서 아래 항목 추가:
  - `POSTGRES_URL` — Neon 연결 URL (pooler, channel_binding=require)
  - `POSTGRES_URL_NON_POOLING` — Neon 직접 연결 URL (마이그레이션용)
  - `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_DATABASE`, `POSTGRES_PASSWORD` — 선택사항
  > 연결 정보는 `CLAUDE.local.md` 또는 Neon 대시보드에서 확인

### 2. 불필요한 환경변수 제거 (선택사항)

- ✅ `DATABASE_PATH` 제거 완료 (2026-03-15)
- ⬜ Vercel 대시보드 → **Environment Variables** 에서 추가 확인:
  - `TURSO_DATABASE_URL` (있는 경우)
  - `TURSO_AUTH_TOKEN` (있는 경우)

### 3. 재배포 실행

- ✅ `vercel.json` (Cron Jobs 설정) 포함하여 `main` push → Vercel 자동 배포 트리거 (2026-03-15)
- ⬜ Vercel 대시보드 → Deployments 탭에서 최신 배포 `Ready` 상태 확인
- (필요 시) 수동 재배포:
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

### 5. Vercel Cron Jobs 등록 (분석 배치 자동 실행)

> **Vercel Hobby(무료) 플랜 제약:**
> - Cron Jobs: **1일 최대 2회** (특정 시간대만 지원)
> - Serverless Function 실행 시간: **최대 10초**
> - 시간당 실행이 필요하면 Pro 플랜(월 $20) 또는 외부 cron 서비스(GitHub Actions, cron-job.org) 활용

- ✅ `domain-dictionary/vercel.json` 생성 완료 (2026-03-15, 매일 09:00 UTC)
- ⬜ 배포 후 Vercel 대시보드 → **Settings** → **Cron Jobs** 탭에서 등록 확인

---

## 현재 환경변수 상태

| 키 | 설명 | 현재 상태 |
|----|------|-----------|
| `SESSION_SECRET` | 세션 암호화 키 | ✅ 등록됨 |
| `ADMIN_USERNAME` | 초기 관리자 아이디 | ✅ 등록됨 |
| `ADMIN_PASSWORD` | 초기 관리자 비밀번호 | ✅ 등록됨 |
| `GEMINI_API_KEY` | Gemini API 키 | ✅ 등록됨 |
| `GEMINI_MODEL` | 사용 모델명 | ✅ 등록됨 |
| `POSTGRES_URL` | Vercel Postgres 연결 URL | ✅ 등록됨 |
| `POSTGRES_URL_NON_POOLING` | Drizzle 마이그레이션용 URL | ✅ 등록됨 |

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
