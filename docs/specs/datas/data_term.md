# Term 데이터 정의

## 개요

용어 사전의 핵심 엔티티이다. 메일에서 추출된 EMR/비즈니스/약어 용어와 Claude API로 생성된 해설을 저장한다. 용어사전 뷰어(POL-UI UI-04~06)에서 검색 및 조회 대상이 되는 주요 데이터이다.

---

## DATA-003 Term

### 엔티티 정보

| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | Term |
| 테이블명 (물리) | terms |
| 설명 | 용어 사전 항목 (용어, 분류, 해설, 발견 통계) |
| 데이터베이스 | SQLite 3 |
| 파티셔닝 | 없음 |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | INTEGER | - | ✅ | AUTOINCREMENT | 기본 키 | |
| term | term | TEXT | 200 | ✅ | - | 용어 원문 (고유) | |
| category | category | TEXT | 20 | ✅ | - | 분류 (EMR / Business / Abbreviation) | |
| summary | summary | TEXT | 100 | - | NULL | 1줄 요약 (50자 이내) | |
| description | description | TEXT | - | - | NULL | 상세 설명 (200자 이내) | |
| relatedTerms | related_terms | TEXT | - | - | NULL | 관련 용어 (JSON 배열 문자열) | |
| sourceCount | source_count | INTEGER | - | ✅ | 1 | 발견 횟수 | |
| firstSeenAt | first_seen_at | TEXT | - | ✅ | datetime('now') | 최초 발견 일시 | |
| lastSeenAt | last_seen_at | TEXT | - | ✅ | datetime('now') | 최근 발견 일시 | |
| isDescriptionComplete | is_description_complete | INTEGER | - | ✅ | 0 | 해설 완료 여부 (0: 미완료, 1: 완료) | |
| createdAt | created_at | TEXT | - | ✅ | datetime('now') | 생성일시 | |
| updatedAt | updated_at | TEXT | - | ✅ | datetime('now') | 수정일시 | |
| deletedAt | deleted_at | TEXT | - | - | NULL | 삭제일시 (소프트 삭제) | |

### category 필드 값 정의

| 값 | 설명 | 관련 정책 |
|----|------|-----------|
| EMR | EMR(전자의무기록) 시스템 관련 용어 | POL-TERM TERM-01 |
| Business | 의료/병원 업무 도메인 용어 | POL-TERM TERM-01 |
| Abbreviation | 업무에서 사용되는 약어/축약어 | POL-TERM TERM-01 |

### relatedTerms 필드 형식

JSON 배열 문자열로 저장한다. 예시:

```json
["OCS", "PACS", "EMR"]
```

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| uq_terms_term | term | BTREE | ✅ | 용어 원문 고유 제약 |
| idx_terms_category | category | BTREE | - | 카테고리별 필터링 |
| idx_terms_source_count | source_count | BTREE | - | 빈도순 정렬 |
| idx_terms_last_seen_at | last_seen_at | BTREE | - | 최근 발견 기준 정렬 |
| idx_terms_deleted_at | deleted_at | BTREE | - | 소프트 삭제 필터링 |
| idx_terms_search | term, description | - | - | 검색 성능 (FTS5 가상 테이블 권장) |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| sourceFiles | TermSourceFile | 1:N | term_source_files.term_id | 용어 출처 파일 목록 (최대 10건) |

### DDL

```sql
CREATE TABLE IF NOT EXISTS terms (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    term                     TEXT    NOT NULL UNIQUE,
    category                 TEXT    NOT NULL
                                     CHECK (category IN ('EMR', 'Business', 'Abbreviation')),
    summary                  TEXT,
    description              TEXT,
    related_terms            TEXT,
    source_count             INTEGER NOT NULL DEFAULT 1,
    first_seen_at            TEXT    NOT NULL DEFAULT (datetime('now')),
    last_seen_at             TEXT    NOT NULL DEFAULT (datetime('now')),
    is_description_complete  INTEGER NOT NULL DEFAULT 0
                                     CHECK (is_description_complete IN (0, 1)),
    created_at               TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at               TEXT    NOT NULL DEFAULT (datetime('now')),
    deleted_at               TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_terms_term
    ON terms(term) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_terms_category
    ON terms(category);

CREATE INDEX IF NOT EXISTS idx_terms_source_count
    ON terms(source_count);

CREATE INDEX IF NOT EXISTS idx_terms_last_seen_at
    ON terms(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_terms_deleted_at
    ON terms(deleted_at);
```

### FTS(전문 검색) 지원

검색 성능 향상을 위해 SQLite FTS5 가상 테이블을 활용한다 (POL-UI UI-05: 부분 일치, 실시간 검색).

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS terms_fts USING fts5(
    term,
    summary,
    description,
    content='terms',
    content_rowid='id'
);

-- terms 테이블 변경 시 FTS 인덱스 동기화 트리거
CREATE TRIGGER IF NOT EXISTS trg_terms_ai AFTER INSERT ON terms BEGIN
    INSERT INTO terms_fts(rowid, term, summary, description)
    VALUES (new.id, new.term, new.summary, new.description);
END;

CREATE TRIGGER IF NOT EXISTS trg_terms_au AFTER UPDATE ON terms BEGIN
    INSERT INTO terms_fts(terms_fts, rowid, term, summary, description)
    VALUES ('delete', old.id, old.term, old.summary, old.description);
    INSERT INTO terms_fts(rowid, term, summary, description)
    VALUES (new.id, new.term, new.summary, new.description);
END;

CREATE TRIGGER IF NOT EXISTS trg_terms_ad AFTER DELETE ON terms BEGIN
    INSERT INTO terms_fts(terms_fts, rowid, term, summary, description)
    VALUES ('delete', old.id, old.term, old.summary, old.description);
END;
```

### 비즈니스 규칙

- 용어 원문(`term`)은 대소문자를 구분하여 저장하되, 중복 판단 시에는 대소문자를 무시한다 (COLLATE NOCASE 적용 고려).
- 이미 존재하는 용어가 재발견된 경우 (POL-TERM TERM-04):
  - `source_count`를 1 증가
  - `last_seen_at`을 현재 시각으로 갱신
  - 해설 내용(`summary`, `description`)은 변경하지 않음
- 해설 미완료 상태(`is_description_complete = 0`)인 용어는 다음 배치에서 Claude API 호출 대상이 된다 (POL-TERM TERM-06).
- 소프트 삭제된 용어(`deleted_at IS NOT NULL`)는 뷰어에서 표시하지 않는다.
- 10,000건 초과 시 성능 모니터링을 권장한다 (POL-TERM).

### 데이터 생명주기

| 단계 | 조건 | 처리 |
|------|------|------|
| 생성 | 메일에서 신규 용어 추출 시 | INSERT (is_description_complete = 0) |
| 해설 완료 | Claude API 응답 수신 시 | UPDATE summary, description, related_terms, is_description_complete = 1 |
| 재발견 | 기존 용어가 다른 메일에서 재발견 시 | UPDATE source_count, last_seen_at |
| 삭제 | 사용자 수동 삭제 시 | UPDATE deleted_at (소프트 삭제) |

### 마이그레이션 고려사항

- 앱 최초 실행 시 테이블, FTS 가상 테이블, 트리거를 자동 생성한다.
- seed 데이터 불필요 (운영 중 자동 적재).
- `related_terms`는 JSON 배열 문자열로 저장하므로, 향후 별도 관계 테이블로 정규화할 수 있다.
- 카테고리 추가 시 CHECK 제약을 수정해야 한다.
