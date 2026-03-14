# Anthropic Claude API 인터페이스 정의

## 개요

- 본 문서는 앱에서 Anthropic Claude API를 호출하여 용어 해설을 생성하는 인터페이스를 정의한다.
- 기본 URL: `https://api.anthropic.com`
- 인증: API Key (`x-api-key` 헤더)
- 관련 정책: POL-AUTH (AUTH-04), POL-TERM (TERM-03, TERM-05)

---

## CLAUDE-001: 용어 해설 생성

### 기본 정보

| 항목 | 내용 |
|------|------|
| 메서드 | POST |
| 경로 | `https://api.anthropic.com/v1/messages` |
| 인증 | 필요 (`x-api-key` 헤더) |
| 설명 | 추출된 업무 용어에 대한 해설을 Claude 모델에 요청하여 생성한다 |

### 요청

#### Request Headers

| 헤더 | 값 | 필수 | 설명 |
|------|-----|------|------|
| x-api-key | string | ✅ | Anthropic API 키 (`ANTHROPIC_API_KEY` 환경변수) |
| anthropic-version | string | ✅ | API 버전 (예: `2023-06-01`) |
| content-type | string | ✅ | `application/json` |

#### Request Body (application/json)

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "다음은 의료/EMR 관련 업무 메일에서 추출된 용어입니다. 각 용어에 대해 해설을 작성해주세요.\n\n## 해설 형식\n각 용어마다 다음 형식으로 작성해주세요:\n- 1줄 요약 (50자 이내)\n- 상세 설명 (200자 이내)\n- 관련 용어 목록 (있는 경우)\n\n## 용어 목록\n\n### 용어: OCS\n- 카테고리: EMR\n- 발견 컨텍스트: \"...OCS 시스템이 업데이트되어 처방 입력 화면이 변경됩니다...\"\n\n### 용어: DRG\n- 카테고리: Business\n- 발견 컨텍스트: \"...DRG 수가 산정 기준이 변경되어 원무과 확인 바랍니다...\""
    }
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| model | string | ✅ | 사용할 Claude 모델 ID |
| max_tokens | integer | ✅ | 응답 최대 토큰 수 |
| messages | array | ✅ | 대화 메시지 배열 |
| messages[].role | string | ✅ | 메시지 역할 (`user`) |
| messages[].content | string | ✅ | 프롬프트 내용 |

#### 프롬프트 구성 규칙

프롬프트에는 다음 컨텍스트를 포함한다 (TERM-03):

1. **시스템 지시**: 의료/EMR 도메인 용어 해설 전문가 역할 지정
2. **해설 형식 지정**: 1줄 요약(50자 이내), 상세 설명(200자 이내), 관련 용어
3. **용어 목록**: 각 용어별로 다음 정보를 포함
   - 용어 원문
   - 카테고리 (EMR / Business / Abbreviation)
   - 발견 컨텍스트 (해당 용어 전후 200자)
4. **응답 형식 지정**: JSON 형식으로 구조화된 응답 요청

#### 요청 예시

```http
POST https://api.anthropic.com/v1/messages HTTP/1.1
x-api-key: {apiKey}
anthropic-version: 2023-06-01
Content-Type: application/json

{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "system": "당신은 의료 정보 시스템(EMR, OCS, PACS 등) 및 병원 업무 도메인 용어 전문가입니다. 제공된 용어에 대해 정확하고 이해하기 쉬운 해설을 작성해주세요. 응답은 반드시 JSON 형식으로 작성해주세요.",
  "messages": [
    {
      "role": "user",
      "content": "다음 용어들에 대해 해설을 작성해주세요. 각 용어에 대해 JSON 배열로 응답해주세요.\n\n[{\"term\": \"OCS\", \"category\": \"EMR\", \"context\": \"OCS 시스템이 업데이트되어 처방 입력 화면이 변경됩니다\"}]\n\n응답 형식:\n[{\"term\": \"용어\", \"summary\": \"1줄 요약(50자 이내)\", \"description\": \"상세 설명(200자 이내)\", \"related_terms\": [\"관련용어1\", \"관련용어2\"]}]"
    }
  ]
}
```

### 응답

#### 성공 응답 (200 OK)

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "[{\"term\": \"OCS\", \"summary\": \"처방전달시스템(Order Communication System)\", \"description\": \"OCS는 의사가 입력한 처방(약, 검사, 수술 등)을 약국, 검사실, 간호 부서 등으로 전자적으로 전달하는 병원 정보 시스템입니다. EMR의 핵심 구성 요소로, 처방 입력부터 실행까지의 프로세스를 자동화합니다.\", \"related_terms\": [\"EMR\", \"CPOE\", \"처방전달\"]}]"
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 350,
    "output_tokens": 200
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 메시지 고유 ID |
| content | array | 응답 내용 배열 |
| content[].type | string | 콘텐츠 타입 (`text`) |
| content[].text | string | 응답 텍스트 (JSON 문자열로 파싱 필요) |
| stop_reason | string | 응답 종료 사유 (`end_turn`, `max_tokens`) |
| usage.input_tokens | integer | 입력 토큰 수 |
| usage.output_tokens | integer | 출력 토큰 수 |

#### 파싱된 해설 데이터 구조

`content[0].text`를 JSON으로 파싱하면 다음 구조를 기대한다:

```json
[
  {
    "term": "OCS",
    "summary": "처방전달시스템(Order Communication System)",
    "description": "OCS는 의사가 입력한 처방을 약국, 검사실, 간호 부서 등으로 전자적으로 전달하는 병원 정보 시스템입니다.",
    "related_terms": ["EMR", "CPOE", "처방전달"]
  }
]
```

| 필드 | 타입 | 설명 |
|------|------|------|
| term | string | 용어 원문 |
| summary | string | 1줄 요약 (50자 이내) |
| description | string | 상세 설명 (200자 이내) |
| related_terms | array of string | 관련 용어 목록 (비어 있을 수 있음) |

#### 에러 응답

| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 400 | invalid_request_error | 잘못된 요청 형식 |
| 401 | authentication_error | API 키 무효 또는 누락 |
| 429 | rate_limit_error | Rate Limit 초과 |
| 500 | api_error | 서버 내부 오류 |
| 529 | overloaded_error | API 과부하 |

### 비즈니스 규칙

- 이미 사전에 등록된 용어는 해설을 재생성하지 않는다 (TERM-03).
- 1회 배치당 최대 20건의 API 호출로 제한한다 (TERM-05).
- 일일 최대 호출 횟수를 200건으로 제한한다 (POL-TERM 제약사항, 설정 가능).
- API 호출 실패 시 지수 백오프로 재시도한다: 최대 3회, 1초/2초/4초 간격 (AUTH-04).
- 해설 생성 실패 시 해당 용어를 "해설 미완료" 상태로 사전에 등록하고 다음 배치에서 재시도한다 (TERM-06).
- 응답 텍스트가 유효한 JSON이 아닌 경우, 텍스트를 그대로 description에 저장하고 summary는 빈 값으로 처리한다.
- 해설 생성 시 환자 개인정보(이름, 주민번호 등)가 포함되지 않도록 프롬프트에서 사전 필터링한다 (POL-TERM 제약사항).

### 관련 기능

- 용어사전 생성 기능 (PRD)
- POL-TERM: TERM-03 (해설 생성 규칙), TERM-05 (배치 처리 정책), TERM-06 (분석 실패 처리)
- POL-AUTH: AUTH-04 (Claude API 인증 정책)
