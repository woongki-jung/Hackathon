# AnalysisQueue 데이터 정의

## 개요

용어 해설 생성을 위한 분석 대기 및 재시도 큐를 관리하는 엔티티이다. 메일에서 추출된 용어 중 해설이 필요한 항목을 큐에 등록하고, Claude API 호출 결과에 따라 상태를 관리한다 (POL-TERM TERM-05, TERM-06).

---

## DATA-006 AnalysisQueue

### 엔티티 정보

| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | AnalysisQueue |
| 테이블명 (물리) | analysis_queue |
| 설명 | 용어 해설 생성 대기/재시도 큐 |
| 데이터베이스 | SQLite 3 |
| 파티셔닝 | 없음 |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | INTEGER | - | ✅ | AUTOINCREMENT | 기본 키 | |
| termId | term_id | INTEGER | - | - | NULL | 용어 ID (FK -> terms.id, 등록 전에는 NULL) | |
| termText | term_text | TEXT | 200 | ✅ | - | 용어 원문 | |
| category | category | TEXT | 20 | ✅ | - | 분류 (EMR / Business / Abbreviation) | |
| contextSnippet | context_snippet | TEXT | 500 | - | NULL | 용어 전후 문맥 (200자) | |
| sourceFile | source_file | TEXT | 255 | ✅ | - | 출처 파일명 | |
| status | status | TEXT | 20 | ✅ | 'PENDING' | 처리 상태 | |
| retryCount | retry_count | INTEGER | - | ✅ | 0 | 재시도 횟수 | |
| errorMessage | error_message | TEXT | - | - | NULL | 오류 메시지 (실패 시) | |
| createdAt | created_at | TEXT | - | ✅ | datetime('now') | 생성일시 | |
| updatedAt | updated_at | TEXT | - | ✅ | datetime('now') | 수정일시 | |

### status 필드 값 정의

| 값 | 설명 |
|----|------|
| PENDING | 대기 중 (아직 API 호출 전) |
| PROCESSING | 처리 중 (API 호출 중) |
| COMPLETED | 완료 (해설 생성 성공) |
| FAILED | 실패 (최대 재시도 초과) |
| SKIPPED | 건너뜀 (이미 사전에 해설 존재) |

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| idx_analysis_queue_status | status | BTREE | - | 상태별 대기 항목 조회 |
| idx_analysis_queue_created_at | created_at | BTREE | - | 생성순 정렬 (오래된 것 우선 처리) |
| idx_analysis_queue_term_id | term_id | BTREE | - | 용어별 큐 조회 |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| term | Term | N:1 | term_id -> terms.id | 연결된 용어 (해설 생성 후 연결) |

### DDL

```sql
CREATE TABLE IF NOT EXISTS analysis_queue (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    term_id         INTEGER,
    term_text       TEXT    NOT NULL,
    category        TEXT    NOT NULL
                            CHECK (category IN ('EMR', 'Business', 'Abbreviation')),
    context_snippet TEXT,
    source_file     TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED')),
    retry_count     INTEGER NOT NULL DEFAULT 0,
    error_message   TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analysis_queue_status
    ON analysis_queue(status);

CREATE INDEX IF NOT EXISTS idx_analysis_queue_created_at
    ON analysis_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_queue_term_id
    ON analysis_queue(term_id);
```

### 비즈니스 규칙

- 메일 분석 시 추출된 용어 중 해설이 필요한 항목을 `PENDING` 상태로 큐에 등록한다.
- 이미 사전에 해설이 완료된 용어는 `SKIPPED` 상태로 등록한다 (POL-TERM TERM-03: API 호출 비용 절감).
- 배치 처리 시 `PENDING` 상태 항목을 `created_at` 오름차순으로 최대 20건 처리한다 (POL-TERM TERM-05).
- API 호출 실패 시 (POL-TERM TERM-06):
  - `retry_count`를 1 증가시키고 `error_message`에 오류 내용을 기록한다.
  - `retry_count`가 3 미만이면 `PENDING` 상태로 유지하여 다음 배치에서 재시도한다.
  - `retry_count`가 3 이상이면 `FAILED` 상태로 변경한다.
- 처리 완료(`COMPLETED`) 및 실패(`FAILED`) 항목은 7일 후 물리 삭제할 수 있다 (정리 배치).
- 일일 최대 API 호출 횟수(200건, app_settings의 `term_daily_api_max_calls`)를 초과하면 처리를 중단한다.

### 마이그레이션 고려사항

- 앱 최초 실행 시 테이블을 자동 생성한다.
- seed 데이터 불필요.
- `context_snippet` 필드에는 개인정보가 포함될 수 있으므로, 처리 완료 후 일정 기간이 지나면 정리(삭제)하는 것을 권장한다.
- SQLite에서 외래 키 제약을 활성화하려면 `PRAGMA foreign_keys = ON;`을 연결 시 실행해야 한다.
