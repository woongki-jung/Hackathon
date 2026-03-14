# User 데이터 정의

## 개요
- 서비스에 로그인하는 사용자 계정 정보를 관리한다.
- 관리자(admin)와 일반 사용자(user) 2가지 역할을 지원한다.
- 관련 도메인: 인증/인가 (POL-AUTH)

---

## DATA-001 User

### 엔티티 정보
| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | User |
| 테이블명 (물리) | users |
| 설명 | 서비스 이용 사용자 계정 (관리자/일반) |
| 데이터베이스 | SQLite (better-sqlite3 + Drizzle ORM) |
| 파티셔닝 | 없음 (소규모 데이터) |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | TEXT | 36 | YES | - | 기본 키 (UUID) | |
| username | username | TEXT | 20 | YES | - | 로그인 아이디 (4~20자, 영문소문자/숫자/_) | :lock: |
| passwordHash | password_hash | TEXT | 60 | YES | - | bcrypt 해싱된 비밀번호 | :lock: |
| role | role | TEXT | 10 | YES | `'user'` | 역할 (`admin` 또는 `user`) | |
| isActive | is_active | INTEGER | - | YES | `1` | 활성 상태 (1: 활성, 0: 비활성) | |
| createdAt | created_at | TEXT | - | YES | `datetime('now')` | 계정 생성 일시 | |
| updatedAt | updated_at | TEXT | - | YES | `datetime('now')` | 최종 수정 일시 | |
| deletedAt | deleted_at | TEXT | - | NO | `NULL` | 소프트 삭제 일시 | |

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| idx_users_username | username | BTREE | YES | 로그인 시 아이디 조회, 중복 방지 |
| idx_users_role | role | BTREE | NO | 역할별 사용자 목록 조회 |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| - | - | - | - | 현재 다른 엔티티와 직접 FK 관계 없음 |

### DDL

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

### Drizzle ORM 스키마 예시

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
});
```

### 비즈니스 규칙
- **초기 관리자 생성**: 서버 최초 실행 시 환경변수 `ADMIN_USERNAME`, `ADMIN_PASSWORD`로 관리자 계정 1개를 자동 생성한다 (POL-AUTH AUTH-R-001).
- **계정 등록 권한**: 관리자만 새 사용자 계정을 등록할 수 있다 (POL-AUTH AUTH-R-002).
- **아이디 규칙**: 4자 이상 20자 이하, 영문 소문자/숫자/언더스코어만 허용 (POL-AUTH AUTH-R-003).
- **아이디 유니크**: 시스템 내 고유해야 한다 (POL-AUTH AUTH-R-004).
- **비밀번호 해싱**: bcrypt (salt rounds: 10)으로 해싱하여 저장 (POL-AUTH AUTH-R-007).
- **비밀번호 정책**: 8자 이상, 영문자+숫자+특수문자 각 1자 이상 포함 (POL-AUTH AUTH-R-005, AUTH-R-006).
- **소프트 삭제**: 계정 삭제 시 `deleted_at`에 타임스탬프 설정 (POL-DATA DATA-R-015).
- **조회 시 필터**: 소프트 삭제된 계정은 기본 조회에서 제외 (`deleted_at IS NULL`).

### 마이그레이션 고려사항
- **초기 데이터(seed)**: 서버 시작 시 `ADMIN_USERNAME`/`ADMIN_PASSWORD` 환경변수 기반으로 관리자 계정이 없으면 자동 생성.
- **스키마 변경 시 주의**: `username` 유니크 제약은 소프트 삭제된 레코드도 포함하므로, 삭제된 사용자의 아이디 재사용이 불가함에 유의.
