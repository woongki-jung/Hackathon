# AppSetting 데이터 정의

## 개요
- 시스템 환경설정 값을 키-값(Key-Value) 형태로 저장한다.
- IMAP 서버 접속 정보 중 민감하지 않은 항목(호스트, 포트, 아이디, SSL 여부)을 DB에 저장한다.
- 민감정보(비밀번호, API 키)는 `.env.local`에서만 관리하며 DB에 저장하지 않는다 (POL-AUTH AUTH-R-017, AUTH-R-018).
- 관련 도메인: 설정 (POL-DATA, POL-AUTH)

---

## DATA-002 AppSetting

### 엔티티 정보
| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | AppSetting |
| 테이블명 (물리) | app_settings |
| 설명 | 시스템 환경설정 키-값 저장소 |
| 데이터베이스 | SQLite (better-sqlite3 + Drizzle ORM) |
| 파티셔닝 | 없음 |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | TEXT | 36 | YES | - | 기본 키 (UUID) | |
| settingKey | setting_key | TEXT | 100 | YES | - | 설정 키 (유니크) | |
| settingValue | setting_value | TEXT | 500 | NO | `NULL` | 설정 값 | |
| description | description | TEXT | 255 | NO | `NULL` | 설정 항목 설명 | |
| createdAt | created_at | TEXT | - | YES | `datetime('now')` | 생성 일시 | |
| updatedAt | updated_at | TEXT | - | YES | `datetime('now')` | 최종 수정 일시 | |

### 사전 정의 설정 키 목록

| setting_key | 설명 | 예시 값 | 민감여부 |
|-------------|------|---------|----------|
| `mail.imap.host` | IMAP 서버 호스트 주소 | `imap.gmail.com` | NO |
| `mail.imap.port` | IMAP 서버 포트 | `993` | NO |
| `mail.imap.username` | IMAP 로그인 아이디 | `user@example.com` | :lock: |
| `mail.imap.use_ssl` | SSL/TLS 사용 여부 | `true` | NO |
| `mail.check_interval` | 메일 확인 주기 (ms) | `3600000` | NO |
| `analysis.model` | Claude API 모델명 | `claude-sonnet-4-6` | NO |

> **주의**: IMAP 비밀번호(`MAIL_PASSWORD`)와 Claude API 키(`ANTHROPIC_API_KEY`)는 환경변수(`.env.local`)에서만 관리하며, 이 테이블에 저장하지 않는다.

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| idx_app_settings_key | setting_key | BTREE | YES | 설정 키 조회 및 중복 방지 |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| - | - | - | - | 독립 엔티티, FK 관계 없음 |

### DDL

```sql
CREATE TABLE app_settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_app_settings_key ON app_settings(setting_key);
```

### Drizzle ORM 스키마 예시

```typescript
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  settingValue: text('setting_value'),
  description: text('description'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
```

### 비즈니스 규칙
- **접근 제어**: 환경설정 변경은 관리자(`admin`)만 가능 (POL-AUTH AUTH-R-014).
- **조회 시 마스킹**: `mail.imap.username` 등 개인정보 필드는 API 응답 시 마스킹 처리 (POL-AUTH AUTH-R-020).
- **환경변수 우선**: DB 설정값과 환경변수가 모두 존재할 경우, 환경변수가 우선한다.
- **IMAP 설정 필수값**: `mail.imap.host`, `mail.imap.port`가 미설정이면 메일 수신 프로세스를 시작하지 않는다 (POL-MAIL MAIL-R-002).
- **환경변수 직접 접근 금지**: `.env.local` 파일은 웹 API를 통해 직접 읽기/수정 불가 (POL-DATA DATA-R-020).

### 마이그레이션 고려사항
- **초기 데이터(seed)**: 서버 최초 시작 시 사전 정의 설정 키를 기본값과 함께 삽입.
- **키 변경 시**: 기존 키를 삭제하지 않고 새 키를 추가한 후 마이그레이션 스크립트에서 값을 이전.
