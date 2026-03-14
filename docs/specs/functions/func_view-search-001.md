# 용어 검색 기능 정의

## 개요

- **기능 목적**: 용어 사전에서 부분 일치 검색을 수행하고, 관련도순으로 정렬된 결과를 반환한다.
- **적용 범위**: 용어사전 뷰어 메인 화면의 검색창에서 호출된다.

---

## VIEW-SEARCH-001: 용어 검색

### 기본 정보

| 항목 | 내용 |
|------|------|
| 기능명 | 용어 검색 |
| 분류 | 도메인 특화 로직 |
| 레이어 | Domain |
| 트리거 | 사용자가 검색창에 입력 시 (300ms 디바운스 후) |
| 관련 정책 | POL-UI (UI-05) |

### 입력 / 출력

#### 입력 (Input)

| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| query | string | ✅ | 검색어 | 1자 이상 |

#### 출력 (Output)

| 항목 | 타입 | 설명 |
|------|------|------|
| results | SearchResult[] | 관련도순 정렬된 검색 결과 |
| totalCount | int | 총 결과 수 |

**SearchResult 구조**

| 필드 | 타입 | 설명 |
|------|------|------|
| entry | DictionaryEntry | 용어 사전 항목 |
| matchType | enum | ExactTerm / PartialTerm / DescriptionMatch |
| relevanceScore | float | 관련도 점수 |

#### 예외 / 오류

| 조건 | 오류 코드 | 설명 |
|------|-----------|------|
| 빈 검색어 | ERR_SEARCH_EMPTY_QUERY | 검색어가 비어 있음 |

### 처리 흐름

1. **검색어 정규화**: 대소문자를 통일한다 (대소문자 구분 없는 검색, UI-05).
2. **용어 원문 검색**: DATA-DICT-001에서 term 필드를 대상으로 검색한다.
   - **정확 일치**: query와 term이 완전 일치 -> matchType=ExactTerm, relevanceScore=1.0
   - **부분 일치**: term에 query가 포함 -> matchType=PartialTerm, relevanceScore=0.7
3. **해설 검색**: description 필드에 query가 포함 -> matchType=DescriptionMatch, relevanceScore=0.3
4. **중복 제거**: 동일 용어가 여러 matchType에 해당하면 가장 높은 점수만 유지한다.
5. **정렬**: relevanceScore 내림차순으로 정렬한다 (UI-05).
6. **결과 반환**: 검색 결과가 없으면 빈 목록과 totalCount=0을 반환한다.

### 구현 가이드

- **패턴**: 순수 함수로 검색/정렬 로직 구현. UI 레이어에서 300ms 디바운스 적용 (UI-05).
- **성능**: 10,000건 기준에서 100ms 이내 응답. 인메모리 캐시 또는 SQLite FTS(Full-Text Search) 활용 고려.
- **외부 의존성**: DATA-DICT-001 (사전 조회)

### 관련 기능

- **이 기능을 호출하는 기능**: UI 검색창 (뷰어 메인 화면)
- **이 기능이 호출하는 기능**: DATA-DICT-001

### 테스트 시나리오

| 시나리오 | 입력 조건 | 기대 결과 |
|----------|-----------|-----------|
| 정확 일치 | query="PACS", 사전에 PACS 존재 | ExactTerm, score=1.0 |
| 부분 일치 | query="PA", 사전에 PACS 존재 | PartialTerm, score=0.7 |
| 해설 검색 | query="영상", 해설에 "영상" 포함 | DescriptionMatch, score=0.3 |
| 대소문자 무시 | query="pacs" | PACS 검색됨 |
| 결과 없음 | query="ZZZXYZ" | results=[], totalCount=0 |
| 정렬 순서 | 정확1건+부분2건+해설1건 | 정확 > 부분 > 해설 순 |
| 중복 제거 | 용어가 정확+해설 양쪽 매칭 | ExactTerm(높은 점수)만 유지 |
