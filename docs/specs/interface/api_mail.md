# 메일 수신 서비스 인터페이스 정의

## 개요

- 본 문서는 앱 내부의 메일 수신 서비스 계층 인터페이스를 정의한다.
- 메일 수신 서비스는 Microsoft Graph API를 통해 메일을 수신하고, 분석 요청 파일로 저장하며, 처리 이력을 관리한다.
- 관련 정책: POL-MAIL, POL-DATA (DATA-01~03), POL-AUTH
- 관련 외부 API: api_graph.md (GRAPH-001~005)

---

## MAIL-001: 메일 수신 실행

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 (주기적 백그라운드 작업) |
| 설명 | 설정된 주기로 메일함을 폴링하고 신규 메일을 수신하여 파일로 저장한다 |
| 트리거 | 타이머(pollIntervalSeconds 간격) 또는 수동 호출("메일 즉시 확인") |

### 입력

없음 (환경설정에서 필요한 값을 자동으로 가져옴)

### 처리 흐름

1. 액세스 토큰 유효성 확인 및 갱신 (GRAPH-001 호출)
2. 메일함 폴더 유효성 확인 (GRAPH-005 호출, 최초 1회 또는 설정 변경 시)
3. 메일 목록 조회 (GRAPH-002 호출)
4. 각 메일에 대해:
   a. Message ID로 처리 이력 확인 (MAIL-003)
   b. 이미 처리된 메일이면 건너뜀
   c. 메일 내용 추출 (HTML 태그 제거, 1MB 제한)
   d. 분석 요청 파일 저장 (MAIL-002)
   e. 메일 읽음 처리 (GRAPH-004 호출)
   f. 처리 이력에 Message ID 기록

### 출력

```json
{
  "success": true,
  "processedCount": 5,
  "skippedCount": 2,
  "errorCount": 0,
  "errors": []
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| success | boolean | 전체 처리 성공 여부 (부분 실패 시 false) |
| processedCount | integer | 정상 처리된 메일 수 |
| skippedCount | integer | 이미 처리되어 건너뛴 메일 수 |
| errorCount | integer | 처리 실패한 메일 수 |
| errors | array | 오류 상세 목록 |

### 에러

| 에러 코드 | 설명 | 후속 조치 |
|-----------|------|-----------|
| AUTH_FAILED | 토큰 발급/갱신 실패 | 다음 폴링 주기에 재시도 |
| MAILBOX_NOT_FOUND | 메일함을 찾을 수 없음 | Inbox로 폴백 |
| RATE_LIMITED | Graph API Rate Limit 초과 | Retry-After 대기 후 재시도 |
| NETWORK_ERROR | 네트워크 연결 실패 | 다음 폴링 주기에 재시도 |
| DISK_FULL | 디스크 용량 부족 | 메일 수신 일시 중지, 트레이 알림 |

### 비즈니스 규칙

- 폴링 주기는 `mail.pollIntervalSeconds`(기본 60초)로 결정된다 (MAIL-01).
- 연속 5회 이상 실패 시 트레이 풍선 알림을 표시한다 (MAIL-06, UI-02).
- 디스크 용량 1GB 미만 시 메일 수신을 일시 중지하고 트레이 알림을 표시한다 (POL-DATA 제약사항).
- 신규 메일 수신 및 분석 완료 시 트레이 알림을 표시한다 (UI-02).
- 트레이 컨텍스트 메뉴의 "메일 즉시 확인" 선택 시 폴링 주기와 무관하게 즉시 실행한다 (UI-01).

---

## MAIL-002: 메일 파일 저장

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 수신된 메일을 분석 요청 텍스트 파일로 저장한다 |

### 입력

```json
{
  "subject": "OCS 시스템 업데이트 안내",
  "from": "hong@example.com",
  "receivedAt": "2026-03-13T14:30:22Z",
  "messageId": "<ABCDEF123456@example.com>",
  "bodyText": "OCS 시스템이 업데이트되어 처방 입력 화면이 변경됩니다. PACS 연동 모듈도 함께..."
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| subject | string | ✅ | 메일 제목 |
| from | string | ✅ | 발신자 이메일 주소 |
| receivedAt | string (ISO 8601) | ✅ | 수신 일시 |
| messageId | string | ✅ | 인터넷 표준 메시지 ID |
| bodyText | string | ✅ | HTML 태그가 제거된 메일 본문 텍스트 |

### 출력

```json
{
  "success": true,
  "filePath": "C:\\App\\AnalysisRequests\\20260313_143022_a1b2c3d4.txt"
}
```

### 저장 파일 형식 (DATA-03)

```
---
subject: OCS 시스템 업데이트 안내
from: hong@example.com
received_at: 2026-03-13T14:30:22Z
message_id: <ABCDEF123456@example.com>
---

OCS 시스템이 업데이트되어 처방 입력 화면이 변경됩니다. PACS 연동 모듈도 함께...
```

### 파일명 규칙 (DATA-02)

- 형식: `{수신일시}_{MessageID해시}.txt`
- 수신일시: `yyyyMMdd_HHmmss`
- MessageID해시: Message ID의 SHA256 해시 앞 8자리
- 예시: `20260313_143022_a1b2c3d4.txt`

### 에러

| 에러 코드 | 설명 |
|-----------|------|
| FILE_EXISTS | 동일 파일명이 이미 존재 (이미 처리된 메일) |
| WRITE_FAILED | 파일 쓰기 실패 (권한 문제 등) |
| DISK_FULL | 디스크 용량 부족 |

### 비즈니스 규칙

- 저장 경로는 `storage.analysisDir` 설정을 따른다 (DATA-01).
- 디렉터리가 존재하지 않는 경우 자동으로 생성한다 (DATA-01).
- 경로에 한글 또는 공백이 포함되어도 정상 동작해야 한다 (DATA-01).
- 동일 파일명이 존재하는 경우 덮어쓰지 않고 건너뛴다 (DATA-02).
- 인코딩은 UTF-8 (BOM 없음) (DATA-03).

---

## MAIL-003: 처리 이력 조회

### 기본 정보

| 항목 | 내용 |
|------|------|
| 유형 | 내부 서비스 호출 |
| 설명 | 처리 완료된 메일의 Message ID 목록을 조회하여 중복 처리를 방지한다 |

### 입력

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| messageId | string | 조건부 | 특정 Message ID 존재 여부 확인. 미지정 시 전체 목록 반환 |

### 출력: 특정 ID 확인 시

```json
{
  "exists": true,
  "processedAt": "2026-03-13T14:31:00Z"
}
```

### 출력: 전체 목록 조회 시

```json
{
  "items": [
    {
      "messageId": "<ABCDEF123456@example.com>",
      "processedAt": "2026-03-13T14:31:00Z"
    }
  ],
  "totalCount": 150
}
```

### 비즈니스 규칙

- 처리 이력은 로컬 파일 또는 내장 DB에 저장한다.
- 이미 처리된 메일의 재처리를 방지하기 위해 Message ID를 기록한다 (MAIL-03).
- 메일 읽음 처리(GRAPH-004) 실패 시 중복 처리될 수 있으므로, Message ID 기반 중복 확인이 반드시 필요하다 (MAIL-04).
