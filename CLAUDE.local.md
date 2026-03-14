# 시스템 상수 정의

## Microsoft 365 / Outlook 연동 환경변수

### Microsoft Graph API 인증 (Azure AD 앱 등록 필요)
- `AZURE_TENANT_ID`: Azure AD 테넌트 ID (디렉터리 ID)
- `AZURE_CLIENT_ID`: Azure AD 앱 등록 시 발급되는 클라이언트 ID (애플리케이션 ID)
- `AZURE_CLIENT_SECRET`: Azure AD 앱 등록 시 발급되는 클라이언트 시크릿 값

### 메일 계정 정보
- `MAIL_USER_EMAIL`: 메일을 수신할 Microsoft 365 계정 이메일 주소
- `MAIL_MAILBOX_NAME`: 모니터링할 메일함 이름 (기본값: Inbox)

### 메일 수신 설정
- `MAIL_POLL_INTERVAL_SECONDS`: 메일함 확인 주기 (단위: 초, 기본값: 60)
- `MAIL_FETCH_UNREAD_ONLY`: 읽지 않은 메일만 가져올지 여부 (true/false)
- `MAIL_MAX_FETCH_COUNT`: 1회 조회 시 가져올 최대 메일 수 (기본값: 50)

### 파일 저장 경로
- `OUTPUT_ANALYSIS_DIR`: 분석 요청 폴더 경로 (메일 내용을 텍스트로 저장할 디렉터리)

### Microsoft Graph API 엔드포인트
- `GRAPH_API_BASE_URL`: Microsoft Graph API 기본 URL (기본값: https://graph.microsoft.com/v1.0)