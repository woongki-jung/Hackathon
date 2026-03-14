# Dictionary API 정의

## 개요
- 용어사전 검색, 빈도 트렌드 조회, 용어 상세 조회 API를 정의한다.
- 프론트엔드 "용어사전 뷰어" 페이지에서 사용한다.
- 관련 도메인 객체: Term (DATA-004), TermSourceFile (DATA-005)
- 관련 기능: VIEW-SEARCH-001 (용어 검색), VIEW-TREND-001 (빈도 트렌드 조회), DATA-DICT-001 (용어 사전 저장소)
- 관련 정책: POL-UI (UI-R-009, UI-R-012 ~ UI-R-014, UI-R-017), POL-TERM

---

## DICT-001 용어 검색

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/dictionary/search |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 키워드로 용어를 검색한다 (FTS5 전문 검색) |

### 요청

#### Query Parameters
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| q | string | ✅ | - | 검색 키워드 (1자 이상) |
| category | string | ❌ | - | 분류 필터 (`emr` / `business` / `abbreviation` / `general`) |
| page | number | ❌ | 1 | 페이지 번호 (1부터 시작) |
| limit | number | ❌ | 20 | 페이지당 항목 수 (최대 100, UI-R-014) |

#### 요청 예시
```http
GET /api/dictionary/search?q=EMR&category=emr&page=1&limit=20 HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440020",
        "name": "EMR",
        "category": "emr",
        "description": "Electronic Medical Record. 전자의무기록으로, 환자의 진료 정보를 전자적으로 기록하고 관리하는 시스템이다.",
        "frequency": 15,
        "updatedAt": "2026-03-15T10:01:30Z"
      },
      {
        "id": "880e8400-e29b-41d4-a716-446655440021",
        "name": "EMR 연동 API",
        "category": "emr",
        "description": "EMR 시스템과 외부 시스템 간 데이터를 주고받기 위한 Application Programming Interface이다.",
        "frequency": 3,
        "updatedAt": "2026-03-14T15:02:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 2,
      "totalPages": 1
    }
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| items[].id | string | 용어 UUID |
| items[].name | string | 용어명 |
| items[].category | string / null | 분류 (`emr` / `business` / `abbreviation` / `general`) |
| items[].description | string | 용어 해설 (검색 결과 목록에서는 200자까지 잘라서 표시 가능) |
| items[].frequency | number | 발견 빈도 |
| items[].updatedAt | string | 마지막 갱신 일시 (ISO 8601) |
| pagination | object | 페이지네이션 정보 |

#### 성공 응답 (200 OK) - 검색 결과 없음
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 0,
      "totalPages": 0
    }
  }
}
```

> 검색 결과가 없으면 빈 배열을 반환한다. 프론트엔드에서 "검색 결과가 없습니다" 메시지를 표시한다 (UI-R-013).

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 400 | INVALID_REQUEST | 검색어(q) 누락 또는 빈 문자열 |
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 |

### 비즈니스 규칙
- SQLite FTS5를 활용하여 `name`과 `description` 필드에서 전문 검색한다.
- 프론트엔드에서 300ms 디바운스를 적용하여 호출한다 (UI-R-012).
- 한 페이지당 최대 20건 표시가 기본이며, 최대 100건까지 지원한다 (UI-R-014).
- `category` 필터를 지정하면 해당 분류의 용어만 반환한다.
- 정렬 기준: FTS5 관련도(rank) 우선, 동일 관련도이면 빈도 내림차순.

### 관련 기능
- VIEW-SEARCH-001 (용어 검색)
- DATA-DICT-001 (용어 사전 저장소 - FTS5 조회)

---

## DICT-002 빈도 트렌드 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/dictionary/trending |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 발견 빈도가 높은 용어 상위 목록을 조회한다 |

### 요청

#### Query Parameters
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| limit | number | ❌ | 10 | 조회할 상위 용어 수 (최대 30) |

#### 요청 예시
```http
GET /api/dictionary/trending?limit=10 HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440020",
        "name": "EMR",
        "category": "emr",
        "frequency": 15,
        "updatedAt": "2026-03-15T10:01:30Z"
      },
      {
        "id": "880e8400-e29b-41d4-a716-446655440022",
        "name": "OCS",
        "category": "emr",
        "frequency": 12,
        "updatedAt": "2026-03-14T09:00:00Z"
      },
      {
        "id": "880e8400-e29b-41d4-a716-446655440023",
        "name": "SLA",
        "category": "business",
        "frequency": 8,
        "updatedAt": "2026-03-13T16:30:00Z"
      }
    ]
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| items[].id | string | 용어 UUID |
| items[].name | string | 용어명 |
| items[].category | string / null | 분류 |
| items[].frequency | number | 발견 빈도 |
| items[].updatedAt | string | 마지막 갱신 일시 (ISO 8601) |

> 페이지네이션 없이 `limit` 개수만큼 반환한다.

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 |

### 비즈니스 규칙
- `terms` 테이블에서 `frequency` 내림차순으로 상위 N개를 조회한다 (UI-R-017).
- 기본 10개, 최대 30개까지 요청 가능하다.
- 용어사전 뷰어의 "빈도 높은 용어" 바로가기 영역에 사용된다 (UI-R-009).

### 관련 기능
- VIEW-TREND-001 (빈도 트렌드 조회)

---

## DICT-003 용어 상세 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/dictionary/terms/:id |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 특정 용어의 상세 정보 및 출처 메일 목록을 조회한다 |

### 요청

#### Path Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| id | string | ✅ | 용어 UUID |

#### 요청 예시
```http
GET /api/dictionary/terms/880e8400-e29b-41d4-a716-446655440020 HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440020",
    "name": "EMR",
    "category": "emr",
    "description": "Electronic Medical Record. 전자의무기록으로, 환자의 진료 정보를 전자적으로 기록하고 관리하는 시스템이다. 진료기록, 처방 정보, 검사 결과 등을 통합 관리하며, 의료진 간 정보 공유와 진료 효율성 향상을 목적으로 한다.",
    "frequency": 15,
    "createdAt": "2026-03-01T10:00:00Z",
    "updatedAt": "2026-03-15T10:01:30Z",
    "sources": [
      {
        "mailSubject": "[긴급] EMR 시스템 업데이트 안내",
        "mailReceivedAt": "2026-03-15T08:30:00Z"
      },
      {
        "mailSubject": "EMR 연동 인터페이스 변경 공지",
        "mailReceivedAt": "2026-03-10T09:15:00Z"
      }
    ]
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 용어 UUID |
| name | string | 용어명 |
| category | string / null | 분류 (`emr` / `business` / `abbreviation` / `general`) |
| description | string | 용어 해설 (전문) |
| frequency | number | 발견 빈도 |
| createdAt | string | 최초 추출 일시 (ISO 8601) |
| updatedAt | string | 마지막 갱신 일시 (ISO 8601) |
| sources | array | 이 용어가 추출된 출처 메일 목록 (최신순, 최대 10건) |
| sources[].mailSubject | string / null | 출처 메일 제목 |
| sources[].mailReceivedAt | string / null | 출처 메일 수신 일시 |

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 |
| 404 | NOT_FOUND | 해당 용어가 존재하지 않음 |

### 비즈니스 규칙
- `terms` 테이블과 `term_source_files` 테이블을 조인하여 조회한다.
- 출처 메일 목록(`sources`)은 `mail_received_at` 기준 최신순으로 정렬하며 최대 10건만 반환한다.
- 용어 데이터는 영구 보존되므로 삭제된 용어는 없다 (POL-DATA DATA-R-017).
- `description` 필드는 전문을 반환한다 (DICT-001 검색 결과와 달리 잘라내지 않음).

### 관련 기능
- DATA-DICT-001 (용어 사전 저장소)
- VIEW-SEARCH-001 (검색 결과에서 상세 조회 이동)
