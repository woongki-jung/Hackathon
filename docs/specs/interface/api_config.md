# Config API 정의

## 개요
- 시스템 환경설정(IMAP 서버 정보 등) 조회 및 수정 API를 정의한다. 관리자 전용 API이다.
- 관련 도메인 객체: AppSetting (DATA-002)
- 관련 기능: CMN-CFG-001 (환경설정 관리)
- 관련 정책: POL-AUTH (AUTH-R-014, AUTH-R-017, AUTH-R-020), POL-DATA (DATA-R-020)

---

## CFG-001 환경설정 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/config |
| 인증 | 필요 |
| 권한 | admin |
| 설명 | 시스템 환경설정 값을 조회한다 (관리자 전용) |

### 요청

파라미터 없음.

#### 요청 예시
```http
GET /api/config HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "mail": {
      "imapHost": "imap.gmail.com",
      "imapPort": 993,
      "imapUsername": "user@example.com",
      "useSsl": true,
      "checkInterval": 3600000,
      "passwordConfigured": true
    },
    "analysis": {
      "model": "claude-sonnet-4-6",
      "apiKeyConfigured": true
    }
  }
}
```

| 필드 | 타입 | 설명 | 출처 |
|------|------|------|------|
| mail.imapHost | string / null | IMAP 서버 호스트 | DB (mail.imap.host) |
| mail.imapPort | number / null | IMAP 서버 포트 | DB (mail.imap.port) |
| mail.imapUsername | string / null | IMAP 로그인 아이디 | DB (mail.imap.username) |
| mail.useSsl | boolean | SSL/TLS 사용 여부 | DB (mail.imap.use_ssl) |
| mail.checkInterval | number | 메일 확인 주기 (ms) | DB (mail.check_interval) |
| mail.passwordConfigured | boolean | IMAP 비밀번호 설정 여부 | 환경변수 MAIL_PASSWORD 존재 여부 |
| analysis.model | string | Claude API 모델명 | DB (analysis.model) |
| analysis.apiKeyConfigured | boolean | Claude API 키 설정 여부 | 환경변수 ANTHROPIC_API_KEY 존재 여부 |

> AUTH-R-017, AUTH-R-018: IMAP 비밀번호와 Claude API 키는 응답에 포함하지 않는다. 설정 여부만 boolean으로 반환한다 (AUTH-R-020).

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 | 관련 정책 |
|-----------|-----------|------|-----------|
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 | AUTH-R-012 |
| 403 | FORBIDDEN | 관리자 권한 필요 | AUTH-R-014 |

### 비즈니스 규칙
- 민감정보(비밀번호, API 키)는 마스킹하여 반환한다. `passwordConfigured`와 `apiKeyConfigured`로 설정 여부만 boolean으로 표시한다 (AUTH-R-020).
- 환경변수(`.env.local`)의 내용은 웹 API를 통해 직접 반환하지 않는다 (POL-DATA DATA-R-020).
- DB에 설정값이 없는 경우 `null`을 반환한다.

### 관련 기능
- CMN-CFG-001 (환경설정 조회)

---

## CFG-002 환경설정 수정

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | PUT |
| 경로 | /api/config |
| 인증 | 필요 |
| 권한 | admin |
| 설명 | 시스템 환경설정 값을 수정한다 (관리자 전용) |

### 요청

#### Request Body
```json
{
  "mail": {
    "imapHost": "string (IMAP 서버 호스트, 선택)",
    "imapPort": "number (IMAP 포트, 선택)",
    "imapUsername": "string (IMAP 아이디, 선택)",
    "useSsl": "boolean (SSL 사용 여부, 선택)",
    "checkInterval": "number (확인 주기 ms, 선택)"
  },
  "analysis": {
    "model": "string (Claude 모델명, 선택)"
  }
}
```

| 필드 | 타입 | 필수 | 설명 | 유효성 규칙 |
|------|------|------|------|-------------|
| mail.imapHost | string | ❌ | IMAP 서버 호스트 | 빈 문자열 불가 |
| mail.imapPort | number | ❌ | IMAP 포트 | 1~65535 범위 |
| mail.imapUsername | string | ❌ | IMAP 로그인 아이디 | 이메일 형식 권장 |
| mail.useSsl | boolean | ❌ | SSL/TLS 사용 여부 | - |
| mail.checkInterval | number | ❌ | 메일 확인 주기 (ms) | 최소 60000 (1분) |
| analysis.model | string | ❌ | Claude API 모델명 | 빈 문자열 불가 |

> 요청 본문에 포함된 필드만 업데이트한다 (Partial Update). 포함되지 않은 필드는 기존 값을 유지한다.

#### 요청 예시
```http
PUT /api/config HTTP/1.1
Content-Type: application/json
Cookie: mail-term-session=...

{
  "mail": {
    "imapHost": "imap.gmail.com",
    "imapPort": 993,
    "useSsl": true
  }
}
```

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "mail": {
      "imapHost": "imap.gmail.com",
      "imapPort": 993,
      "imapUsername": "user@example.com",
      "useSsl": true,
      "checkInterval": 3600000,
      "passwordConfigured": true
    },
    "analysis": {
      "model": "claude-sonnet-4-6",
      "apiKeyConfigured": true
    }
  },
  "message": "설정이 저장되었습니다."
}
```

> 수정 성공 후 전체 설정을 CFG-001과 동일한 형식으로 반환한다.

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 | 관련 정책 |
|-----------|-----------|------|-----------|
| 400 | VALIDATION_ERROR | 유효성 검증 실패 (포트 범위, 주기 최소값 등) | - |
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 | AUTH-R-012 |
| 403 | FORBIDDEN | 관리자 권한 필요 | AUTH-R-014 |

### 비즈니스 규칙
- 환경설정 변경은 관리자만 가능하다 (AUTH-R-014).
- DB의 `app_settings` 테이블에 키-값으로 저장한다.
- 환경변수(MAIL_PASSWORD, ANTHROPIC_API_KEY)는 이 API로 변경할 수 없다 (POL-DATA DATA-R-020). 서버의 `.env.local` 파일을 직접 수정해야 한다.
- `updatedAt` 필드를 현재 시간으로 갱신한다.

### 관련 기능
- CMN-CFG-001 (환경설정 저장)

---

## CFG-003 메일 서버 연결 테스트

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | POST |
| 경로 | /api/config/test-mail |
| 인증 | 필요 |
| 권한 | admin |
| 설명 | 현재 설정된 IMAP 서버로 테스트 연결을 시도한다 (관리자 전용) |

### 요청

Request Body 없음. DB에 저장된 설정값과 환경변수의 비밀번호를 사용하여 테스트한다.

#### 요청 예시
```http
POST /api/config/test-mail HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK) - 연결 성공
```json
{
  "success": true,
  "data": {
    "connected": true,
    "mailboxExists": true,
    "unseenCount": 5
  },
  "message": "메일 서버 연결에 성공했습니다."
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| connected | boolean | IMAP 서버 연결 성공 여부 |
| mailboxExists | boolean | INBOX 폴더 존재 여부 |
| unseenCount | number | 읽지 않은 메일 건수 |

#### 성공 응답 (200 OK) - 연결 실패
```json
{
  "success": true,
  "data": {
    "connected": false,
    "error": "IMAP 서버에 연결할 수 없습니다. 호스트와 포트를 확인해주세요."
  },
  "message": "메일 서버 연결에 실패했습니다."
}
```

> 연결 테스트는 비즈니스 로직으로서, IMAP 연결 실패도 200 OK로 응답하되 `connected: false`로 결과를 전달한다.

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 | 관련 정책 |
|-----------|-----------|------|-----------|
| 400 | INVALID_REQUEST | IMAP 설정이 완료되지 않음 (호스트/포트 미설정) | MAIL-R-002 |
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 | AUTH-R-012 |
| 403 | FORBIDDEN | 관리자 권한 필요 | AUTH-R-014 |

### 비즈니스 규칙
- DB에 저장된 IMAP 설정(호스트, 포트, 아이디, SSL)과 환경변수의 비밀번호(MAIL_PASSWORD)를 조합하여 테스트 연결한다.
- IMAP 호스트 또는 포트가 미설정이면 400을 반환한다 (MAIL-R-002).
- 연결 타임아웃은 10초로 설정한다.
- SSL/TLS 사용 여부는 설정값에 따른다 (MAIL-R-001).
- 테스트 연결 후 즉시 연결을 해제한다 (메일을 가져오지 않음).

### 관련 기능
- MAIL-RECV-001 (IMAP 메일 수신 - 연결 부분만 사용)
- CMN-CFG-001 (설정값 조회)
