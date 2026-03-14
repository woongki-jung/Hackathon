# MailProcessingLog 데이터 정의

## 개요
- 백그라운드 메일 수신/분석 프로세스의 실행 이력을 기록한다.
- 프론트엔드 "서비스 상태 조회" 페이지에서 마지막 실행 시점과 결과를 표시하는 데 사용한다.
- 관련 도메인: 메일 (POL-MAIL, POL-DATA)

---

## DATA-003 MailProcessingLog

### 엔티티 정보
| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | MailProcessingLog |
| 테이블명 (물리) | mail_processing_logs |
| 설명 | 메일 수신/분석 프로세스 실행 이력 |
| 데이터베이스 | SQLite (better-sqlite3 + Drizzle ORM) |
| 파티셔닝 | 없음 (90일 보존 후 하드 삭제) |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | TEXT | 36 | YES | - | 기본 키 (UUID) | |
| executedAt | executed_at | TEXT | - | YES | - | 작업 실행 시작 일시 | |
| completedAt | completed_at | TEXT | - | NO | `NULL` | 작업 완료 일시 | |
| processType | process_type | TEXT | 20 | YES | - | 프로세스 유형 (`mail_receive` / `term_analysis`) | |
| status | status | TEXT | 20 | YES | - | 실행 결과 (`success` / `failure` / `skipped`) | |
| mailCount | mail_count | INTEGER | - | NO | `0` | 처리된 메일 건수 | |
| analyzedCount | analyzed_count | INTEGER | - | NO | `0` | 분석 완료된 파일 건수 | |
| errorMessage | error_message | TEXT | 1000 | NO | `NULL` | 오류 발생 시 오류 메시지 | |
| createdAt | created_at | TEXT | - | YES | `datetime('now')` | 레코드 생성 일시 | |
| updatedAt | updated_at | TEXT | - | YES | `datetime('now')` | 레코드 수정 일시 | |

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| idx_mpl_executed_at | executed_at | BTREE | NO | 실행 일시 기준 정렬/조회 (최신순) |
| idx_mpl_process_type | process_type | BTREE | NO | 프로세스 유형별 필터 |
| idx_mpl_status | status | BTREE | NO | 상태별 필터 |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| - | - | - | - | 독립 엔티티, FK 관계 없음 |

### DDL

```sql
CREATE TABLE mail_processing_logs (
    id TEXT PRIMARY KEY,
    executed_at TEXT NOT NULL,
    completed_at TEXT,
    process_type TEXT NOT NULL CHECK (process_type IN ('mail_receive', 'term_analysis')),
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'skipped')),
    mail_count INTEGER DEFAULT 0,
    analyzed_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_mpl_executed_at ON mail_processing_logs(executed_at);
CREATE INDEX idx_mpl_process_type ON mail_processing_logs(process_type);
CREATE INDEX idx_mpl_status ON mail_processing_logs(status);
```

### Drizzle ORM 스키마 예시

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const mailProcessingLogs = sqliteTable('mail_processing_logs', {
  id: text('id').primaryKey(),
  executedAt: text('executed_at').notNull(),
  completedAt: text('completed_at'),
  processType: text('process_type', { enum: ['mail_receive', 'term_analysis'] }).notNull(),
  status: text('status', { enum: ['success', 'failure', 'skipped'] }).notNull(),
  mailCount: integer('mail_count').default(0),
  analyzedCount: integer('analyzed_count').default(0),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
```

### 비즈니스 규칙
- **실행 기록 필수**: 매 메일 확인/분석 작업 완료 시 결과를 기록한다 (POL-MAIL MAIL-R-014).
- **서비스 상태 표시**: 최신 레코드의 `executed_at`과 `status`를 프론트엔드에 표시한다 (POL-MAIL MAIL-R-015).
- **보존 기간**: 90일 경과 데이터는 하드 삭제 (POL-DATA DATA-R-016).
- **삭제 시점**: 메일 확인 주기 실행 시 90일 초과 레코드 자동 삭제.
- **프로세스 유형 구분**: `mail_receive`(메일 수신)와 `term_analysis`(용어 분석)를 별도 레코드로 기록.

### 마이그레이션 고려사항
- **초기 데이터**: 불필요 (서비스 실행 시 자동 생성됨).
- **보존 정책 변경 시**: 삭제 스케줄러의 기준일 설정만 변경하면 됨.
