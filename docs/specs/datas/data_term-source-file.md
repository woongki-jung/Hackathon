# TermSourceFile 데이터 정의

## 개요

용어가 발견된 출처 파일 목록을 관리하는 엔티티이다. Term 엔티티의 하위 엔티티로서, 하나의 용어당 최대 10건의 출처 파일을 기록한다 (POL-DATA DATA-04).

---

## DATA-004 TermSourceFile

### 엔티티 정보

| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | TermSourceFile |
| 테이블명 (물리) | term_source_files |
| 설명 | 용어 출처 파일 목록 (Term 하위) |
| 데이터베이스 | SQLite 3 |
| 파티셔닝 | 없음 |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | INTEGER | - | ✅ | AUTOINCREMENT | 기본 키 | |
| termId | term_id | INTEGER | - | ✅ | - | 용어 ID (FK -> terms.id) | |
| fileName | file_name | TEXT | 255 | ✅ | - | 출처 분석 요청 파일명 | |
| createdAt | created_at | TEXT | - | ✅ | datetime('now') | 생성일시 | |
| updatedAt | updated_at | TEXT | - | ✅ | datetime('now') | 수정일시 | |

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| idx_term_source_files_term_id | term_id | BTREE | - | 용어별 출처 조회 |
| uq_term_source_files_term_file | term_id, file_name | BTREE | ✅ | 동일 용어-파일 중복 방지 |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| term | Term | N:1 | term_id -> terms.id | 소속 용어 |

### DDL

```sql
CREATE TABLE IF NOT EXISTS term_source_files (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    term_id    INTEGER NOT NULL,
    file_name  TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_term_source_files_term_id
    ON term_source_files(term_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_term_source_files_term_file
    ON term_source_files(term_id, file_name);
```

### 비즈니스 규칙

- 하나의 용어당 최대 10건의 출처 파일을 유지한다 (POL-DATA DATA-04).
- 10건 초과 시 가장 오래된 레코드를 삭제하고 새 레코드를 삽입한다 (FIFO).
- 동일 용어-파일 조합은 중복 삽입하지 않는다 (UNIQUE 제약).
- 상위 Term 레코드가 삭제(물리 삭제)되면 CASCADE로 함께 삭제된다.
- Term이 소프트 삭제된 경우에는 출처 파일 레코드를 유지한다 (복구 시 함께 복원).

### 마이그레이션 고려사항

- 앱 최초 실행 시 테이블을 자동 생성한다.
- seed 데이터 불필요.
- SQLite에서 외래 키 제약을 활성화하려면 `PRAGMA foreign_keys = ON;`을 연결 시 실행해야 한다.
