# TermSourceFile 데이터 정의

## 개요
- 용어가 추출된 메일 출처 파일 정보를 저장한다.
- 용어(Term)와 N:1 관계로, 하나의 용어가 여러 메일에서 발견될 수 있다.
- 용어 해설집 파일의 메타정보(출처 메일 제목, 수신일) 갱신에 활용한다.
- 관련 도메인: 용어 (POL-TERM)

---

## DATA-005 TermSourceFile

### 엔티티 정보
| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | TermSourceFile |
| 테이블명 (물리) | term_source_files |
| 설명 | 용어가 추출된 메일 출처 파일 정보 |
| 데이터베이스 | SQLite (better-sqlite3 + Drizzle ORM) |
| 파티셔닝 | 없음 |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | TEXT | 36 | YES | - | 기본 키 (UUID) | |
| termId | term_id | TEXT | 36 | YES | - | 용어 ID (FK -> terms.id) | |
| mailFileName | mail_file_name | TEXT | 255 | YES | - | 메일 임시 파일명 (`{timestamp}_{hash}.txt`) | |
| mailSubject | mail_subject | TEXT | 500 | NO | `NULL` | 메일 제목 | |
| mailReceivedAt | mail_received_at | TEXT | - | NO | `NULL` | 메일 수신 일시 | |
| createdAt | created_at | TEXT | - | YES | `datetime('now')` | 레코드 생성 일시 | |

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| idx_tsf_term_id | term_id | BTREE | NO | 용어별 출처 목록 조회 |
| idx_tsf_mail_file | mail_file_name | BTREE | NO | 메일 파일별 추출 용어 조회 |
| idx_tsf_term_mail | term_id, mail_file_name | BTREE | YES | 동일 용어-파일 조합 중복 방지 |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| term | Term | N:1 | term_source_files.term_id -> terms.id | 해당 용어 |

### DDL

```sql
CREATE TABLE term_source_files (
    id TEXT PRIMARY KEY,
    term_id TEXT NOT NULL REFERENCES terms(id),
    mail_file_name TEXT NOT NULL,
    mail_subject TEXT,
    mail_received_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tsf_term_id ON term_source_files(term_id);
CREATE INDEX idx_tsf_mail_file ON term_source_files(mail_file_name);
CREATE UNIQUE INDEX idx_tsf_term_mail ON term_source_files(term_id, mail_file_name);
```

### Drizzle ORM 스키마 예시

```typescript
import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { terms } from './terms';

export const termSourceFiles = sqliteTable('term_source_files', {
  id: text('id').primaryKey(),
  termId: text('term_id').notNull().references(() => terms.id),
  mailFileName: text('mail_file_name').notNull(),
  mailSubject: text('mail_subject'),
  mailReceivedAt: text('mail_received_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  termMailUnique: uniqueIndex('idx_tsf_term_mail').on(table.termId, table.mailFileName),
}));
```

### 비즈니스 규칙
- **영구 보존**: 용어와 마찬가지로 출처 정보도 삭제하지 않는다 (POL-DATA DATA-R-017).
- **중복 방지**: 동일 용어-파일 조합은 1건만 저장 (유니크 인덱스).
- **메타정보 활용**: 용어 해설집 파일에 출처 메일 정보를 포함할 때 이 테이블을 참조 (POL-TERM TERM-R-019).
- **빈도 계산**: `term_source_files`의 레코드 수가 곧 해당 용어의 발견 빈도이며, `terms.frequency` 필드와 일치해야 한다.

### 마이그레이션 고려사항
- **초기 데이터**: 불필요 (분석 실행 시 자동 생성).
- **FK 제약**: SQLite의 외래 키 제약은 `PRAGMA foreign_keys = ON` 설정이 필요하다. DB 연결 시 활성화할 것.
