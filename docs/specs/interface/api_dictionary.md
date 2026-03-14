# 용어 사전 서비스 인터페이스 정의

## 개요

- 본 문서는 앱 내부의 용어 사전 서비스 계층 인터페이스를 정의한다.
- 용어 사전 서비스는 용어의 검색, 조회, 등록/갱신, 통계, 백업 기능을 제공한다.
- 용어 사전은 로컬 파일 기반으로 저장한다 (JSON 또는 SQLite).
- 관련 정책: POL-TERM (TERM-04), POL-DATA (DATA-04, DATA-05), POL-UI (UI-04~06)

---

## DICT-001: 용어 검색

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 키워드로 용어 사전을 검색하여 일치하는 용어 목록을 반환한다 |

### 입력

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| keyword | string | ✅ | - | 검색 키워드 (2글자 이상) |
| category | string | - | null | 카테고리 필터 (`EMR`, `Business`, `Abbreviation`). null이면 전체 |
| page | integer | - | 1 | 페이지 번호 (1부터 시작) |
| pageSize | integer | - | 20 | 페이지당 항목 수 (최대 100) |

### 출력

```json
{
  "items": [
    {
      "id": "term_001",
      "term": "OCS",
      "category": "EMR",
      "summary": "처방전달시스템(Order Communication System)",
      "sourceCount": 12,
      "lastSeenAt": "2026-03-13T14:30:22Z",
      "matchType": "exact"
    },
    {
      "id": "term_042",
      "term": "OCS 연동",
      "category": "EMR",
      "summary": "OCS와 타 시스템 간 데이터 연동 프로세스",
      "sourceCount": 3,
      "lastSeenAt": "2026-03-12T09:15:00Z",
      "matchType": "partial"
    }
  ],
  "totalCount": 2,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| items | array | 검색 결과 목록 |
| items[].id | string | 용어 고유 ID |
| items[].term | string | 용어 원문 |
| items[].category | string | 분류 (`EMR`, `Business`, `Abbreviation`) |
| items[].summary | string | 1줄 요약 |
| items[].sourceCount | integer | 발견 횟수 |
| items[].lastSeenAt | string (ISO 8601) | 최근 발견 일시 |
| items[].matchType | string | 매칭 유형 (`exact`, `partial`, `description`) |
| totalCount | integer | 전체 검색 결과 수 |
| page | integer | 현재 페이지 번호 |
| pageSize | integer | 페이지당 항목 수 |
| totalPages | integer | 전체 페이지 수 |

### 검색 정렬 규칙 (UI-05)

검색 결과는 관련도순으로 정렬한다:

1. 용어 원문(`term`) 정확 일치 (`matchType: "exact"`)
2. 용어 원문 부분 일치 (`matchType: "partial"`)
3. 해설(`description`) 내 포함 (`matchType: "description"`)

### 비즈니스 규칙

- 검색 대상: 용어 원문(`term`) 및 해설(`description`) (UI-05).
- 부분 일치 방식: 입력 문자열이 포함된 모든 항목을 반환한다 (UI-05).
- 한글/영문 대소문자 구분 없이 검색한다 (UI-05).
- 검색어 입력 시 300ms 디바운스를 적용하여 실시간 검색 결과를 표시한다 (UI-05, UI 측 구현).
- 검색 결과가 없는 경우 빈 배열을 반환한다.

---

## DICT-002: 용어 상세 조회

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 용어 ID로 상세 정보를 조회한다 |

### 입력

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| id | string | ✅ | 용어 고유 ID |

### 출력

```json
{
  "id": "term_001",
  "term": "OCS",
  "category": "EMR",
  "summary": "처방전달시스템(Order Communication System)",
  "description": "OCS는 의사가 입력한 처방(약, 검사, 수술 등)을 약국, 검사실, 간호 부서 등으로 전자적으로 전달하는 병원 정보 시스템입니다. EMR의 핵심 구성 요소로, 처방 입력부터 실행까지의 프로세스를 자동화합니다.",
  "relatedTerms": ["EMR", "CPOE", "처방전달"],
  "sourceCount": 12,
  "firstSeenAt": "2026-03-01T10:00:00Z",
  "lastSeenAt": "2026-03-13T14:30:22Z",
  "sourceFiles": [
    "20260313_143022_a1b2c3d4.txt",
    "20260312_091500_b2c3d4e5.txt"
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 용어 고유 ID |
| term | string | 용어 원문 |
| category | string | 분류 (`EMR`, `Business`, `Abbreviation`) |
| summary | string | 1줄 요약 (50자 이내) |
| description | string | 상세 설명 (200자 이내) |
| relatedTerms | array of string | 관련 용어 목록 |
| sourceCount | integer | 발견 횟수 |
| firstSeenAt | string (ISO 8601) | 최초 발견 일시 |
| lastSeenAt | string (ISO 8601) | 최근 발견 일시 |
| sourceFiles | array of string | 출처 파일 목록 (최대 10건) |

### 에러

| 에러 코드 | 설명 |
|-----------|------|
| NOT_FOUND | 해당 ID의 용어가 존재하지 않음 |

### 비즈니스 규칙

- 상세 정보 표시 항목은 UI-06의 정의를 따른다.
- `relatedTerms`에 포함된 용어를 클릭하면 해당 용어의 상세 정보로 이동할 수 있어야 한다 (UI-06).
- 카테고리별 색상 구분은 UI 측에서 처리한다 (UI-06).

---

## DICT-003: 용어 등록/갱신

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 신규 용어를 등록하거나 기존 용어의 메타데이터를 갱신한다 |

### 입력: 신규 등록

```json
{
  "term": "OCS",
  "category": "EMR",
  "summary": "처방전달시스템(Order Communication System)",
  "description": "OCS는 의사가 입력한 처방을 약국, 검사실, 간호 부서 등으로 전자적으로 전달하는 병원 정보 시스템입니다.",
  "relatedTerms": ["EMR", "CPOE"],
  "sourceFile": "20260313_143022_a1b2c3d4.txt"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| term | string | ✅ | 용어 원문 |
| category | string | ✅ | 분류 (`EMR`, `Business`, `Abbreviation`) |
| summary | string | - | 1줄 요약 (해설 미완료 시 빈 문자열) |
| description | string | - | 상세 설명 (해설 미완료 시 빈 문자열) |
| relatedTerms | array of string | - | 관련 용어 목록 |
| sourceFile | string | ✅ | 출처 파일명 |

### 출력

```json
{
  "action": "created",
  "id": "term_001",
  "term": "OCS"
}
```

또는 기존 용어 갱신 시:

```json
{
  "action": "updated",
  "id": "term_001",
  "term": "OCS",
  "sourceCount": 13
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| action | string | 수행된 작업 (`created` 또는 `updated`) |
| id | string | 용어 고유 ID |
| term | string | 용어 원문 |
| sourceCount | integer | 갱신 후 발견 횟수 (updated 시에만) |

### 비즈니스 규칙 (TERM-04)

- 이미 사전에 존재하는 용어가 재발견된 경우:
  - `sourceCount`를 1 증가시킨다.
  - `lastSeenAt`을 현재 시각으로 갱신한다.
  - `sourceFiles`에 출처 파일을 추가한다 (최대 10건 유지, 초과 시 가장 오래된 것 제거).
  - 해설 내용(`summary`, `description`, `relatedTerms`)은 변경하지 않는다.
- 동일 용어가 다른 카테고리로 분류될 가능성이 있는 경우, 기존 카테고리를 유지한다 (TERM-04).
- 신규 등록 시 `sourceCount`는 1, `firstSeenAt`과 `lastSeenAt`은 현재 시각으로 설정한다.

---

## DICT-004: 인기 용어 조회

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 최근 빈도가 높은 용어 목록을 조회한다 (메인 화면 바로가기용) |

### 입력

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| days | integer | - | 7 | 조회 기간 (최근 N일) |
| limit | integer | - | 10 | 반환할 최대 항목 수 |

### 출력

```json
{
  "items": [
    {
      "id": "term_001",
      "term": "OCS",
      "category": "EMR",
      "summary": "처방전달시스템(Order Communication System)",
      "recentCount": 8
    },
    {
      "id": "term_015",
      "term": "DRG",
      "category": "Business",
      "summary": "진단관련그룹(Diagnosis Related Group)",
      "recentCount": 5
    }
  ],
  "period": {
    "from": "2026-03-06T00:00:00Z",
    "to": "2026-03-13T23:59:59Z"
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| items | array | 인기 용어 목록 |
| items[].id | string | 용어 고유 ID |
| items[].term | string | 용어 원문 |
| items[].category | string | 분류 |
| items[].summary | string | 1줄 요약 |
| items[].recentCount | integer | 조회 기간 내 발견 횟수 증가량 |
| period.from | string (ISO 8601) | 조회 기간 시작 |
| period.to | string (ISO 8601) | 조회 기간 종료 |

### 비즈니스 규칙

- 최근 7일간 `sourceCount` 증가량 기준 상위 10개 용어를 반환한다 (UI-04).
- 바로가기(태그/칩) 형태로 메인 화면에 표시된다 (UI-04).
- 해설 미완료 상태의 용어도 목록에 포함될 수 있다.

---

## DICT-005: 사전 통계 조회

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 용어 사전의 전체 통계 및 앱 상태 정보를 반환한다 |

### 입력

없음

### 출력

```json
{
  "totalTerms": 1250,
  "categoryCounts": {
    "EMR": 520,
    "Business": 480,
    "Abbreviation": 250
  },
  "pendingTerms": 5,
  "lastMailCheckAt": "2026-03-13T14:30:00Z",
  "lastAnalysisAt": "2026-03-13T14:31:00Z",
  "todayApiCallsUsed": 45,
  "dailyApiCallLimit": 200
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| totalTerms | integer | 총 등록 용어 수 |
| categoryCounts | object | 카테고리별 용어 수 |
| pendingTerms | integer | 해설 미완료 용어 수 |
| lastMailCheckAt | string (ISO 8601, nullable) | 마지막 메일 확인 시각 |
| lastAnalysisAt | string (ISO 8601, nullable) | 마지막 분석 완료 시각 |
| todayApiCallsUsed | integer | 오늘 사용된 API 호출 수 |
| dailyApiCallLimit | integer | 일일 API 호출 한도 |

### 비즈니스 규칙

- 메인 화면 하단 상태바에 "총 {n}개 용어 등록됨 | 마지막 메일 확인: {시각}" 형태로 표시한다 (UI-04).
- 10,000건 초과 시 성능 모니터링을 권장한다 (POL-TERM 제약사항).

---

## DICT-006: 사전 백업

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 트리거 | 앱 종료 시 자동 호출 |
| 설명 | 용어 사전 데이터의 백업 파일을 생성한다 |

### 입력

없음

### 출력

```json
{
  "success": true,
  "backupPath": "Dictionary/backup/dictionary_20260313_150000.bak",
  "backupSize": 524288,
  "oldBackupsRemoved": 1
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| success | boolean | 백업 성공 여부 |
| backupPath | string | 생성된 백업 파일 경로 |
| backupSize | integer | 백업 파일 크기 (바이트) |
| oldBackupsRemoved | integer | 삭제된 오래된 백업 파일 수 |

### 에러

| 에러 코드 | 설명 |
|-----------|------|
| WRITE_FAILED | 백업 파일 쓰기 실패 |
| DISK_FULL | 디스크 용량 부족 |

### 비즈니스 규칙 (DATA-05)

- 앱 종료 시 자동으로 백업 파일을 생성한다.
- 백업 파일 경로: `Dictionary/backup/dictionary_{yyyyMMdd_HHmmss}.bak`
- 백업 파일은 최근 7개만 유지하며, 초과 시 가장 오래된 파일을 삭제한다.
- 백업 실패 시 에러 로그를 기록하되, 앱 종료를 차단하지 않는다.
