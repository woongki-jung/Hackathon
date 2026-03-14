# StopWord 데이터 정의

## 개요

용어 추출 시 제외할 불용어(stop words) 목록을 관리하는 엔티티이다. 일반적인 영어 약어(IT, OK, PM, AM 등)를 필터링하여 의미 있는 용어만 추출한다 (POL-TERM TERM-02).

---

## DATA-005 StopWord

### 엔티티 정보

| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | StopWord |
| 테이블명 (물리) | stop_words |
| 설명 | 용어 추출 제외 불용어 목록 |
| 데이터베이스 | SQLite 3 |
| 파티셔닝 | 없음 |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | INTEGER | - | ✅ | AUTOINCREMENT | 기본 키 | |
| word | word | TEXT | 100 | ✅ | - | 불용어 (고유, 대소문자 무시) | |
| createdAt | created_at | TEXT | - | ✅ | datetime('now') | 생성일시 | |
| updatedAt | updated_at | TEXT | - | ✅ | datetime('now') | 수정일시 | |

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| uq_stop_words_word | word | BTREE | ✅ | 불용어 고유 제약 (COLLATE NOCASE) |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| - | - | - | - | 독립 엔티티 |

### DDL

```sql
CREATE TABLE IF NOT EXISTS stop_words (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    word       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_stop_words_word
    ON stop_words(word COLLATE NOCASE);
```

### 비즈니스 규칙

- 불용어 비교 시 대소문자를 무시한다 (COLLATE NOCASE).
- 용어 추출 과정에서 불용어 목록에 포함된 단어는 분석 대상에서 제외한다.
- 사용자가 환경설정 화면에서 불용어를 추가/삭제할 수 있다 (POL-UI UI-03, POL-TERM TERM-02).

### 기본 불용어 (Seed Data)

앱 최초 실행 시 다음 불용어를 seed 데이터로 삽입한다:

```
IT, OK, PM, AM, RE, FW, CC, BCC, FYI, ASAP, TBD, TBA, NA, VS, ETC,
HR, PR, QA, UI, UX, OS, PC, ID, NO, TO, DO, GO, IF, IS, ON, IN, AT,
OF, OR, AN, AS, BY, UP, SO, WE, HE, ME, MY, US
```

### 마이그레이션 고려사항

- 앱 최초 실행 시 테이블 생성 및 seed 데이터 삽입을 자동 수행한다.
- seed 데이터 삽입 시 `INSERT OR IGNORE`를 사용하여 기존 데이터와 충돌하지 않도록 한다.
- 사용자가 추가한 불용어는 마이그레이션 시 보존해야 한다.
