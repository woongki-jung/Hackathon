# 용어 검색 기능 정의

## 개요
- SQLite FTS5 전문 검색을 활용한 용어 검색, 분류 필터, 페이지네이션 기능을 정의한다.
- 적용 범위: 용어사전 뷰어 페이지의 검색 API

---

## VIEW-SEARCH-001 용어 검색

### 기본 정보
| 항목 | 내용 |
|------|------|
| 기능명 | 용어 검색 |
| 분류 | 도메인 특화 로직 |
| 레이어 | lib/views |
| 트리거 | 용어사전 뷰어에서 검색 입력 시 (300ms 디바운스 후, UI-R-012) |
| 관련 정책 | POL-UI (UI-R-012 ~ UI-R-014) |

### 입력 / 출력

#### searchTerms

##### 입력 (Input)
| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| query | string | ✅ | 검색 키워드 | 최소 1자 |
| category | string | ❌ | 분류 필터 | "emr" / "business" / "abbreviation" / "general" |
| page | number | ❌ | 페이지 번호 | 기본값 1, 최소 1 |
| pageSize | number | ❌ | 페이지 크기 | 기본값 20, 최대 50 (UI-R-014) |

##### 출력 (Output)
| 항목 | 타입 | 설명 |
|------|------|------|
| items | TermSearchResult[] | 검색 결과 목록 |
| total | number | 전체 결과 수 |
| page | number | 현재 페이지 |
| totalPages | number | 전체 페이지 수 |

```typescript
interface TermSearchResult {
  id: string;
  name: string;
  category: string;
  description: string;    // 검색 결과 미리보기 (200자 제한)
  frequency: number;
  updatedAt: string;
}
```

##### 예외 / 오류
| 조건 | 오류 코드 | 설명 |
|------|-----------|------|
| 빈 검색어 | ERR_EMPTY_QUERY | 최소 1자 필요 |

### 처리 흐름

1. **입력 검증**: query 길이 확인
2. **FTS5 검색**: terms_fts 테이블에서 MATCH 검색
3. **분류 필터**: category가 지정되면 추가 WHERE 조건
4. **정렬**: 검색 관련도(rank) 내림차순, 동일 관련도 시 frequency 내림차순
5. **페이지네이션**: LIMIT/OFFSET 적용 (UI-R-014)
6. **결과 반환**: 결과 없으면 빈 배열 (UI-R-013은 프론트엔드에서 처리)

### FTS5 검색 쿼리 예시

```sql
SELECT t.*, rank
FROM terms_fts
JOIN terms t ON terms_fts.rowid = t.rowid
WHERE terms_fts MATCH ?
ORDER BY rank
LIMIT ? OFFSET ?;
```

### 구현 가이드

- **패턴**: Service 함수 - lib/views/search-service.ts
- **FTS5**: SQLite FTS5 MATCH 연산자 활용, 한국어 검색 지원
- **성능**: FTS5 인덱스로 빠른 전문 검색, 페이지네이션으로 결과 제한
- **보안**: SQL Injection 방지 (Drizzle ORM 파라미터 바인딩)
- **외부 의존성**: Drizzle ORM (raw SQL for FTS5)

### 관련 기능
- **이 기능을 호출하는 기능**: API Route Handler (GET /api/terms/search)
- **이 기능이 호출하는 기능**: 없음

### 관련 데이터
- DATA-004 Term (terms 테이블 + terms_fts 가상 테이블)

### 테스트 시나리오

| 시나리오 | 입력 조건 | 기대 결과 |
|----------|-----------|-----------|
| 정상 검색 | query="EMR" | EMR 관련 용어 목록 |
| 분류 필터 | query="시스템", category="emr" | emr 분류 용어만 |
| 결과 없음 | query="zzzzxxx" | items=[], total=0 |
| 페이지네이션 | 30건 결과, page=2 | 21~30번째 결과 |
| 한국어 검색 | query="전자의무기록" | 관련 용어 목록 |
| 빈 검색어 | query="" | ERR_EMPTY_QUERY |
