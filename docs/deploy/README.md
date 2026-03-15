# 배포 가이드 (Vercel)

> PRD 기준: **Vercel 무료 인프라**를 사용하여 CI/CD 및 서비스 배포

## 배포 현황

| 항목 | 값 |
|------|-----|
| 프로젝트명 | `domain-dictionary` |
| 프로덕션 URL | https://domain-dictionary-iota.vercel.app |
| Vercel 팀 | `woongs1015-7255s-projects` |
| GitHub 저장소 | `woongki-jung/Hackathon` |
| 연동 브랜치 | `main` (Push 시 자동 배포) |
| 플랜 | Hobby (무료) |
| DB | Vercel Postgres (Neon) — 영구 저장 |

---

## 아키텍처 개요

```
GitHub (main 브랜치) → woongki-jung/Hackathon
    │
    ▼ Push → Vercel 자동 빌드·배포
Vercel (Next.js 16, Node.js 런타임)
    └── https://domain-dictionary-iota.vercel.app
    │
    ├── 인증 API / 사용자 관리 API
    ├── 환경설정 API (웹훅 관리)
    ├── 용어사전 API (PostgreSQL FTS)
    ├── 웹훅 수신 API (POST /api/webhook/[code])
    └── 분석 API
         │
         └── Vercel Postgres (Neon) — 영구 저장
```

---

## Vercel Postgres 설정 (최초 1회)

### 1단계: Vercel 대시보드에서 Postgres DB 생성

1. [vercel.com](https://vercel.com) 로그인 → `domain-dictionary` 프로젝트 선택
2. **Storage** 탭 → **Create Database** → **Neon Postgres** 선택
3. DB 이름 입력 (예: `domain-dictionary-db`) → **Create**
4. 생성 완료 후 `domain-dictionary` 프로젝트에 **Connect** 클릭
5. 연결 시 아래 환경변수가 자동 등록됨:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`

> ⚠️ DB 연결 후 재배포가 필요합니다. 아래 배포 절차를 따르세요.

---

## 환경변수 목록

| 키 | 설명 | 현재 상태 |
|----|------|-----------|
| `SESSION_SECRET` | 세션 암호화 키 (32자 이상) | 등록됨 |
| `ADMIN_USERNAME` | 초기 관리자 아이디 | 등록됨 |
| `ADMIN_PASSWORD` | 초기 관리자 비밀번호 | 등록됨 |
| `GEMINI_API_KEY` | Gemini API 키 | 등록됨 |
| `GEMINI_MODEL` | 사용 모델명 | 등록됨 |
| `POSTGRES_URL` | Vercel Postgres 연결 URL (자동) | Postgres 연결 후 자동 등록 |
| `POSTGRES_URL_NON_POOLING` | Drizzle 마이그레이션용 URL (자동) | Postgres 연결 후 자동 등록 |

**제거 대상 (더 이상 불필요)**:
- `DATABASE_PATH` — SQLite 파일 경로 (제거)
- `TURSO_DATABASE_URL` — Turso 연결 URL (제거)
- `TURSO_AUTH_TOKEN` — Turso 인증 토큰 (제거)
- `MAIL_STORAGE_PATH` — 메일 저장소 경로 (제거 가능, 웹훅 방식으로 전환)

---

## 배포 절차

### 자동 배포 (권장)
`main` 브랜치에 Push → Vercel 자동 빌드·배포

### 수동 배포 (CLI)
```bash
cd domain-dictionary
npx vercel --prod --token <VERCEL_TOKEN> --yes
```

---

## DB 스키마 초기화

Vercel Postgres는 애플리케이션 최초 기동 시(`instrumentation.ts`) 자동으로 테이블을 생성합니다. 별도의 마이그레이션 명령어 실행이 필요 없습니다.

생성 테이블:
- `users` — 사용자 계정
- `app_settings` — 앱 설정
- `mail_processing_logs` — 분석 처리 이력
- `terms` — 용어사전
- `term_source_files` — 용어 출처 파일
- `stop_words` — 불용어
- `analysis_queue` — 분석 큐
- `webhooks` — 웹훅 수신기

검색 인덱스:
- `terms_fts_idx` — PostgreSQL GIN 인덱스 (`to_tsvector`) — 빠른 전문 검색

---

## 트러블슈팅

### 최초 배포 후 관리자 로그인 불가
- **원인**: DB 테이블 미생성 상태
- **해결**: 재배포 또는 첫 요청 시 `instrumentation.ts`가 자동으로 `initDb()` + `seedAdmin()` 실행

### 검색이 동작하지 않음
- **원인**: GIN 인덱스 생성 전 대량 데이터 삽입
- **해결**: `REINDEX INDEX terms_fts_idx` 실행 (Vercel Postgres 콘솔에서)

### 스케줄러 미동작
- **원인**: Vercel Serverless에서 `node-cron` 실행 불가
- **해결**: Vercel Cron Jobs 등록 (`vercel.json`)
  ```json
  { "crons": [{ "path": "/api/mail/check", "schedule": "0 * * * *" }] }
  ```

### 웹훅 수신 API 인증 오류
- **원인**: `src/proxy.ts`의 PUBLIC_PATHS에 `/api/webhook/` 미등록
- **현재 상태**: 등록 완료 — 공개 접근 가능

---

## 참고 문서

- 배포 체크리스트: `docs/deploy/deploy.md`
- 사용자 가이드: `docs/user-guide.md`
