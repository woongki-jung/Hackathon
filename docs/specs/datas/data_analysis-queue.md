# AnalysisQueue 데이터 정의

## 개요
- 메일 수신 후 분석 대기 중인 파일의 상태를 관리하는 대기열이다.
- 분석 완료 시 요약, 후속 작업 제안 등 분석 결과도 이 테이블에 저장한다.
- 관련 도메인: 분석 (POL-TERM, POL-MAIL, POL-DATA)

---

## DATA-007 AnalysisQueue

### 엔티티 정보
| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | AnalysisQueue |
| 테이블명 (물리) | analysis_queue |
| 설명 | 메일 파일 분석 대기열 및 분석 결과 저장 |
| 데이터베이스 | SQLite (better-sqlite3 + Drizzle ORM) |
| 파티셔닝 | 없음 |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | TEXT | 36 | YES | - | 기본 키 (UUID) | |
| fileName | file_name | TEXT | 255 | YES | - | 메일 임시 파일명 (`{timestamp}_{hash}.txt`, 유니크) | |
| status | status | TEXT | 20 | YES | `'pending'` | 분석 상태 (`pending` / `processing` / `completed` / `failed`) | |
| summary | summary | TEXT | - | NO | `NULL` | 메일 핵심 내용 요약 (최대 500자) | |
| actionItems | action_items | TEXT | - | NO | `NULL` | 후속 작업 제안 목록 (JSON 배열 문자열, 최대 5개) | |
| extractedTermCount | extracted_term_count | INTEGER | - | NO | `0` | 추출된 용어 수 | |
| retryCount | retry_count | INTEGER | - | YES | `0` | 재시도 횟수 (최대 3회) | |
| errorMessage | error_message | TEXT | 1000 | NO | `NULL` | 분석 실패 시 오류 메시지 | |
| analyzedAt | analyzed_at | TEXT | - | NO | `NULL` | 분석 완료 일시 | |
| mailSubject | mail_subject | TEXT | 500 | NO | `NULL` | 메일 제목 (분석 결과에서 추출) | |
| mailReceivedAt | mail_received_at | TEXT | - | NO | `NULL` | 메일 수신 일시 (파일명에서 추출) | |
| createdAt | created_at | TEXT | - | YES | `datetime('now')` | 대기열 등록 일시 | |
| updatedAt | updated_at | TEXT | - | YES | `datetime('now')` | 최종 상태 변경 일시 | |

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| idx_aq_file_name | file_name | BTREE | YES | 파일명 중복 방지 및 조회 |
| idx_aq_status | status | BTREE | NO | 상태별 필터 (pending 우선 조회) |
| idx_aq_created_at | created_at | BTREE | NO | 등록순 정렬 |
| idx_aq_analyzed_at | analyzed_at | BTREE | NO | 분석 완료순 정렬 (업무지원 페이지용) |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| extractedTerms | Term | 1:N (논리적) | term_source_files.mail_file_name | 이 파일에서 추출된 용어 목록 (TermSourceFile 경유) |

> `analysis_queue`와 `terms`는 직접 FK 관계가 아닌, `term_source_files.mail_file_name`을 통해 논리적으로 연결된다.

### DDL

```sql
CREATE TABLE analysis_queue (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    summary TEXT,
    action_items TEXT,
    extracted_term_count INTEGER DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    analyzed_at TEXT,
    mail_subject TEXT,
    mail_received_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_aq_file_name ON analysis_queue(file_name);
CREATE INDEX idx_aq_status ON analysis_queue(status);
CREATE INDEX idx_aq_created_at ON analysis_queue(created_at);
CREATE INDEX idx_aq_analyzed_at ON analysis_queue(analyzed_at);
```

### Drizzle ORM 스키마 예시

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const analysisQueue = sqliteTable('analysis_queue', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull().unique(),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).notNull().default('pending'),
  summary: text('summary'),
  actionItems: text('action_items'), // JSON 배열 문자열
  extractedTermCount: integer('extracted_term_count').default(0),
  retryCount: integer('retry_count').notNull().default(0),
  errorMessage: text('error_message'),
  analyzedAt: text('analyzed_at'),
  mailSubject: text('mail_subject'),
  mailReceivedAt: text('mail_received_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
```

### 비즈니스 규칙
- **상태 전이**: `pending` -> `processing` -> `completed` 또는 `failed`
- **중복 등록 방지**: 이미 분석 완료/실패한 파일은 재등록하지 않는다 (POL-TERM TERM-R-003).
- **재시도 정책**: 실패 시 다음 주기에 재시도, 최대 3회 (`retry_count` < 3이면 `pending`으로 복귀). 3회 연속 실패 시 `failed` 확정 (POL-TERM TERM-R-021).
- **요약 생성**: 메일 핵심 내용 요약 최대 500자 (POL-TERM TERM-R-010).
- **후속 작업**: 최대 5개 항목의 후속 작업 제안 생성, JSON 배열로 저장 (POL-TERM TERM-R-011).
- **메일 원본 연결**: `file_name` 필드로 메일 임시 파일과 연결 (POL-TERM TERM-R-012).
- **영구 보존**: 분석 결과(요약, 후속 작업)는 영구 보존 (POL-DATA DATA-R-018).
- **업무지원 페이지**: 최신 분석 결과를 상단에 노출하고, 이전 이력은 목록으로 제공 (POL-UI UI-R-008, UI-R-016).
- **본문 길이 제한**: API 호출 시 메일 본문 최대 10,000자 (POL-TERM TERM-R-009).

### 마이그레이션 고려사항
- **초기 데이터**: 불필요 (메일 수신 시 자동 등록).
- **actionItems 형식**: JSON 배열 문자열. 예: `["회의 일정 확인","담당자에게 회신","보고서 작성"]`
- **status 확장 시**: CHECK 제약조건 변경이 필요하며, SQLite에서는 테이블 재생성이 필요할 수 있다.
