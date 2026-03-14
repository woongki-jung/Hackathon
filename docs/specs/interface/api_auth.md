# Auth API 정의

## 개요
- 사용자 로그인/로그아웃 및 현재 세션 조회 API를 정의한다.
- iron-session 기반 암호화 쿠키 세션을 사용한다.
- 관련 도메인 객체: User (DATA-001)
- 관련 기능: CMN-AUTH-001 (웹 로그인 인증), CMN-SESSION-001 (세션 관리)
- 관련 정책: POL-AUTH

---

## AUTH-001 로그인

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | POST |
| 경로 | /api/auth/login |
| 인증 | 불필요 |
| 권한 | - |
| 설명 | 아이디/비밀번호로 로그인하여 세션 쿠키를 발급한다 |

### 요청

#### Request Body
```json
{
  "username": "string (로그인 아이디, 필수)",
  "password": "string (비밀번호, 필수)"
}
```

| 필드 | 타입 | 필수 | 설명 | 유효성 규칙 |
|------|------|------|------|-------------|
| username | string | ✅ | 로그인 아이디 | 4~20자, 영문소문자/숫자/_ (AUTH-R-003) |
| password | string | ✅ | 비밀번호 | 8자 이상 (AUTH-R-005) |

#### 요청 예시
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "username": "admin_user",
  "password": "********"
}
```

### 응답

#### 성공 응답 (200 OK)

로그인 성공 시 응답 헤더에 `Set-Cookie`로 iron-session 암호화 쿠키가 설정된다.

```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin_user",
    "role": "admin"
  },
  "message": "로그인 성공"
}
```

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 | 관련 정책 |
|-----------|-----------|------|-----------|
| 400 | INVALID_REQUEST | username 또는 password 누락 | - |
| 401 | UNAUTHORIZED | "아이디 또는 비밀번호가 일치하지 않습니다" | AUTH-R-011 |

> AUTH-R-011에 따라 아이디/비밀번호 중 어느 쪽이 틀렸는지 구분하지 않는 통합 메시지를 반환한다.

### 비즈니스 규칙
- bcrypt로 해싱된 비밀번호와 비교한다 (AUTH-R-007).
- 소프트 삭제된 사용자(`deleted_at IS NOT NULL`) 또는 비활성 사용자(`is_active = 0`)는 로그인 불가.
- 로그인 성공 시 iron-session을 통해 암호화된 HTTP-only 쿠키에 세션 데이터를 저장한다 (AUTH-R-009).
- 세션 유효 기간은 24시간이다 (AUTH-R-010).

### 관련 기능
- CMN-AUTH-001 (웹 로그인 인증)
- CMN-SESSION-001 (세션 생성)

---

## AUTH-002 로그아웃

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | POST |
| 경로 | /api/auth/logout |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 현재 세션을 삭제하여 로그아웃한다 |

### 요청

Request Body 없음.

#### 요청 예시
```http
POST /api/auth/logout HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK)

응답 헤더에 세션 쿠키 삭제를 위한 `Set-Cookie`가 설정된다.

```json
{
  "success": true,
  "data": null,
  "message": "로그아웃 완료"
}
```

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 |

### 비즈니스 규칙
- iron-session의 destroySession을 호출하여 세션 쿠키를 삭제한다.

### 관련 기능
- CMN-SESSION-001 (세션 삭제)

---

## AUTH-003 현재 사용자 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/auth/me |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 현재 로그인된 사용자의 세션 정보를 반환한다 |

### 요청

파라미터 없음.

#### 요청 예시
```http
GET /api/auth/me HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin_user",
    "role": "admin"
  }
}
```

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 |

### 비즈니스 규칙
- 세션 쿠키에서 사용자 정보를 복호화하여 반환한다.
- DB 조회 없이 세션 데이터만으로 응답한다 (빠른 응답).
- 프론트엔드에서 페이지 로드 시 인증 상태 확인에 사용한다.

### 관련 기능
- CMN-SESSION-001 (세션 검증)
