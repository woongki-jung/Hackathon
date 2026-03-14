# User API 정의

## 개요
- 사용자 계정 관리 API를 정의한다. 관리자 전용 API이다.
- 관련 도메인 객체: User (DATA-001)
- 관련 기능: CMN-AUTH-001 (웹 로그인 인증)
- 관련 정책: POL-AUTH (AUTH-R-002 ~ AUTH-R-007, AUTH-R-015)

---

## USER-001 사용자 목록 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/users |
| 인증 | 필요 |
| 권한 | admin |
| 설명 | 등록된 사용자 목록을 조회한다 (관리자 전용) |

### 요청

파라미터 없음.

#### 요청 예시
```http
GET /api/users HTTP/1.1
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
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "admin_user",
        "role": "admin",
        "isActive": true,
        "createdAt": "2026-03-01T09:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "username": "general_user",
        "role": "user",
        "isActive": true,
        "createdAt": "2026-03-05T14:30:00Z"
      }
    ]
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| items[].id | string | 사용자 UUID |
| items[].username | string | 로그인 아이디 |
| items[].role | string | 역할 (`admin` / `user`) |
| items[].isActive | boolean | 활성 상태 |
| items[].createdAt | string | 계정 생성 일시 (ISO 8601) |

> 소규모 사용자 수를 가정하여 페이지네이션 없이 전체 목록을 반환한다.

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 | 관련 정책 |
|-----------|-----------|------|-----------|
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 | AUTH-R-012 |
| 403 | FORBIDDEN | 관리자 권한 필요 | AUTH-R-015 |

### 비즈니스 규칙
- 소프트 삭제된 사용자(`deleted_at IS NOT NULL`)는 목록에서 제외한다.
- `passwordHash` 필드는 응답에 절대 포함하지 않는다.

### 관련 기능
- CMN-AUTH-001 (사용자 계정 관리)
- CMN-SESSION-001 (인증 가드 - requireAdmin)

---

## USER-002 사용자 등록

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | POST |
| 경로 | /api/users |
| 인증 | 필요 |
| 권한 | admin |
| 설명 | 새 사용자 계정을 등록한다 (관리자 전용) |

### 요청

#### Request Body
```json
{
  "username": "string (로그인 아이디, 필수)",
  "password": "string (비밀번호, 필수)",
  "role": "string (역할, 선택, 기본값: 'user')"
}
```

| 필드 | 타입 | 필수 | 기본값 | 설명 | 유효성 규칙 |
|------|------|------|--------|------|-------------|
| username | string | ✅ | - | 로그인 아이디 | 4~20자, 영문소문자/숫자/_ (AUTH-R-003) |
| password | string | ✅ | - | 비밀번호 | 8자 이상, 영문자+숫자+특수문자 각 1자 이상 (AUTH-R-005, AUTH-R-006) |
| role | string | ❌ | "user" | 역할 | "admin" 또는 "user" |

#### 요청 예시
```http
POST /api/users HTTP/1.1
Content-Type: application/json
Cookie: mail-term-session=...

{
  "username": "new_user",
  "password": "********",
  "role": "user"
}
```

### 응답

#### 성공 응답 (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "username": "new_user",
    "role": "user",
    "isActive": true,
    "createdAt": "2026-03-15T10:00:00Z"
  },
  "message": "사용자가 등록되었습니다."
}
```

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 | 관련 정책 |
|-----------|-----------|------|-----------|
| 400 | INVALID_REQUEST | username 또는 password 누락 | - |
| 400 | VALIDATION_ERROR | 아이디 형식 또는 비밀번호 정책 위반 | AUTH-R-003, AUTH-R-005, AUTH-R-006 |
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 | AUTH-R-012 |
| 403 | FORBIDDEN | 관리자 권한 필요 | AUTH-R-002, AUTH-R-015 |
| 409 | CONFLICT | 이미 존재하는 아이디 | AUTH-R-004 |

#### 유효성 검증 에러 예시 (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 올바르지 않습니다.",
    "details": [
      { "field": "username", "message": "아이디는 4자 이상 20자 이하의 영문 소문자, 숫자, 언더스코어만 허용합니다." },
      { "field": "password", "message": "비밀번호는 영문자, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다." }
    ]
  }
}
```

### 비즈니스 규칙
- 관리자만 사용자를 등록할 수 있다 (AUTH-R-002).
- 아이디 유효성: 4~20자, 영문소문자/숫자/언더스코어만 허용 (AUTH-R-003).
- 아이디 고유성: 시스템 내 유일해야 하며, 소프트 삭제된 계정의 아이디도 재사용 불가 (AUTH-R-004).
- 비밀번호 정책: 8자 이상, 영문자+숫자+특수문자 각 1자 이상 (AUTH-R-005, AUTH-R-006).
- 비밀번호 저장: bcrypt (salt rounds: 10) 해싱 후 저장 (AUTH-R-007).
- `id`는 서버에서 `crypto.randomUUID()`로 생성한다.

### 관련 기능
- CMN-AUTH-001 (사용자 계정 등록)
- CMN-SESSION-001 (인증 가드 - requireAdmin)

---

## USER-003 사용자 삭제

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | DELETE |
| 경로 | /api/users/:id |
| 인증 | 필요 |
| 권한 | admin |
| 설명 | 사용자 계정을 소프트 삭제한다 (관리자 전용) |

### 요청

#### Path Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| id | string | ✅ | 삭제 대상 사용자 UUID |

#### 요청 예시
```http
DELETE /api/users/550e8400-e29b-41d4-a716-446655440001 HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": null,
  "message": "사용자가 삭제되었습니다."
}
```

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 | 관련 정책 |
|-----------|-----------|------|-----------|
| 400 | INVALID_REQUEST | 자기 자신은 삭제 불가 | - |
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 | AUTH-R-012 |
| 403 | FORBIDDEN | 관리자 권한 필요 | AUTH-R-015 |
| 404 | NOT_FOUND | 해당 사용자가 존재하지 않음 | - |

### 비즈니스 규칙
- 소프트 삭제: `deleted_at` 컬럼에 현재 타임스탬프를 설정한다 (POL-DATA DATA-R-015).
- 자기 자신의 계정은 삭제할 수 없다 (로그인 중인 관리자 보호).
- 이미 소프트 삭제된 사용자에 대한 요청은 404를 반환한다.
- 삭제된 사용자의 세션은 자연 만료될 때까지 유지된다 (별도 세션 무효화 미구현).

### 관련 기능
- CMN-AUTH-001 (사용자 계정 삭제)
- CMN-SESSION-001 (인증 가드 - requireAdmin)
