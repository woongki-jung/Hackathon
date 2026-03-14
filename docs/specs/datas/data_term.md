# Term 데이터 정의

## 개요
- 메일 분석을 통해 추출된 업무 용어와 해설을 저장한다.
- DB에 메타정보를 저장하고, 동시에 `GLOSSARY_STORAGE_PATH`에 `<용어>.md` 파일로도 저장한다 (이중 저장).
- 용어사전 뷰어의 검색 및 빈도 표시에 활용한다.
- 관련 도메인: 용어 (POL-TERM, POL-DATA)

---

## DATA-004 Term

### 엔티티 정보
| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | Term |
| 테이블명 (물리) | terms |
| 설명 | 추출된 업무 용어 및 해설 |
| 데이터베이스 | SQLite (better-sqlite3 + Drizzle ORM) |
| 파티셔닝 | 없음 |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | TEXT | 36 | YES | - | 기본 키 (UUID) | |
| name | name | TEXT | 200 | YES | - | 용어명 (유니크) | |
| category | category | TEXT | 50 | NO | `NULL` | 분류 (`emr` / `business` / `abbreviation` / `general`) | |
| description | description | TEXT | - | YES | - | 용어 해설 (제한 없음) | |
| filePath | file_path | TEXT | 500 | NO | `NULL` | 용어 해설집 파일 상대경로 (`./data/terms/<용어>.md`) | |
| frequency | frequency | INTEGER | - | YES | `1` | 발견 빈도 (메일에서 추출될 때마다 증가) | |
| lastSourceMailSubject | last_source_mail_subject | TEXT | 500 | NO | `NULL` | 마지막 출처 메일 제목 | |
| lastSourceMailDate | last_source_mail_date | TEXT | - | NO | `NULL` | 마지막 출처 메일 수신일 | |
| createdAt | created_at | TEXT | - | YES | `datetime('now')` | 최초 추출 일시 | |
| updatedAt | updated_at | TEXT | - | YES | `datetime('now')` | 마지막 갱신 일시 | |

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| idx_terms_name | name | BTREE | YES | 용어명 중복 방지 및 정확 검색 |
| idx_terms_category | category | BTREE | NO | 분류별 필터 |
| idx_terms_frequency | frequency | BTREE | NO | 빈도순 정렬 (상위 용어 조회) |
| idx_terms_updated_at | updated_at | BTREE | NO | 최신 갱신순 정렬 |

### FTS5 전문 검색 테이블

용어 검색 성능을 위해 SQLite FTS5 가상 테이블을 사용한다.

```sql
CREATE VIRTUAL TABLE terms_fts USING fts5(
    name,
    description,
    content='terms',
    content_rowid='rowid'
);
```

> FTS5 테이블은 `terms` 테이블과 동기화하여 유지한다. INSERT/UPDATE/DELETE 시 트리거 또는 애플리케이션 레벨에서 동기화한다.

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| sourceFiles | TermSourceFile | 1:N | term_source_files.term_id | 용어가 추출된 출처 메일 파일 목록 |

### DDL

```sql
CREATE TABLE terms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT CHECK (category IN ('emr', 'business', 'abbreviation', 'general')),
    description TEXT NOT NULL,
    file_path TEXT,
    frequency INTEGER NOT NULL DEFAULT 1,
    last_source_mail_subject TEXT,
    last_source_mail_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_terms_name ON terms(name);
CREATE INDEX idx_terms_category ON terms(category);
CREATE INDEX idx_terms_frequency ON terms(frequency);
CREATE INDEX idx_terms_updated_at ON terms(updated_at);

-- FTS5 전문 검색 테이블
CREATE VIRTUAL TABLE terms_fts USING fts5(
    name,
    description,
    content='terms',
    content_rowid='rowid'
);

-- FTS5 동기화 트리거
CREATE TRIGGER terms_ai AFTER INSERT ON terms BEGIN
    INSERT INTO terms_fts(rowid, name, description) VALUES (new.rowid, new.name, new.description);
END;

CREATE TRIGGER terms_ad AFTER DELETE ON terms BEGIN
    INSERT INTO terms_fts(terms_fts, rowid, name, description) VALUES ('delete', old.rowid, old.name, old.description);
END;

CREATE TRIGGER terms_au AFTER UPDATE ON terms BEGIN
    INSERT INTO terms_fts(terms_fts, rowid, name, description) VALUES ('delete', old.rowid, old.name, old.description);
    INSERT INTO terms_fts(rowid, name, description) VALUES (new.rowid, new.name, new.description);
END;
```

### Drizzle ORM 스키마 예시

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const terms = sqliteTable('terms', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  category: text('category', { enum: ['emr', 'business', 'abbreviation', 'general'] }),
  description: text('description').notNull(),
  filePath: text('file_path'),
  frequency: integer('frequency').notNull().default(1),
  lastSourceMailSubject: text('last_source_mail_subject'),
  lastSourceMailDate: text('last_source_mail_date'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
```

> FTS5 가상 테이블은 Drizzle ORM에서 직접 정의할 수 없으므로, 별도 raw SQL 마이그레이션으로 생성한다.

### 비즈니스 규칙
- **이중 저장**: DB 메타정보 저장과 동시에 `<용어>.md` 파일도 생성/갱신 (POL-TERM TERM-R-016).
- **영구 보존**: 용어 데이터는 삭제하지 않는다 (POL-DATA DATA-R-017).
- **빈도 증가**: 동일 용어가 다른 메일에서 재추출되면 `frequency`를 1 증가시킨다.
- **해설 갱신 조건**: 새 해설의 문자 수가 기존 대비 20% 이상 증가했거나, 새 출처 메일 정보가 추가된 경우 갱신 (POL-TERM TERM-R-018).
- **1건당 최대 30개**: 단일 메일에서 추출하는 용어 수는 최대 30개 (POL-TERM TERM-R-015).
- **분류 기준**: EMR 시스템 용어, 비즈니스 용어, 약어로 분류 (POL-TERM TERM-R-013).
- **파일명 치환**: 파일명에 사용 불가 문자는 언더스코어로 치환 (POL-DATA DATA-R-012).
- **해설집 파일 형식**: 마크다운, 용어명(제목) + 해설(본문) + 메타정보(갱신 일시, 출처) 포함 (POL-TERM TERM-R-017, TERM-R-019).
- **검색**: FTS5를 활용한 전문 검색, 300ms 디바운스 적용 (POL-UI UI-R-012).
- **빈도 상위 표시**: 빈도 내림차순 상위 10개를 용어사전 뷰어에 표시 (POL-UI UI-R-017).

### 마이그레이션 고려사항
- **FTS5 테이블**: Drizzle ORM 마이그레이션 외에 별도 raw SQL로 FTS5 테이블과 트리거를 생성해야 한다.
- **기존 데이터 FTS 인덱싱**: FTS5 테이블 생성 후 기존 `terms` 데이터를 FTS에 수동 삽입하는 마이그레이션 스크립트 필요.
- **파일 시스템 동기**: DB의 `file_path`와 실제 파일 경로 불일치 시 복구 로직 필요.
