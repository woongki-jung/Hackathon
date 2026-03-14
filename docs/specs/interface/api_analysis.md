# 용어 분석 서비스 인터페이스 정의

## 개요

- 본 문서는 앱 내부의 용어 분석 서비스 계층 인터페이스를 정의한다.
- 용어 분석 서비스는 분석 요청 폴더의 파일을 읽어 업무 용어를 추출하고, Claude API를 통해 해설을 생성하여 용어 사전에 등록한다.
- 관련 정책: POL-TERM, POL-DATA (DATA-04, DATA-06)
- 관련 외부 API: api_claude.md (CLAUDE-001)
- 관련 내부 API: api_dictionary.md (DICT-003)

---

## ANAL-001: 배치 분석 실행

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 (주기적 또는 이벤트 트리거) |
| 설명 | 분석 요청 폴더에 있는 미처리 파일을 일괄적으로 분석한다 |
| 트리거 | 메일 수신 완료 이벤트 또는 수동 실행 |

### 입력

없음 (분석 요청 폴더 경로는 환경설정에서 자동으로 가져옴)

### 처리 흐름

1. 분석 요청 폴더(`storage.analysisDir`)에서 미처리 `.txt` 파일 목록을 조회한다
2. 파일 생성 시간 기준 오름차순으로 정렬한다 (TERM-05)
3. 최대 10개 파일을 선택한다 (TERM-05)
4. 각 파일에 대해:
   a. 파일 내용을 파싱한다 (YAML frontmatter + 본문)
   b. 용어 추출을 수행한다 (ANAL-002)
   c. 신규 용어에 대해 해설 생성을 요청한다 (ANAL-003)
   d. 추출된 용어를 사전에 등록/갱신한다 (DICT-003)
   e. 처리 완료된 파일을 `Processed/` 디렉터리로 이동한다 (DATA-06)
5. 분석 결과를 반환한다

### 출력

```json
{
  "success": true,
  "filesProcessed": 3,
  "termsExtracted": 15,
  "newTerms": 8,
  "updatedTerms": 7,
  "apiCallsUsed": 8,
  "errors": []
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| success | boolean | 전체 처리 성공 여부 |
| filesProcessed | integer | 처리된 파일 수 |
| termsExtracted | integer | 추출된 총 용어 수 |
| newTerms | integer | 신규 등록된 용어 수 |
| updatedTerms | integer | 기존 용어 갱신 수 (source_count 증가) |
| apiCallsUsed | integer | 이번 배치에서 사용된 Claude API 호출 수 |
| errors | array | 오류 상세 목록 |

### 에러

| 에러 코드 | 설명 | 후속 조치 |
|-----------|------|-----------|
| NO_FILES | 분석할 파일이 없음 | 정상 종료 |
| PARSE_ERROR | 파일 파싱 실패 | Error/ 디렉터리로 이동 (TERM-06) |
| API_LIMIT_REACHED | 일일 API 호출 한도 초과 | 다음 날까지 해설 생성 보류 |
| PARTIAL_FAILURE | 일부 용어 처리 실패 | 성공한 용어는 저장, 실패한 용어는 재시도 큐에 추가 (TERM-06) |

### 비즈니스 규칙

- 1회 배치 처리 시 최대 10개 파일을 처리한다 (TERM-05).
- 1회 배치당 최대 20건의 Claude API 호출로 제한한다 (TERM-05).
- 일일 최대 API 호출 횟수(기본 200)를 초과하면 해설 생성을 다음 날로 보류한다 (POL-TERM).
- 분석 완료된 파일은 `Processed/` 디렉터리로 이동한다 (DATA-06).
- 파일 이동 실패 시 파일을 유지하되, 처리 완료 상태를 별도 메타 파일에 기록한다 (DATA-06).
- 파일 파싱 실패 시 해당 파일을 `Error/` 디렉터리로 이동한다 (TERM-06).

---

## ANAL-002: 용어 추출

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 텍스트에서 업무 용어(EMR, 비즈니스, 약어)를 추출한다 |

### 입력

```json
{
  "subject": "OCS 시스템 업데이트 안내",
  "bodyText": "OCS 시스템이 업데이트되어 처방 입력 화면이 변경됩니다. PACS 연동 모듈과 HL7 인터페이스도 함께 수정됩니다. DRG 수가 산정 모듈은 다음 릴리스에서 반영 예정입니다.",
  "sourceFile": "20260313_143022_a1b2c3d4.txt"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| subject | string | ✅ | 메일 제목 |
| bodyText | string | ✅ | 메일 본문 텍스트 |
| sourceFile | string | ✅ | 출처 파일명 |

### 출력

```json
{
  "terms": [
    {
      "term": "OCS",
      "category": "EMR",
      "context": "OCS 시스템이 업데이트되어 처방 입력 화면이 변경됩니다",
      "occurrences": 1
    },
    {
      "term": "PACS",
      "category": "EMR",
      "context": "PACS 연동 모듈과 HL7 인터페이스도 함께 수정됩니다",
      "occurrences": 1
    },
    {
      "term": "HL7",
      "category": "EMR",
      "context": "PACS 연동 모듈과 HL7 인터페이스도 함께 수정됩니다",
      "occurrences": 1
    },
    {
      "term": "DRG",
      "category": "Business",
      "context": "DRG 수가 산정 모듈은 다음 릴리스에서 반영 예정입니다",
      "occurrences": 1
    }
  ],
  "totalCount": 4
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| terms | array | 추출된 용어 목록 |
| terms[].term | string | 용어 원문 |
| terms[].category | string | 분류 (`EMR`, `Business`, `Abbreviation`) |
| terms[].context | string | 발견 컨텍스트 (용어 전후 200자) |
| terms[].occurrences | integer | 해당 문서 내 출현 횟수 |
| totalCount | integer | 추출된 총 용어 수 |

### 추출 규칙 (TERM-01, TERM-02)

| 패턴 | 설명 | 예시 |
|------|------|------|
| `[A-Z]{2,}` | 대문자 약어 (2글자 이상 연속 대문자) | OCS, PACS, EMR |
| 영문+숫자 조합 | 코드성 용어 | ICD-10, HL7v2 |
| 한글 전문 용어 | 사용자 등록 패턴 목록과 매칭 | 수가, 원외처방 |

### 제외 규칙

- 불용어 목록에 포함된 약어는 제외 (IT, OK, PM, AM 등)
- 2글자 미만의 단독 문자열은 제외
- 일반적인 영어 단어, 관사, 전치사는 제외

### 비즈니스 규칙

- 파일당 최대 50개 용어를 추출한다. 초과 시 출현 빈도순 상위 50개를 선택한다 (TERM-05).
- 불용어 목록은 사용자가 편집 가능한 설정 파일로 관리한다 (TERM-02).
- 컨텍스트는 해당 용어 전후 200자를 포함한다 (TERM-03).

---

## ANAL-003: 해설 생성 요청

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 추출된 용어 목록에 대해 Claude API를 호출하여 해설을 생성한다 |

### 입력

```json
{
  "terms": [
    {
      "term": "OCS",
      "category": "EMR",
      "context": "OCS 시스템이 업데이트되어 처방 입력 화면이 변경됩니다"
    },
    {
      "term": "DRG",
      "category": "Business",
      "context": "DRG 수가 산정 기준이 변경되어 원무과 확인 바랍니다"
    }
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| terms | array | ✅ | 해설을 생성할 용어 목록 |
| terms[].term | string | ✅ | 용어 원문 |
| terms[].category | string | ✅ | 분류 |
| terms[].context | string | ✅ | 발견 컨텍스트 |

### 처리 흐름

1. 입력된 용어 중 이미 사전에 등록된 용어를 필터링한다 (TERM-03)
2. 일일 API 호출 잔여 횟수를 확인한다
3. 신규 용어를 Claude API 호출용 프롬프트로 구성한다 (CLAUDE-001 참조)
4. Claude API를 호출하여 해설을 수신한다
5. 응답을 파싱하여 구조화된 해설 데이터를 반환한다

### 출력

```json
{
  "results": [
    {
      "term": "OCS",
      "summary": "처방전달시스템(Order Communication System)",
      "description": "OCS는 의사가 입력한 처방을 약국, 검사실, 간호 부서 등으로 전자적으로 전달하는 병원 정보 시스템입니다.",
      "relatedTerms": ["EMR", "CPOE", "처방전달"],
      "status": "completed"
    },
    {
      "term": "DRG",
      "summary": "",
      "description": "",
      "relatedTerms": [],
      "status": "failed",
      "error": "API 호출 실패"
    }
  ],
  "apiCallsUsed": 1,
  "remainingDailyQuota": 195
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| results | array | 해설 생성 결과 목록 |
| results[].term | string | 용어 원문 |
| results[].summary | string | 1줄 요약 (50자 이내) |
| results[].description | string | 상세 설명 (200자 이내) |
| results[].relatedTerms | array of string | 관련 용어 목록 |
| results[].status | string | 처리 상태 (`completed`, `failed`, `skipped`) |
| results[].error | string (nullable) | 실패 시 오류 메시지 |
| apiCallsUsed | integer | 사용된 API 호출 수 |
| remainingDailyQuota | integer | 잔여 일일 API 호출 횟수 |

### 에러

| 에러 코드 | 설명 | 후속 조치 |
|-----------|------|-----------|
| API_AUTH_FAILED | Claude API 인증 실패 | API 키 확인 필요 |
| API_RATE_LIMITED | Claude API Rate Limit 초과 | 지수 백오프 재시도 |
| DAILY_LIMIT_REACHED | 일일 API 호출 한도 초과 | 다음 날까지 보류 |
| PARSE_FAILED | API 응답 파싱 실패 | 텍스트를 description으로 저장 |

### 비즈니스 규칙

- 이미 사전에 등록된 용어는 해설을 재생성하지 않고 `skipped` 상태로 반환한다 (TERM-03).
- 1회 배치당 최대 20건의 API 호출로 제한한다 (TERM-05).
- API 호출 실패 시 지수 백오프로 재시도한다: 최대 3회, 1초/2초/4초 간격 (AUTH-04).
- 해설 생성 실패 시 해당 용어를 "해설 미완료"(summary, description 비어 있음) 상태로 사전에 등록한다 (TERM-06).
- 응답 텍스트가 유효한 JSON이 아닌 경우, 텍스트 전체를 description에 저장한다.
- 해설 생성 시 환자 개인정보가 포함되지 않도록 프롬프트에서 필터링한다 (POL-TERM 제약사항).
