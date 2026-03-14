# API 인터페이스 정의 목록

## 개요

### API 설계 원칙
- Next.js 15 App Router의 Route Handlers (`app/api/`)를 사용하여 REST API를 제공한다.
- 리소스 중심의 RESTful 설계를 기본으로 하되, CRUD로 표현하기 어려운 비즈니스 액션은 동사형 경로를 허용한다.
- 모든 API는 HTTPS 전용이며, JSON 형식으로 요청/응답한다.
- 멱등성: GET, PUT, DELETE는 멱등성을 보장한다.

### 기본 URL
- Base URL: `/api`
- 버전 관리: 현재 버전 접두사 없음 (v1 불필요, 단일 서비스 내부 API)

### 인증 방식
- **iron-session** 기반 암호화 HTTP-only 쿠키 세션 (POL-AUTH AUTH-R-009)
- 세션 유효 기간: 24시간 (POL-AUTH AUTH-R-010)
- 세션 데이터: `{ userId: string, username: string, role: "admin" | "user" }`
- 미인증 접근 시: API는 401 Unauthorized 반환 (POL-AUTH AUTH-R-012)

### 역할 기반 접근 제어
| 역할 | 설명 | 접근 범위 |
|------|------|-----------|
| admin | 관리자 | 모든 API |
| user | 일반 사용자 | 조회 API (용어사전, 분석 결과, 서비스 상태) |

### 인증 불필요 엔드포인트
- `POST /api/auth/login` - 로그인
- `GET /api/health` - 헬스체크 (POL-AUTH 예외 사항)

---

## 진행 상태 범례
- ✅ 정의 완료
- 🔄 검토 중
- 📋 정의 예정
- ⏸️ 보류

## API 목록

### 인증 (Auth)

| 코드 | 이름 | 그룹 | 메서드 | 경로 | 인증 | 권한 | 상태 |
|------|------|------|--------|------|------|------|------|
| AUTH-001 | 로그인 | Auth | POST | /api/auth/login | 불필요 | - | ✅ |
| AUTH-002 | 로그아웃 | Auth | POST | /api/auth/logout | 필요 | all | ✅ |
| AUTH-003 | 현재 사용자 조회 | Auth | GET | /api/auth/me | 필요 | all | ✅ |

### 사용자 관리 (User)

| 코드 | 이름 | 그룹 | 메서드 | 경로 | 인증 | 권한 | 상태 |
|------|------|------|--------|------|------|------|------|
| USER-001 | 사용자 목록 조회 | User | GET | /api/users | 필요 | admin | ✅ |
| USER-002 | 사용자 등록 | User | POST | /api/users | 필요 | admin | ✅ |
| USER-003 | 사용자 삭제 | User | DELETE | /api/users/:id | 필요 | admin | ✅ |

### 환경설정 (Config)

| 코드 | 이름 | 그룹 | 메서드 | 경로 | 인증 | 권한 | 상태 |
|------|------|------|--------|------|------|------|------|
| CFG-001 | 환경설정 조회 | Config | GET | /api/config | 필요 | admin | ✅ |
| CFG-002 | 환경설정 수정 | Config | PUT | /api/config | 필요 | admin | ✅ |
| CFG-003 | 메일 서버 연결 테스트 | Config | POST | /api/config/test-mail | 필요 | admin | ✅ |

### 메일 (Mail)

| 코드 | 이름 | 그룹 | 메서드 | 경로 | 인증 | 권한 | 상태 |
|------|------|------|--------|------|------|------|------|
| MAIL-001 | 서비스 상태 조회 | Mail | GET | /api/mail/status | 필요 | all | ✅ |
| MAIL-002 | 수동 메일 확인 트리거 | Mail | POST | /api/mail/check | 필요 | admin | ✅ |

### 분석 결과 (Analysis)

| 코드 | 이름 | 그룹 | 메서드 | 경로 | 인증 | 권한 | 상태 |
|------|------|------|--------|------|------|------|------|
| ANAL-001 | 최신 분석 결과 조회 | Analysis | GET | /api/analysis/latest | 필요 | all | ✅ |
| ANAL-002 | 분석 이력 조회 | Analysis | GET | /api/analysis/history | 필요 | all | ✅ |

### 용어사전 (Dictionary)

| 코드 | 이름 | 그룹 | 메서드 | 경로 | 인증 | 권한 | 상태 |
|------|------|------|--------|------|------|------|------|
| DICT-001 | 용어 검색 | Dictionary | GET | /api/dictionary/search | 필요 | all | ✅ |
| DICT-002 | 빈도 트렌드 조회 | Dictionary | GET | /api/dictionary/trending | 필요 | all | ✅ |
| DICT-003 | 용어 상세 조회 | Dictionary | GET | /api/dictionary/terms/:id | 필요 | all | ✅ |

### 외부 연동 (External)

| 코드 | 이름 | 그룹 | 메서드 | 경로 | 인증 | 권한 | 상태 |
|------|------|------|--------|------|------|------|------|
| CLAUDE-001 | Claude API 호출 | External | - | (서버 사이드 전용) | - | - | ✅ |

---

## 공통 규격

### 요청 헤더

| 헤더 | 값 | 필수 | 설명 |
|------|-----|------|------|
| Content-Type | application/json | 조건부 | POST/PUT 요청 시 필수 |
| Cookie | mail-term-session=... | 자동 | iron-session 세션 쿠키 (브라우저 자동 전송) |

> 별도의 `Authorization` 헤더는 사용하지 않는다. iron-session은 암호화된 쿠키 기반이므로 브라우저가 자동으로 세션 쿠키를 전송한다.

### 성공 응답 구조

```json
{
  "success": true,
  "data": { ... },
  "message": "처리 완료"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| success | boolean | ✅ | 항상 `true` |
| data | object / array / null | ✅ | 응답 데이터 (데이터 없는 경우 `null`) |
| message | string | ❌ | 사용자에게 표시할 메시지 (선택) |

### 목록 조회 응답 구조 (페이지네이션)

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 150,
      "totalPages": 8
    }
  }
}
```

### 에러 응답 구조

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "요청 파라미터가 올바르지 않습니다.",
    "details": [ ... ]
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| success | boolean | ✅ | 항상 `false` |
| error.code | string | ✅ | 에러 코드 (아래 에러 코드 체계 참조) |
| error.message | string | ✅ | 사용자 친화적 에러 메시지 (POL-UI UI-R-019) |
| error.details | array | ❌ | 유효성 검증 상세 (필드별 오류 목록) |

### 에러 코드 체계

| HTTP 상태 코드 | 에러 코드 | 설명 | 관련 정책 |
|---------------|-----------|------|-----------|
| 400 | INVALID_REQUEST | 요청 파라미터 유효성 오류 | - |
| 400 | VALIDATION_ERROR | 비즈니스 규칙 위반 (비밀번호 정책 등) | POL-AUTH AUTH-R-005, AUTH-R-006 |
| 401 | UNAUTHORIZED | 인증 실패 또는 세션 만료 | POL-AUTH AUTH-R-011, AUTH-R-012 |
| 403 | FORBIDDEN | 권한 없음 (역할 부족) | POL-AUTH AUTH-R-002, AUTH-R-014, AUTH-R-015 |
| 404 | NOT_FOUND | 리소스를 찾을 수 없음 | - |
| 409 | CONFLICT | 리소스 충돌 (중복 아이디 등) | POL-AUTH AUTH-R-004 |
| 500 | INTERNAL_ERROR | 서버 내부 오류 | - |
| 503 | SERVICE_UNAVAILABLE | 외부 서비스 연결 실패 (IMAP, Claude API) | POL-MAIL MAIL-R-003, POL-TERM TERM-R-007 |

### 상태 코드 사용 규칙

| 상태 코드 | 사용 상황 |
|-----------|-----------|
| 200 OK | 조회 성공, 수정 성공, 삭제 성공 |
| 201 Created | 리소스 생성 성공 (사용자 등록) |
| 400 Bad Request | 유효성 검증 실패 |
| 401 Unauthorized | 미인증 또는 세션 만료 |
| 403 Forbidden | 역할 기반 권한 부족 |
| 404 Not Found | 리소스 없음 |
| 409 Conflict | 고유 제약 위반 |
| 500 Internal Server Error | 서버 내부 오류 |
| 503 Service Unavailable | 외부 서비스 연결 실패 |

### 페이지네이션 표준

목록 조회 API에 적용되는 공통 Query Parameters:

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| page | number | ❌ | 1 | 페이지 번호 (1부터 시작) |
| limit | number | ❌ | 20 | 페이지당 항목 수 (최대 100) |

> 페이지네이션이 적용되는 API: ANAL-002 (분석 이력), DICT-001 (용어 검색)

### 정렬 표준

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| sort | string | ❌ | API별 상이 | 정렬 기준 필드 |
| order | string | ❌ | desc | 정렬 방향 (`asc` / `desc`) |

### 공통 날짜/시간 형식
- 모든 날짜/시간은 ISO 8601 형식으로 전송/반환한다. (예: `2026-03-15T09:30:00Z`)
- 프론트엔드 표시 시 "YYYY-MM-DD HH:mm" 형식으로 변환한다 (POL-UI UI-R-015).
