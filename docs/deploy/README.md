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

---

## 중요: SQLite 데이터 소멸 문제

### 문제 원인

Vercel Serverless 함수는 `/tmp` 디렉터리만 쓰기 가능하며, 이 경로는 **영구 저장소가 아닙니다.**

| 상황 | 결과 |
|------|------|
| **새 배포 실행** | `/tmp` 전체 삭제 → DB 소멸 |
| **콜드 스타트** | 새 함수 인스턴스 기동 → 빈 DB로 시작 |
| **동시 요청** | 인스턴스별 독립된 `/tmp` → 서로 다른 DB 참조 |

→ **결과**: 웹훅 등록 정보, 용어사전, 분석 이력이 언제든 소멸될 수 있음.
→ **현재 상태**: 기능 동작 확인은 가능하나 **운영 환경으로는 사용 불가**.

### 해결 방안 비교

| 방안 | 코드 변경량 | 비용 | 특징 |
|------|-----------|------|------|
| **[A] Turso (libSQL)** | 최소 | 무료 | SQLite 호환, 분산 영구 저장 |
| **[B] Railway 플랫폼 이전** | 없음 | 무료~$5/월 | 영구 파일시스템, 코드 변경 불필요 |
| **[C] Vercel Postgres (Neon)** | 중간 | 무료 | FTS5 재구현 필요 |

---

### [A] Turso 마이그레이션 (권장)

SQLite와 100% 호환되는 분산 DB. `better-sqlite3`를 `@libsql/client`로 교체합니다.

#### 1단계: Turso 프로젝트 생성

```bash
# Turso CLI 설치
npm install -g @turso/cli

# 로그인
turso auth login

# DB 생성
turso db create domain-dictionary

# 연결 URL + 인증 토큰 확인
turso db show domain-dictionary --url
turso db tokens create domain-dictionary
```

#### 2단계: 패키지 교체

```bash
cd domain-dictionary
npm uninstall better-sqlite3 @types/better-sqlite3
npm install @libsql/client drizzle-orm@latest
```

#### 3단계: `drizzle.config.ts` 수정

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

#### 4단계: `src/db/index.ts` 수정

```ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

> INIT_SCHEMA_SQL 방식은 `npm run db:migrate` 방식으로 전환 필요.

#### 5단계: Vercel 환경변수 추가

| 키 | 설명 |
|----|------|
| `TURSO_DATABASE_URL` | `libsql://domain-dictionary-xxx.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso 인증 토큰 |

`DATABASE_PATH`, `MAIL_STORAGE_PATH`, `GLOSSARY_STORAGE_PATH`는 불필요.

> **파일 저장소 추가 대응**: `/tmp/mails`, `/tmp/terms`도 동일하게 소멸됩니다.
> Turso 이전 시 분석 텍스트와 용어 파일도 DB 컬럼 저장으로 변경 필요합니다.

---

### [B] Railway 플랫폼 이전 (코드 변경 없음)

Railway는 영구 파일시스템을 지원하여 SQLite를 그대로 사용할 수 있습니다.

#### 배포 절차

1. [railway.app](https://railway.app) 가입 (GitHub 연동)
2. **New Project** → **Deploy from GitHub repo** → `woongki-jung/Hackathon` 선택
3. **Root Directory**: `domain-dictionary`
4. 환경변수 설정 (Vercel과 동일, `DATABASE_PATH=./data/app.db`로 변경)
5. **Volume 마운트**: `/app/data` 경로에 영구 볼륨 추가

```
Settings > Volumes > Mount Path: /app/data
```

6. Push 시 자동 배포

> **비용**: 무료 플랜은 월 $5 크레딧 제공 (소규모 서비스 운용 가능).

---

### [C] Vercel Postgres - Neon (현재 아키텍처 유지)

코드 변경이 가장 많습니다. FTS5 전문 검색을 pg_trgm 또는 tsvector로 재구현해야 합니다.

1. Vercel 대시보드 > Storage > **Create Database** (Neon Postgres)
2. `DATABASE_URL` 환경변수 자동 등록
3. `better-sqlite3` → `@vercel/postgres` 또는 `pg` 교체
4. Drizzle dialect를 `postgresql`로 변경
5. FTS5 가상 테이블 → `tsvector` 컬럼으로 재구현

---

## 아키텍처 개요 (현재)

```
GitHub (main 브랜치) → woongki-jung/Hackathon
    │
    ▼ Push → Vercel 자동 빌드·배포
Vercel (Next.js 16, Node.js 런타임)
    └── https://domain-dictionary-iota.vercel.app
    │
    ├── 인증 API / 사용자 관리 API
    ├── 환경설정 API (웹훅 관리)
    ├── 용어사전 API (FTS5 검색)
    ├── 웹훅 수신 API (POST /api/webhook/[code])
    └── 분석 API
         │
         ├── SQLite (/tmp/app.db) — 영구 저장 불가 (위 해결 방안 참조)
         └── 파일 저장소 (/tmp/mails, /tmp/terms) — 영구 저장 불가
```

---

## 배포 절차 (현재: Vercel CLI)

```bash
cd domain-dictionary
npx vercel --prod --token <VERCEL_TOKEN> --yes
```

---

## 환경변수 목록

| 키 | 설명 | 현재 상태 |
|----|------|-----------|
| `SESSION_SECRET` | 세션 암호화 키 (32자 이상) | 등록됨 |
| `ADMIN_USERNAME` | 초기 관리자 아이디 | 등록됨 |
| `ADMIN_PASSWORD` | 초기 관리자 비밀번호 | 등록됨 |
| `GEMINI_API_KEY` | Gemini API 키 | 등록됨 |
| `GEMINI_MODEL` | 사용 모델명 | 등록됨 |
| `DATABASE_PATH` | `/tmp/app.db` | 등록됨 (임시) |
| `MAIL_STORAGE_PATH` | `/tmp/mails` | 등록됨 (임시) |
| `GLOSSARY_STORAGE_PATH` | `/tmp/terms` | 등록됨 (임시) |

---

## 트러블슈팅

### DB 데이터 유실 (배포·콜드스타트)
- **원인**: Vercel `/tmp` 초기화 — 위 "SQLite 데이터 소멸 문제" 참조
- **해결**: [A] Turso 또는 [B] Railway로 이전

### 웹훅 등록 후 분석 시 DB가 비어있음
- **원인**: 요청별로 다른 함수 인스턴스 → 각자 독립된 `/tmp`
- **해결**: 영구 DB 이전 필요

### 관리자 로그인 불가 (최초 배포)
- **원인**: seedAdmin 미실행
- **해결**: `instrumentation.ts`에서 Vercel 환경에서도 seedAdmin 자동 실행됨 (현재 코드 기준)

### 스케줄러 미동작
- **원인**: Vercel Serverless에서 node-cron 실행 불가
- **해결**: `vercel.json` Cron Jobs 등록
  ```json
  { "crons": [{ "path": "/api/mail/check", "schedule": "0 * * * *" }] }
  ```

### better-sqlite3 빌드 오류
- **원인**: native addon 빌드 환경 불일치
- **해결**: Vercel 대시보드 > Settings > Node.js Version을 20.x로 설정
