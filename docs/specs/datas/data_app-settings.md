# AppSettings 데이터 정의

## 개요

애플리케이션 환경설정을 키-값 쌍으로 저장하는 엔티티이다. 메일 수신 설정, 저장 경로, 용어 분석 설정 등 사용자가 환경설정 화면(POL-UI UI-03)에서 관리하는 항목을 저장한다.

---

## DATA-001 AppSettings

### 엔티티 정보

| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | AppSettings |
| 테이블명 (물리) | app_settings |
| 설명 | 애플리케이션 환경설정 키-값 저장소 |
| 데이터베이스 | SQLite 3 |
| 파티셔닝 | 없음 |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | INTEGER | - | ✅ | AUTOINCREMENT | 기본 키 | |
| key | key | TEXT | 100 | ✅ | - | 설정 키 (고유) | |
| value | value | TEXT | - | ✅ | - | 설정 값 | |
| description | description | TEXT | 255 | - | NULL | 설정 항목 설명 | |
| createdAt | created_at | TEXT | - | ✅ | datetime('now') | 생성일시 | |
| updatedAt | updated_at | TEXT | - | ✅ | datetime('now') | 수정일시 | |

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| uq_app_settings_key | key | BTREE | ✅ | 설정 키 고유 제약 |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| - | - | - | - | 독립 엔티티 (다른 테이블과 관계 없음) |

### DDL

```sql
CREATE TABLE IF NOT EXISTS app_settings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    key         TEXT    NOT NULL UNIQUE,
    value       TEXT    NOT NULL,
    description TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 설정 키 유니크 인덱스 (UNIQUE 제약으로 자동 생성되나 명시)
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_settings_key ON app_settings(key);
```

### 비즈니스 규칙

- 설정 키는 고유하며, 동일 키가 존재하는 경우 UPDATE로 값을 갱신한다.
- 설정 변경 시 `updated_at`을 현재 시각으로 갱신한다.
- 앱 최초 실행 시 아래 기본 설정을 seed 데이터로 삽입한다.
- 설정 변경은 즉시 반영되어야 한다 (POL-UI UI-03: 앱 재시작 불필요).

### 기본 설정 항목 (Seed Data)

| key | 기본값 | 설명 | 관련 정책 |
|-----|--------|------|-----------|
| mail_user_email | (빈 문자열) | 모니터링 대상 이메일 주소 | POL-MAIL |
| mail_mailbox_name | Inbox | 모니터링 메일함 이름 | POL-MAIL MAIL-02 |
| mail_poll_interval_seconds | 60 | 메일함 확인 주기 (초) | POL-MAIL MAIL-01 |
| mail_fetch_unread_only | true | 읽지 않은 메일만 조회 | POL-MAIL MAIL-03 |
| mail_max_fetch_count | 50 | 1회 최대 조회 메일 수 | POL-MAIL MAIL-03 |
| output_analysis_dir | (앱 경로)/AnalysisRequests | 분석 요청 폴더 경로 | POL-DATA DATA-01 |
| term_daily_api_max_calls | 200 | 일일 최대 Claude API 호출 횟수 | POL-TERM |
| window_width | 800 | 윈도우 너비 | POL-UI UI-07 |
| window_height | 600 | 윈도우 높이 | POL-UI UI-07 |
| window_x | -1 | 윈도우 X 좌표 (-1: 화면 중앙) | POL-UI UI-07 |
| window_y | -1 | 윈도우 Y 좌표 (-1: 화면 중앙) | POL-UI UI-07 |

### 마이그레이션 고려사항

- 앱 최초 실행 시 테이블 생성 및 seed 데이터 삽입을 자동 수행한다.
- 향후 설정 항목 추가 시 마이그레이션 스크립트에서 INSERT OR IGNORE로 신규 키를 추가한다.
- 기존 사용자의 설정값은 마이그레이션 시 변경하지 않는다.
