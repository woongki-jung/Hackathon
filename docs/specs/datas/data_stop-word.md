# StopWord 데이터 정의

## 개요
- 용어 추출 시 제외할 불용어(Stop Word) 목록을 관리한다.
- 일반적인 조사, 접속사, 관용 표현 등 분석에 불필요한 단어를 필터링하는 데 사용한다.
- 관련 도메인: 용어 (POL-TERM)

---

## DATA-006 StopWord

### 엔티티 정보
| 항목 | 내용 |
|------|------|
| 엔티티명 (논리) | StopWord |
| 테이블명 (물리) | stop_words |
| 설명 | 용어 추출 시 제외할 불용어 목록 |
| 데이터베이스 | SQLite (better-sqlite3 + Drizzle ORM) |
| 파티셔닝 | 없음 |

### 필드 정의

| 필드명 | 컬럼명 | 타입 | 길이 | NOT NULL | 기본값 | 설명 | 개인정보 |
|--------|--------|------|------|----------|--------|------|---------|
| id | id | TEXT | 36 | YES | - | 기본 키 (UUID) | |
| word | word | TEXT | 100 | YES | - | 불용어 (유니크, 소문자 정규화) | |
| createdAt | created_at | TEXT | - | YES | `datetime('now')` | 등록 일시 | |

### 인덱스 정의

| 인덱스명 | 대상 컬럼 | 타입 | 유니크 | 설명 |
|----------|-----------|------|--------|------|
| idx_stop_words_word | word | BTREE | YES | 불용어 조회 및 중복 방지 |

### 관계 정의

| 관계 | 대상 엔티티 | 종류 | 외래 키 | 설명 |
|------|------------|------|---------|------|
| - | - | - | - | 독립 엔티티, FK 관계 없음 |

### DDL

```sql
CREATE TABLE stop_words (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_stop_words_word ON stop_words(word);
```

### Drizzle ORM 스키마 예시

```typescript
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const stopWords = sqliteTable('stop_words', {
  id: text('id').primaryKey(),
  word: text('word').notNull().unique(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
```

### 비즈니스 규칙
- **불용어 필터링**: Claude API에 용어 추출 요청 시 불용어 목록을 함께 전달하여 제외하도록 한다.
- **소문자 정규화**: 불용어 등록/비교 시 소문자로 변환하여 일관성을 유지한다.
- **관리자 전용**: 불용어 등록/삭제는 관리자만 가능하다 (POL-AUTH AUTH-R-014 준용).

### 마이그레이션 고려사항
- **초기 데이터(seed)**: 기본 불용어 목록(한국어 조사, 영문 관사/전치사 등)을 시드 데이터로 삽입.
- 예시 시드: `the`, `a`, `is`, `of`, `and`, `in`, `to`, `for`, `은`, `는`, `이`, `가`, `을`, `를`, `에`, `의`, `로`, `로서`, `안녕하세요`, `감사합니다` 등.
