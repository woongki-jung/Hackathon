# Microsoft Graph API 인터페이스 정의

## 개요

- 본 문서는 앱에서 Microsoft Graph API를 호출하여 메일을 수신하고 상태를 변경하는 인터페이스를 정의한다.
- 기본 URL: `https://login.microsoftonline.com` (인증), `https://graph.microsoft.com/v1.0` (API)
- 인증: OAuth 2.0 Client Credentials Flow
- 관련 정책: POL-AUTH (AUTH-01, AUTH-02, AUTH-03), POL-MAIL

---

## GRAPH-001: OAuth 토큰 발급

### 기본 정보

| 항목 | 내용 |
|------|------|
| 메서드 | POST |
| 경로 | `https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token` |
| 인증 | 불필요 (이 요청 자체가 인증 과정) |
| 설명 | Azure AD에서 Microsoft Graph API 접근용 액세스 토큰을 발급받는다 |

### 요청

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| AZURE_TENANT_ID | string | ✅ | Azure AD 테넌트 ID (환경변수) |

#### Request Body (application/x-www-form-urlencoded)

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| client_id | string | ✅ | Azure AD 애플리케이션 ID (`AZURE_CLIENT_ID`) |
| client_secret | string | ✅ | 클라이언트 시크릿 (`AZURE_CLIENT_SECRET`) |
| scope | string | ✅ | 요청 권한 범위 |
| grant_type | string | ✅ | 인증 유형 |

#### 요청 예시

```http
POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

client_id={clientId}
&client_secret={clientSecret}
&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default
&grant_type=client_credentials
```

### 응답

#### 성공 응답 (200 OK)

```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "ext_expires_in": 3600,
  "access_token": "eyJ0eXAiOiJKV1Qi..."
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| token_type | string | 토큰 유형 (항상 "Bearer") |
| expires_in | integer | 토큰 유효 기간 (초) |
| ext_expires_in | integer | 확장 유효 기간 (초) |
| access_token | string | API 호출 시 사용할 액세스 토큰 |

#### 에러 응답

| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 400 | invalid_request | 필수 파라미터 누락 또는 잘못된 값 |
| 400 | invalid_client | 클라이언트 인증 실패 (잘못된 client_id/secret) |
| 400 | invalid_grant | 권한 부여 실패 |
| 401 | unauthorized_client | 해당 클라이언트에 권한이 부여되지 않음 |

### 비즈니스 규칙

- 토큰 만료 5분 전에 자동 갱신한다 (AUTH-03).
- 토큰 갱신 실패 시 최대 3회 재시도하며, 실패 시 로그에 기록하고 다음 폴링 주기에 재시도한다 (AUTH-03).
- 액세스 토큰은 메모리에만 보관하며, 파일/로그에 기록하지 않는다 (POL-AUTH 제약사항).

---

## GRAPH-002: 메일 목록 조회

### 기본 정보

| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | `https://graph.microsoft.com/v1.0/users/{userId}/mailFolders/{folderId}/messages` |
| 인증 | 필요 (Bearer Token) |
| 권한 | Mail.Read (Application) |
| 설명 | 지정된 메일함에서 메일 목록을 조회한다 |

### 요청

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| userId | string | ✅ | 메일 계정 이메일 주소 (`MAIL_USER_EMAIL`) |
| folderId | string | ✅ | 메일함 폴더 이름 또는 ID (`MAIL_MAILBOX_NAME`, 기본값: Inbox) |

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| $filter | string | 조건부 | - | 필터 조건. `MAIL_FETCH_UNREAD_ONLY=true`인 경우 `isRead eq false` |
| $top | integer | ✅ | 50 | 1회 조회 최대 건수 (`MAIL_MAX_FETCH_COUNT`) |
| $orderby | string | ✅ | receivedDateTime desc | 정렬 기준: 수신 시간 내림차순 |
| $select | string | ✅ | - | 조회할 필드 목록 |

#### 요청 예시

```http
GET https://graph.microsoft.com/v1.0/users/{userEmail}/mailFolders/Inbox/messages?$filter=isRead eq false&$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,body,internetMessageId HTTP/1.1
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### 응답

#### 성공 응답 (200 OK)

```json
{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users('{userId}')/mailFolders('Inbox')/messages",
  "@odata.nextLink": "https://graph.microsoft.com/v1.0/users/{userId}/mailFolders/Inbox/messages?$skip=50",
  "value": [
    {
      "id": "AAMkAGI2TG93AAA=",
      "subject": "OCS 시스템 업데이트 안내",
      "from": {
        "emailAddress": {
          "name": "홍길동",
          "address": "hong@example.com"
        }
      },
      "receivedDateTime": "2026-03-13T14:30:22Z",
      "body": {
        "contentType": "html",
        "content": "<html><body>OCS 시스템이 업데이트되었습니다...</body></html>"
      },
      "internetMessageId": "<ABCDEF123456@example.com>"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| value | array | 메일 목록 |
| value[].id | string | 메일 고유 ID (Graph API 내부 ID) |
| value[].subject | string | 메일 제목 |
| value[].from.emailAddress.name | string | 발신자 이름 |
| value[].from.emailAddress.address | string | 발신자 이메일 주소 |
| value[].receivedDateTime | string (ISO 8601) | 수신 일시 |
| value[].body.contentType | string | 본문 형식 ("text" 또는 "html") |
| value[].body.content | string | 본문 내용 |
| value[].internetMessageId | string | 인터넷 표준 메시지 ID |
| @odata.nextLink | string (nullable) | 다음 페이지 URL (없으면 마지막 페이지) |

#### 에러 응답

| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 400 | BadRequest | 잘못된 쿼리 파라미터 |
| 401 | InvalidAuthenticationToken | 토큰 만료 또는 무효 |
| 403 | AccessDenied | Mail.Read 권한 없음 |
| 404 | MailboxNotFound | 지정된 사용자 또는 메일함을 찾을 수 없음 |
| 429 | TooManyRequests | Rate Limit 초과 |

### 비즈니스 규칙

- `MAIL_FETCH_UNREAD_ONLY`가 `true`인 경우 `$filter=isRead eq false`를 적용한다 (MAIL-03).
- 1회 조회 시 최대 `MAIL_MAX_FETCH_COUNT`건(기본 50)을 가져온다 (MAIL-03).
- 조회 순서는 수신 시간 내림차순(최신 우선)이다 (MAIL-03).
- HTTP 429 응답 시 `Retry-After` 헤더 값만큼 대기 후 재시도한다 (MAIL-06).
- 이미 처리된 메일(Message ID가 로컬에 기록된 경우)은 건너뛴다 (MAIL-03).

---

## GRAPH-003: 메일 상세 조회

### 기본 정보

| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | `https://graph.microsoft.com/v1.0/users/{userId}/messages/{messageId}` |
| 인증 | 필요 (Bearer Token) |
| 권한 | Mail.Read (Application) |
| 설명 | 개별 메일의 상세 내용을 조회한다 (목록 조회에서 본문이 잘린 경우 사용) |

### 요청

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| userId | string | ✅ | 메일 계정 이메일 주소 |
| messageId | string | ✅ | 메일 고유 ID (Graph API ID) |

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| $select | string | ✅ | - | 조회할 필드 목록 |

#### 요청 예시

```http
GET https://graph.microsoft.com/v1.0/users/{userEmail}/messages/{messageId}?$select=id,subject,from,receivedDateTime,body,internetMessageId HTTP/1.1
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### 응답

#### 성공 응답 (200 OK)

```json
{
  "id": "AAMkAGI2TG93AAA=",
  "subject": "OCS 시스템 업데이트 안내",
  "from": {
    "emailAddress": {
      "name": "홍길동",
      "address": "hong@example.com"
    }
  },
  "receivedDateTime": "2026-03-13T14:30:22Z",
  "body": {
    "contentType": "html",
    "content": "<html><body>OCS 시스템이 업데이트되었습니다. PACS 연동 모듈...</body></html>"
  },
  "internetMessageId": "<ABCDEF123456@example.com>"
}
```

#### 에러 응답

| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 401 | InvalidAuthenticationToken | 토큰 만료 또는 무효 |
| 404 | ErrorItemNotFound | 해당 메일을 찾을 수 없음 |
| 429 | TooManyRequests | Rate Limit 초과 |

### 비즈니스 규칙

- HTML 본문인 경우 태그를 제거하고 텍스트만 추출한다 (MAIL-05).
- 대용량 메일(본문 1MB 초과)은 처음 1MB까지만 추출한다 (POL-MAIL 제약사항).
- 첨부파일은 처리 대상에서 제외한다 (MAIL-05).

---

## GRAPH-004: 메일 읽음 처리

### 기본 정보

| 항목 | 내용 |
|------|------|
| 메서드 | PATCH |
| 경로 | `https://graph.microsoft.com/v1.0/users/{userId}/messages/{messageId}` |
| 인증 | 필요 (Bearer Token) |
| 권한 | Mail.ReadWrite (Application) |
| 설명 | 처리 완료된 메일의 읽음 상태를 변경한다 |

### 요청

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| userId | string | ✅ | 메일 계정 이메일 주소 |
| messageId | string | ✅ | 메일 고유 ID (Graph API ID) |

#### Request Body (application/json)

```json
{
  "isRead": true
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| isRead | boolean | ✅ | 읽음 상태 (항상 `true`로 설정) |

#### 요청 예시

```http
PATCH https://graph.microsoft.com/v1.0/users/{userEmail}/messages/{messageId} HTTP/1.1
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "isRead": true
}
```

### 응답

#### 성공 응답 (200 OK)

```json
{
  "id": "AAMkAGI2TG93AAA=",
  "isRead": true
}
```

#### 에러 응답

| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 401 | InvalidAuthenticationToken | 토큰 만료 또는 무효 |
| 404 | ErrorItemNotFound | 해당 메일을 찾을 수 없음 |
| 429 | TooManyRequests | Rate Limit 초과 |

### 비즈니스 규칙

- 메일 내용을 성공적으로 저장한 후에만 읽음 처리를 수행한다 (MAIL-04).
- 상태 변경 실패 시 로그에 기록하되, 다음 폴링에서 중복 처리될 수 있음을 감안한다 (MAIL-04).
- 메일을 삭제하거나 이동하지 않는다 (MAIL-04, 원본 보존 원칙).

---

## GRAPH-005: 메일함 폴더 조회

### 기본 정보

| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | `https://graph.microsoft.com/v1.0/users/{userId}/mailFolders` |
| 인증 | 필요 (Bearer Token) |
| 권한 | Mail.Read (Application) |
| 설명 | 사용자 메일함의 폴더 목록을 조회하여 대상 메일함 존재 여부를 확인한다 |

### 요청

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| userId | string | ✅ | 메일 계정 이메일 주소 |

#### 요청 예시

```http
GET https://graph.microsoft.com/v1.0/users/{userEmail}/mailFolders HTTP/1.1
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### 응답

#### 성공 응답 (200 OK)

```json
{
  "value": [
    {
      "id": "AAMkAGI2AAEKAAA=",
      "displayName": "Inbox",
      "totalItemCount": 245,
      "unreadItemCount": 12
    },
    {
      "id": "AAMkAGI2AAEkBBB=",
      "displayName": "Sent Items",
      "totalItemCount": 130,
      "unreadItemCount": 0
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| value[].id | string | 폴더 고유 ID |
| value[].displayName | string | 폴더 표시 이름 |
| value[].totalItemCount | integer | 전체 메일 수 |
| value[].unreadItemCount | integer | 읽지 않은 메일 수 |

#### 에러 응답

| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 401 | InvalidAuthenticationToken | 토큰 만료 또는 무효 |
| 404 | MailboxNotFound | 사용자 메일함을 찾을 수 없음 |

### 비즈니스 규칙

- 지정된 메일함(`MAIL_MAILBOX_NAME`)이 폴더 목록에 존재하지 않을 경우, 에러 로그를 기록하고 `Inbox`로 폴백한다 (MAIL-02).
- 앱 시작 시 또는 설정 변경 시 한 번 호출하여 메일함 유효성을 검증한다.
