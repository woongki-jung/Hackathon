# POL-AUTH: 인증 및 보안 정책

## 정책 개요

| 항목 | 내용 |
|------|------|
| 정책 코드 | POL-AUTH |
| 정책명 | 인증 및 보안 정책 |
| 적용 대상 | Microsoft Graph API 인증, 계정 정보 저장, API 키 관리 |
| 관련 PRD 기능 | 환경설정 기능, 메일 수신 기능 |

## 정책 상세

### AUTH-01: Microsoft Graph API 인증 방식

- Microsoft Graph API를 통해 메일함에 접근한다.
- OAuth 2.0 Client Credentials Flow를 사용하여 인증한다.
- 필수 인증 파라미터:
  - `AZURE_TENANT_ID`: Azure AD 테넌트 ID
  - `AZURE_CLIENT_ID`: Azure AD 애플리케이션 ID
  - `AZURE_CLIENT_SECRET`: 클라이언트 시크릿 값
- Azure AD 앱 등록 시 `Mail.Read` 권한(Application 타입)을 부여해야 한다.

### AUTH-02: 인증 정보 저장 정책

- 인증 정보(테넌트 ID, 클라이언트 ID, 클라이언트 시크릿)는 환경변수 또는 암호화된 설정 파일에 저장한다.
- 평문으로 설정 파일에 기록하지 않는다.
- Windows Credential Manager 또는 DPAPI(Data Protection API)를 활용한 암호화 저장을 권장한다.
- 설정 파일이 소스코드 저장소에 포함되지 않도록 `.gitignore`에 등록한다.

### AUTH-03: 토큰 관리 정책

- Access Token의 유효 기간은 Microsoft에서 발급한 `expires_in` 값을 따른다 (일반적으로 3600초).
- 토큰 만료 5분 전에 자동으로 갱신한다.
- 토큰 갱신 실패 시 최대 3회 재시도하며, 실패 시 로그에 기록하고 다음 폴링 주기에 재시도한다.

### AUTH-04: Claude API 인증 정책

- 용어 해설 생성을 위한 Claude API 호출 시, API 키는 환경변수로 관리한다.
- API 키는 `ANTHROPIC_API_KEY` 환경변수에 저장한다.
- API 호출 실패 시 지수 백오프(Exponential Backoff)로 재시도한다 (최대 3회, 1초/2초/4초 간격).

## 제약 사항

- 인증 정보는 메모리에서 사용 후 즉시 참조를 해제하여 메모리 덤프로부터 보호한다.
- 로그에 인증 정보(시크릿, 토큰 등)를 절대 출력하지 않는다.
- 디버그 모드에서도 인증 관련 값은 마스킹(`***`) 처리하여 출력한다.
