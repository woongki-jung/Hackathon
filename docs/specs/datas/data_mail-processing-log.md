# MailProcessingLog 데이터 정의

## 개요

처리 완료된 메일의 기록을 관리하는 엔티티이다. 메일의 Message ID를 저장하여 중복 처리를 방지한다 (POL-MAIL MAIL-03). 메일 본문 자체는 DB에 저장하지 않고 로컬 텍스트 파일로만 관리한다.

---

## DATA-002 MailProcessingLog

### 엔티티 정보

| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | MailProcessingLog |
| 테이블명 (물리) | mail_processing_logs |
| 설명 | 처리 완료된 메일 기록 (중복 수신 방지) |
| 데이터베이스 | SQLite 3 |
| 파티셔닝 | 없음 |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | INTEGER | - | ✅ | AUTOINCREMENT | 기본 키 | |
| messageId | message_id | TEXT | 255 | ✅ | - | 메일 Message ID (고유) | |
| messageIdHash | message_id_hash | TEXT | 8 | ✅ | - | Message ID의 SHA256 해시 앞 8자리 | |
| subject | subject | TEXT | - | - | NULL | 메일 제목 (참조용) | |
| receivedAt | received_at | TEXT | - | ✅ | - | 메일 수신 일시 (ISO 8601) | |
| fileName | file_name | TEXT | 255 | ✅ | - | 저장된 분석 요청 파일명 | |
| status | status | TEXT | 20 | ✅ | 'SAVED' | 처리 상태 | |
| createdAt | created_at | TEXT | - | ✅ | datetime('now') | 레코드 생성일시 | |
| updatedAt | updated_at | TEXT | - | ✅ | datetime('now') | 레코드 수정일시 | |

### status 필드 값 정의

| 값 | 설명 |
|----|------|
| SAVED | 메일 내용이 분석 요청 파일로 저장됨 |
| ANALYZED | 분석 완료 (용어 추출 및 해설 생성 완료) |
| ERROR | 처리 중 오류 발생 |

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| uq_mail_processing_logs_message_id | message_id | BTREE | ✅ | Message ID 중복 방지 |
| idx_mail_processing_logs_status | status | BTREE | - | 상태별 조회 |
| idx_mail_processing_logs_received_at | received_at | BTREE | - | 수신일시 기준 정렬 조회 |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| - | - | - | - | 독립 엔티티 (파일명으로 분석 요청 파일과 논리적 연결) |

### DDL

```sql
CREATE TABLE IF NOT EXISTS mail_processing_logs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id       TEXT    NOT NULL UNIQUE,
    message_id_hash  TEXT    NOT NULL,
    subject          TEXT,
    received_at      TEXT    NOT NULL,
    file_name        TEXT    NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'SAVED'
                             CHECK (status IN ('SAVED', 'ANALYZED', 'ERROR')),
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mail_processing_logs_message_id
    ON mail_processing_logs(message_id);

CREATE INDEX IF NOT EXISTS idx_mail_processing_logs_status
    ON mail_processing_logs(status);

CREATE INDEX IF NOT EXISTS idx_mail_processing_logs_received_at
    ON mail_processing_logs(received_at);
```

### 비즈니스 규칙

- 메일 수신 시 `message_id`로 중복 여부를 확인한다. 이미 존재하면 해당 메일을 건너뛴다 (POL-MAIL MAIL-03).
- `message_id_hash`는 파일명 생성에 사용된다 (POL-DATA DATA-02: `{수신일시}_{MessageID해시}.txt`).
- 분석 완료 시 status를 `ANALYZED`로 변경하고, 원본 파일은 `Processed/` 디렉터리로 이동한다 (POL-DATA DATA-06).
- 처리 오류 시 status를 `ERROR`로 변경한다.
- 메일 본문, 발신자 이메일 등 개인정보가 포함될 수 있는 데이터는 이 테이블에 저장하지 않는다. 분석 요청 파일에만 존재한다.

### 마이그레이션 고려사항

- 앱 최초 실행 시 테이블을 자동 생성한다.
- seed 데이터 불필요.
- 대량 메일 처리 시 레코드가 누적되므로, 향후 오래된 레코드의 아카이빙/정리 정책을 고려할 수 있다.
