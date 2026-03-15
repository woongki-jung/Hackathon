# 배포 가이드 (Vercel)

> PRD 기준: **Vercel 무료 인프라**를 사용하여 CI/CD 및 서비스 배포

---

## 아키텍처 개요

```
GitHub (main 브랜치)
    │
    ▼ Push → Vercel 자동 빌드·배포
Vercel (Next.js 15, Node.js 런타임)
    │
    ├── 인증 API / 사용자 관리 API
    ├── 환경설정 API (DB 설정 저장)
    ├── 용어사전 API (FTS5 검색)
    └── 분석 API
         │
         ├── SQLite (data/app.db) — ⚠️ 아래 제약 참조
         └── 파일 저장소 (data/mails, data/terms) — ⚠️ 아래 제약 참조
```

---

## Vercel 환경 제약 사항 ⚠️

| 기능 | 로컬/VPS | Vercel 무료 |
|------|----------|------------|
| SQLite 파일 DB | ✅ 영구 저장 | ⚠️ `/tmp` 만 쓰기 가능, 재배포 시 초기화 |
| 메일 .txt 임시 저장 | ✅ 파일 시스템 | ⚠️ `/tmp` 사용 (단기 유지) |
| 용어 .md 해설집 저장 | ✅ 파일 시스템 | ⚠️ `/tmp` 사용 (단기 유지) |
| node-cron 스케줄러 | ✅ 상시 실행 | ❌ Serverless 특성상 불가 → Vercel Cron Jobs 대체 |
| 최초 실행 seedAdmin | ✅ instrumentation | ❌ `VERCEL` 환경변수로 자동 스킵됨 |

> **참고**: 현재 코드는 `instrumentation.ts`에 `!process.env.VERCEL` 가드가 적용되어 있어,
> Vercel 환경에서는 스케줄러 초기화와 seedAdmin이 실행되지 않습니다.

---

## 배포 절차

### 방법 1: GitHub 연동 자동 배포 (권장)

#### 1단계: Vercel 프로젝트 연결

1. [vercel.com](https://vercel.com) 로그인
2. **Add New Project** → GitHub 저장소 선택
3. **Root Directory**: `domain-dictionary` 설정
4. **Framework Preset**: Next.js (자동 감지)
5. **Build Command**: `npm run build` (기본값)
6. **Output Directory**: `.next` (기본값)

#### 2단계: 환경변수 설정

Vercel 대시보드 > Project > Settings > Environment Variables에서 아래 항목 추가:

| 키 | 설명 | 예시 |
|----|------|------|
| `SESSION_SECRET` | 세션 암호화 키 (32자 이상) | `openssl rand -hex 32` 결과값 |
| `ADMIN_USERNAME` | 초기 관리자 아이디 | `admin` |
| `ADMIN_PASSWORD` | 초기 관리자 비밀번호 | `Admin1234!@` |
| `MAIL_IMAP_HOST` | IMAP 서버 주소 | `imap.gmail.com` |
| `MAIL_IMAP_PORT` | IMAP 포트 | `993` |
| `MAIL_USERNAME` | 메일 계정 아이디 | `user@gmail.com` |
| `MAIL_PASSWORD` | 메일 비밀번호 (앱 비밀번호) | — |
| `MAIL_USE_SSL` | SSL 사용 여부 | `true` |
| `MAIL_CHECK_INTERVAL` | 메일 확인 주기 (ms) | `3600000` |
| `GEMINI_API_KEY` | Gemini API 키 | — |
| `GEMINI_MODEL` | 사용 모델명 | `gemini-2.0-flash` |
| `DATABASE_PATH` | DB 경로 | `/tmp/app.db` |
| `MAIL_STORAGE_PATH` | 메일 임시 저장 경로 | `/tmp/mails` |
| `GLOSSARY_STORAGE_PATH` | 용어 해설집 경로 | `/tmp/terms` |

> ⚠️ Vercel에서는 `DATABASE_PATH`, `MAIL_STORAGE_PATH`, `GLOSSARY_STORAGE_PATH` 모두
> `/tmp/...` 경로로 설정해야 합니다 (`/tmp`만 쓰기 가능).

#### 3단계: 배포

`main` 브랜치에 Push 시 자동 배포됩니다.

```bash
git push origin main
```

---

### 방법 2: Vercel CLI 수동 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 프로젝트 루트에서 배포 (domain-dictionary 디렉터리)
cd domain-dictionary
vercel --prod
```

토큰으로 인증하는 경우:
```bash
vercel --token <VERCEL_TOKEN> --prod
```

---

## 최초 배포 후 관리자 계정 생성

Vercel 환경에서는 `instrumentation.ts`의 seedAdmin이 자동 실행되지 않습니다.
최초 배포 후 관리자 계정을 수동으로 생성해야 합니다.

```bash
# 로컬에서 Vercel 환경변수와 동일한 설정으로 seed 스크립트 실행
# 또는 Vercel 대시보드 > Functions > invoke로 실행
```

> **대안**: 로컬에서 `npm run dev`로 seedAdmin을 실행하고 `data/app.db`를 Vercel에 업로드
> (단, Vercel 재배포 시 `/tmp` 초기화로 인해 DB가 삭제됨)

---

## 메일 수집 스케줄러 (Vercel 환경)

Vercel에서는 node-cron 상시 실행이 불가합니다.
**Vercel Cron Jobs**를 사용하여 주기적 실행을 대체합니다.

### vercel.json 설정 (크론 등록)

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

> 무료 플랜 기준: 하루 2회 실행 제한. 유료 플랜에서 시간당 1회 실행 가능.

---

## CI/CD 플로우

```
개발자 Push (main)
    │
    ▼
GitHub Actions / Vercel Build
    ├── npm install
    ├── npm run build
    └── 빌드 성공 시 → Vercel Edge Network에 배포
```

---

## 트러블슈팅

### DB 데이터 유실
- **원인**: Vercel 재배포 시 `/tmp` 초기화
- **해결**: 영구 DB 솔루션 마이그레이션 권장 (Vercel Postgres, Turso 등)

### 관리자 로그인 불가 (최초 배포)
- **원인**: `seedAdmin` 미실행
- **해결**: Vercel 환경변수에 `ADMIN_USERNAME`, `ADMIN_PASSWORD` 설정 확인 후 로컬에서 DB 초기화

### 스케줄러 미동작
- **원인**: Vercel Serverless 환경에서 node-cron 실행 불가
- **해결**: `vercel.json`에 Cron Jobs 등록 또는 `/api/mail/check` 수동 호출

### better-sqlite3 빌드 오류
- **원인**: native addon 빌드 환경 불일치
- **해결**: Vercel 대시보드 > Settings > Node.js Version을 20.x로 설정
