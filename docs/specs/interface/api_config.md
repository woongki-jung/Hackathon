# 환경설정 서비스 인터페이스 정의

## 개요

- 본 문서는 앱 내부의 환경설정 서비스 계층 인터페이스를 정의한다.
- 환경설정 서비스는 앱의 설정 값을 읽고, 저장하고, 유효성을 검증하는 역할을 담당한다.
- 설정 값의 원본은 환경변수 또는 암호화된 로컬 설정 파일이다.
- 관련 정책: POL-AUTH (AUTH-02), POL-MAIL (MAIL-01, MAIL-02, MAIL-03), POL-UI (UI-03)

---

## CFG-001: 설정 읽기

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 앱 환경설정 값을 조회하여 반환한다 |

### 입력

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| key | string | 조건부 | 특정 설정 키. 미지정 시 전체 설정 반환 |

### 출력: 전체 설정 객체

```json
{
  "mail": {
    "userEmail": "user@example.com",
    "mailboxName": "Inbox",
    "pollIntervalSeconds": 60,
    "fetchUnreadOnly": true,
    "maxFetchCount": 50
  },
  "storage": {
    "analysisDir": "C:\\App\\AnalysisRequests"
  },
  "analysis": {
    "maxDailyApiCalls": 200,
    "stopWords": ["IT", "OK", "PM", "AM"]
  },
  "auth": {
    "graphConnected": true,
    "claudeConnected": true
  }
}
```

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| mail.userEmail | string | - | 메일 계정 이메일 주소 (`MAIL_USER_EMAIL`) |
| mail.mailboxName | string | "Inbox" | 모니터링 대상 메일함 이름 |
| mail.pollIntervalSeconds | integer | 60 | 메일함 확인 주기 (초) |
| mail.fetchUnreadOnly | boolean | true | 읽지 않은 메일만 조회 여부 |
| mail.maxFetchCount | integer | 50 | 1회 조회 최대 건수 |
| storage.analysisDir | string | "{앱경로}/AnalysisRequests" | 분석 요청 폴더 경로 |
| analysis.maxDailyApiCalls | integer | 200 | 일일 최대 Claude API 호출 횟수 |
| analysis.stopWords | array of string | (기본 불용어 목록) | 용어 추출 시 제외할 불용어 목록 |
| auth.graphConnected | boolean | - | Microsoft Graph API 연결 상태 |
| auth.claudeConnected | boolean | - | Claude API 연결 상태 |

### 비즈니스 규칙

- 인증 정보(시크릿, 토큰, API 키)는 반환 값에 포함하지 않는다. 연결 상태(boolean)만 반환한다 (POL-AUTH).
- 환경변수에 값이 없는 경우 각 항목의 기본값을 반환한다.

---

## CFG-002: 설정 저장

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 사용자가 변경한 환경설정 값을 저장하고 즉시 반영한다 |

### 입력

```json
{
  "mail": {
    "mailboxName": "Inbox",
    "pollIntervalSeconds": 120,
    "fetchUnreadOnly": true,
    "maxFetchCount": 30
  },
  "storage": {
    "analysisDir": "D:\\Custom\\AnalysisRequests"
  },
  "analysis": {
    "maxDailyApiCalls": 100,
    "stopWords": ["IT", "OK", "PM", "AM", "HR"]
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| mail.mailboxName | string | ✅ | 모니터링 대상 메일함 이름 |
| mail.pollIntervalSeconds | integer | ✅ | 메일함 확인 주기 (초, 30~3600) |
| mail.fetchUnreadOnly | boolean | ✅ | 읽지 않은 메일만 조회 여부 |
| mail.maxFetchCount | integer | ✅ | 1회 조회 최대 건수 (1~100) |
| storage.analysisDir | string | ✅ | 분석 요청 폴더 경로 |
| analysis.maxDailyApiCalls | integer | ✅ | 일일 최대 API 호출 횟수 (1~1000) |
| analysis.stopWords | array of string | ✅ | 불용어 목록 |

### 출력

```json
{
  "success": true,
  "message": "설정이 저장되었습니다."
}
```

### 에러

| 에러 코드 | 설명 |
|-----------|------|
| VALIDATION_ERROR | 설정 값이 유효하지 않음 (CFG-003 참조) |
| STORAGE_ERROR | 설정 파일 저장 실패 (디스크 접근 권한 등) |

### 비즈니스 규칙

- 저장 전 반드시 CFG-003 유효성 검증을 수행한다.
- 설정 변경은 앱 재시작 없이 즉시 반영된다 (UI-03).
- `mail.userEmail` 및 인증 정보는 이 인터페이스로 변경할 수 없다 (환경변수로만 관리).

---

## CFG-003: 설정 유효성 검증

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 설정 값의 범위, 형식, 접근 가능 여부를 검증한다 |

### 입력

CFG-002와 동일한 설정 객체

### 출력

```json
{
  "valid": true,
  "errors": []
}
```

또는 유효하지 않은 경우:

```json
{
  "valid": false,
  "errors": [
    {
      "field": "mail.pollIntervalSeconds",
      "message": "폴링 주기는 30~3600초 범위여야 합니다.",
      "currentValue": 10
    },
    {
      "field": "storage.analysisDir",
      "message": "지정된 경로에 대한 쓰기 권한이 없습니다.",
      "currentValue": "C:\\Windows\\System32"
    }
  ]
}
```

### 검증 규칙

| 필드 | 규칙 | 참조 |
|------|------|------|
| mail.pollIntervalSeconds | 30 이상, 3600 이하. 범위 밖이면 기본값(60) 적용 후 경고 | MAIL-01 |
| mail.maxFetchCount | 1 이상, 100 이하 | MAIL-03 |
| storage.analysisDir | 디렉터리 존재 여부 확인, 쓰기 권한 확인 | DATA-01 |
| analysis.maxDailyApiCalls | 1 이상, 1000 이하 | POL-TERM |

### 비즈니스 규칙

- 범위를 벗어난 `pollIntervalSeconds` 값은 기본값(60)을 적용하고 경고 로그를 출력한다 (MAIL-01).
- `analysisDir` 경로에 한글 또는 공백이 포함되어도 정상 동작해야 한다 (DATA-01).
- 디렉터리가 존재하지 않는 경우 자동 생성을 시도한다 (DATA-01).
