# Mail API 정의

## 개요
- 백그라운드 메일 수신/분석 서비스의 상태 조회 및 수동 실행 API를 정의한다.
- 관련 도메인 객체: MailProcessingLog (DATA-003)
- 관련 기능: VIEW-STATE-001 (앱 상태 정보 조회), SCHED-001 (백그라운드 스케줄러)
- 관련 정책: POL-MAIL (MAIL-R-014, MAIL-R-015), POL-AUTH

---

## MAIL-001 서비스 상태 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/mail/status |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 백그라운드 메일 수신/분석 서비스의 실행 상태를 조회한다 |

### 요청

파라미터 없음.

#### 요청 예시
```http
GET /api/mail/status HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "scheduler": {
      "isRunning": true,
      "checkInterval": 3600000,
      "nextCheckAt": "2026-03-15T11:00:00Z"
    },
    "lastMailReceive": {
      "executedAt": "2026-03-15T10:00:00Z",
      "completedAt": "2026-03-15T10:00:45Z",
      "status": "success",
      "mailCount": 3
    },
    "lastTermAnalysis": {
      "executedAt": "2026-03-15T10:00:45Z",
      "completedAt": "2026-03-15T10:02:30Z",
      "status": "success",
      "analyzedCount": 3
    },
    "config": {
      "imapConfigured": true,
      "apiKeyConfigured": true
    }
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| scheduler.isRunning | boolean | 스케줄러 실행 중 여부 |
| scheduler.checkInterval | number | 메일 확인 주기 (ms) |
| scheduler.nextCheckAt | string / null | 다음 메일 확인 예정 시각 (ISO 8601) |
| lastMailReceive | object / null | 마지막 메일 수신 프로세스 정보 (이력 없으면 null) |
| lastMailReceive.executedAt | string | 실행 시작 일시 |
| lastMailReceive.completedAt | string / null | 실행 완료 일시 |
| lastMailReceive.status | string | 실행 결과 (`success` / `failure` / `skipped`) |
| lastMailReceive.mailCount | number | 수신된 메일 건수 |
| lastTermAnalysis | object / null | 마지막 용어 분석 프로세스 정보 (이력 없으면 null) |
| lastTermAnalysis.executedAt | string | 실행 시작 일시 |
| lastTermAnalysis.completedAt | string / null | 실행 완료 일시 |
| lastTermAnalysis.status | string | 실행 결과 (`success` / `failure` / `skipped`) |
| lastTermAnalysis.analyzedCount | number | 분석 완료 파일 건수 |
| config.imapConfigured | boolean | IMAP 설정 완료 여부 (호스트+포트+비밀번호) |
| config.apiKeyConfigured | boolean | Claude API 키 설정 여부 |

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 |

### 비즈니스 규칙
- 관리자와 일반 사용자 모두 조회할 수 있다 (AUTH-R-016).
- `mail_processing_logs` 테이블에서 `process_type`별 최신 레코드를 조회한다 (MAIL-R-015).
- IMAP 설정 미완료 시 `lastMailReceive`는 null이고 `config.imapConfigured`는 false이다.
- ANTHROPIC_API_KEY 미설정 시 `config.apiKeyConfigured`는 false이다.

### 관련 기능
- VIEW-STATE-001 (앱 상태 정보 조회)

---

## MAIL-002 수동 메일 확인 트리거

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | POST |
| 경로 | /api/mail/check |
| 인증 | 필요 |
| 권한 | admin |
| 설명 | 메일 수신 및 분석 프로세스를 수동으로 즉시 실행한다 (관리자 전용) |

### 요청

Request Body 없음.

#### 요청 예시
```http
POST /api/mail/check HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK) - 트리거 성공
```json
{
  "success": true,
  "data": {
    "triggered": true
  },
  "message": "메일 확인이 시작되었습니다. 완료까지 시간이 소요될 수 있습니다."
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| triggered | boolean | 트리거 성공 여부 |

#### 성공 응답 (200 OK) - 이미 실행 중
```json
{
  "success": true,
  "data": {
    "triggered": false
  },
  "message": "이미 메일 확인 작업이 진행 중입니다."
}
```

> MAIL-R-006에 따라 이전 작업이 진행 중인 경우 중복 실행하지 않고 `triggered: false`로 응답한다.

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 | 관련 정책 |
|-----------|-----------|------|-----------|
| 400 | INVALID_REQUEST | IMAP 설정 미완료 | MAIL-R-002 |
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 | AUTH-R-012 |
| 403 | FORBIDDEN | 관리자 권한 필요 | - |

### 비즈니스 규칙
- 비동기 처리: API 호출 즉시 트리거 여부만 응답하고, 실제 메일 수신/분석은 백그라운드에서 수행한다.
- 중복 실행 방지: 이전 작업이 진행 중이면 새 작업을 시작하지 않는다 (MAIL-R-006).
- IMAP 설정이 완료되지 않은 경우 (호스트/포트 미설정) 400을 반환한다.
- 트리거 후 결과는 MAIL-001 (서비스 상태 조회) API로 확인한다.
- 메일 수신 완료 후 자동으로 용어 분석이 순차 실행된다 (TERM-R-002).

### 관련 기능
- SCHED-001 (백그라운드 스케줄러 - 수동 트리거)
- TERM-BATCH-001 (배치 분석 오케스트레이션)
