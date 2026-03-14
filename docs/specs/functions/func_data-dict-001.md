# 용어 사전 저장소 관리 기능 정의

## 개요

- **기능 목적**: 용어 사전의 CRUD(생성/조회/수정) 및 중복 처리, 발견 횟수 갱신 등 데이터 관리를 수행한다.
- **적용 범위**: 용어 분석(TERM-BATCH-001), 뷰어 검색(VIEW-SEARCH-001), 트렌드 조회(VIEW-TREND-001) 등 사전 데이터를 다루는 모든 기능.

---

## DATA-DICT-001: 용어 사전 저장소 관리

### 기본 정보

| 항목 | 내용 |
|------|------|
| 기능명 | 용어 사전 저장소 관리 |
| 분류 | 도메인 특화 로직 |
| 레이어 | Infrastructure (저장소) + Domain (중복 처리 규칙) |
| 트리거 | 용어 등록/조회/수정 요청 시 |
| 관련 정책 | POL-DATA (DATA-04), POL-TERM (TERM-04) |

### 입력 / 출력

#### 용어 등록/갱신 (Upsert)

**입력**

| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| term | string | ✅ | 용어 원문 | 2자 이상 |
| category | enum | ✅ | 분류 (EMR / Business / Abbreviation) | |
| description | string | 신규 시 ✅ | 해설 텍스트 | |
| sourceFile | string | ✅ | 출처 파일명 | |

**출력**

| 항목 | 타입 | 설명 |
|------|------|------|
| isNew | boolean | 신규 등록 여부 |
| entry | DictionaryEntry | 등록/갱신된 항목 |

#### 용어 조회 (Get)

**입력**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| term | string | ✅ | 용어 원문 |

**출력**: DictionaryEntry 또는 null

#### DictionaryEntry 구조

| 필드 | 타입 | 설명 |
|------|------|------|
| term | string | 용어 원문 |
| category | enum | 분류 (EMR / Business / Abbreviation) |
| description | string | 해설 텍스트 |
| sourceCount | int | 발견 횟수 |
| firstSeenAt | DateTime | 최초 발견 일시 |
| lastSeenAt | DateTime | 최근 발견 일시 |
| sourceFiles | string[] | 출처 파일 목록 (최대 10건) |

#### 예외 / 오류

| 조건 | 오류 코드 | 설명 |
|------|-----------|------|
| 저장소 접근 실패 | ERR_DICT_STORE_FAILED | JSON/SQLite 파일 읽기/쓰기 실패 |
| 데이터 손상 | ERR_DICT_CORRUPTED | 데이터 파일 파싱 불가 |

### 처리 흐름

**Upsert 흐름**:

1. **기존 항목 조회**: 동일 term이 사전에 존재하는지 확인한다.
2. **신규 등록** (미존재 시):
   - 모든 필드를 설정하여 새 항목을 생성한다.
   - sourceCount=1, firstSeenAt=현재 시각, lastSeenAt=현재 시각.
3. **기존 항목 갱신** (존재 시, TERM-04):
   - `sourceCount`를 1 증가한다.
   - `lastSeenAt`을 현재 시각으로 갱신한다.
   - `sourceFiles`에 출처 파일을 추가한다 (최대 10건, 초과 시 가장 오래된 것 제거).
   - **해설 내용(description)은 변경하지 않는다** (TERM-04).
   - **카테고리(category)는 변경하지 않는다** (TERM-04).
4. **저장**: 변경 사항을 저장소에 기록한다.
5. **결과 반환**: isNew 여부와 항목을 반환한다.

### 구현 가이드

- **패턴**: Repository 패턴. `IDictionaryRepository` 인터페이스를 정의하여 JSON/SQLite 구현을 교체 가능하게 설계.
- **성능**: 10,000건 초과 시 성능 모니터링 권장 (POL-TERM 제약사항). SQLite 사용 시 인덱스 설계 고려.
- **동시성**: 읽기/쓰기 동시 접근 시 파일 잠금 또는 SQLite WAL 모드 활용.
- **외부 의존성**: JSON 직렬화 또는 SQLite 라이브러리

### 관련 기능

- **이 기능을 호출하는 기능**: TERM-BATCH-001, VIEW-SEARCH-001, VIEW-TREND-001, VIEW-STATE-001
- **이 기능이 호출하는 기능**: CMN-FS-001 (디렉터리 보장), CMN-LOG-001

### 테스트 시나리오

| 시나리오 | 입력 조건 | 기대 결과 |
|----------|-----------|-----------|
| 신규 등록 | 미등록 용어 "PACS" | isNew=true, sourceCount=1 |
| 중복 갱신 | 기존 용어 "PACS" 재발견 | isNew=false, sourceCount 증가 |
| 해설 미변경 | 기존 용어 재발견, 다른 description 전달 | 기존 해설 유지 |
| 카테고리 미변경 | 기존 EMR 용어, Business로 재분류 시도 | EMR 유지 |
| sourceFiles 최대 10건 | 11번째 sourceFile 추가 | 가장 오래된 1건 제거, 10건 유지 |
| 용어 조회 | 등록된 용어 | DictionaryEntry 반환 |
| 미등록 용어 조회 | 미등록 용어 | null 반환 |
| 데이터 손상 | JSON 파싱 불가 | ERR_DICT_CORRUPTED |
