# API 인터페이스 정의 목록

## 개요

본 문서는 메일 수신 용어 해설 업무 지원 도구의 인터페이스 정의를 총괄합니다.
본 프로젝트는 Windows 데스크톱 애플리케이션(.NET 10)으로, 자체 REST API 서버를 노출하지 않으며, 외부 시스템(Microsoft Graph API, Claude API)을 **호출**하는 클라이언트 측 인터페이스와 내부 서비스 계층 간 인터페이스를 정의합니다.

### API 설계 원칙

- **외부 API 호출**: Microsoft Graph API, Anthropic Claude API의 공식 명세를 준수하며, 본 문서에서는 앱에서 사용하는 엔드포인트와 요청/응답 형식만 정의한다.
- **내부 서비스 인터페이스**: 앱 내부 서비스 계층 간 계약을 정의하여 구현 시 모듈 간 결합도를 낮춘다.
- **인증 정보 보호**: 모든 인증 정보(토큰, 시크릿)는 로그 및 응답 예시에 포함하지 않는다.
- **오류 처리 표준화**: 외부 API 호출 실패 시 재시도 정책(POL-AUTH, POL-MAIL 참조)을 일관되게 적용한다.

### 인터페이스 분류

| 분류 | 설명 |
|------|------|
| External - Graph API | Microsoft Graph API 호출 (메일 수신, 상태 변경) |
| External - Claude API | Anthropic Claude API 호출 (용어 해설 생성) |
| Internal - Config | 환경설정 읽기/쓰기 서비스 인터페이스 |
| Internal - Mail | 메일 수신 및 파일 저장 서비스 인터페이스 |
| Internal - Analysis | 용어 분석 및 사전 관리 서비스 인터페이스 |
| Internal - Dictionary | 용어 사전 조회/검색 서비스 인터페이스 |

### 인증 방식

| 대상 | 인증 방식 | 참조 |
|------|-----------|------|
| Microsoft Graph API | OAuth 2.0 Client Credentials Flow (Bearer Token) | POL-AUTH, AUTH-01 |
| Anthropic Claude API | API Key (`x-api-key` 헤더) | POL-AUTH, AUTH-04 |

### 공통 오류 처리 정책

- HTTP 429 (Rate Limit): `Retry-After` 헤더 값만큼 대기 후 재시도
- HTTP 401/403 (인증 실패): 토큰 갱신 후 재시도 (최대 3회)
- HTTP 5xx (서버 오류): 지수 백오프로 재시도 (최대 3회, 1초/2초/4초)
- 네트워크 오류: 다음 폴링 주기까지 대기

## 진행 상태 범례

- ✅ 정의 완료
- 🔄 검토 중
- 📋 정의 예정
- ⏸️ 보류

## API 목록

### External - Microsoft Graph API

| 코드 | 이름 | 메서드 | 경로 | 설명 | 상태 |
|------|------|--------|------|------|------|
| GRAPH-001 | OAuth 토큰 발급 | POST | /oauth2/v2.0/token | Azure AD 액세스 토큰 발급 | ✅ |
| GRAPH-002 | 메일 목록 조회 | GET | /v1.0/users/{userId}/mailFolders/{folderId}/messages | 메일함의 메일 목록 조회 | ✅ |
| GRAPH-003 | 메일 상세 조회 | GET | /v1.0/users/{userId}/messages/{messageId} | 개별 메일 내용 조회 | ✅ |
| GRAPH-004 | 메일 읽음 처리 | PATCH | /v1.0/users/{userId}/messages/{messageId} | 메일 읽음 상태 변경 | ✅ |
| GRAPH-005 | 메일함 폴더 조회 | GET | /v1.0/users/{userId}/mailFolders | 메일함 폴더 목록 조회 | ✅ |

### External - Anthropic Claude API

| 코드 | 이름 | 메서드 | 경로 | 설명 | 상태 |
|------|------|--------|------|------|------|
| CLAUDE-001 | 용어 해설 생성 | POST | /v1/messages | Claude API로 용어 해설 텍스트 생성 | ✅ |

### Internal - Config Service

| 코드 | 이름 | 설명 | 상태 |
|------|------|------|------|
| CFG-001 | 설정 읽기 | 앱 환경설정 값 조회 | ✅ |
| CFG-002 | 설정 저장 | 앱 환경설정 값 저장 | ✅ |
| CFG-003 | 설정 유효성 검증 | 설정 값의 범위/형식 검증 | ✅ |

### Internal - Mail Service

| 코드 | 이름 | 설명 | 상태 |
|------|------|------|------|
| MAIL-001 | 메일 수신 실행 | 메일함 폴링 및 신규 메일 수신 | ✅ |
| MAIL-002 | 메일 파일 저장 | 수신된 메일을 분석 요청 파일로 저장 | ✅ |
| MAIL-003 | 처리 이력 조회 | 처리 완료된 메일 Message ID 목록 조회 | ✅ |

### Internal - Analysis Service

| 코드 | 이름 | 설명 | 상태 |
|------|------|------|------|
| ANAL-001 | 배치 분석 실행 | 분석 요청 폴더의 파일 일괄 분석 | ✅ |
| ANAL-002 | 용어 추출 | 텍스트에서 업무 용어 추출 | ✅ |
| ANAL-003 | 해설 생성 요청 | 추출된 용어에 대한 해설 생성 | ✅ |

### Internal - Dictionary Service

| 코드 | 이름 | 설명 | 상태 |
|------|------|------|------|
| DICT-001 | 용어 검색 | 키워드로 용어 사전 검색 | ✅ |
| DICT-002 | 용어 상세 조회 | 용어 ID로 상세 정보 조회 | ✅ |
| DICT-003 | 용어 등록/갱신 | 신규 용어 등록 또는 기존 용어 갱신 | ✅ |
| DICT-004 | 인기 용어 조회 | 최근 빈도 높은 용어 목록 조회 | ✅ |
| DICT-005 | 사전 통계 조회 | 총 용어 수, 마지막 업데이트 시각 등 | ✅ |
| DICT-006 | 사전 백업 | 용어 사전 데이터 백업 생성 | ✅ |

## 문서 목록

| 파일명 | 그룹 | 설명 |
|--------|------|------|
| [api_graph.md](api_graph.md) | External - Graph API | Microsoft Graph API 호출 인터페이스 |
| [api_claude.md](api_claude.md) | External - Claude API | Anthropic Claude API 호출 인터페이스 |
| [api_config.md](api_config.md) | Internal - Config | 환경설정 서비스 인터페이스 |
| [api_mail.md](api_mail.md) | Internal - Mail | 메일 수신 서비스 인터페이스 |
| [api_analysis.md](api_analysis.md) | Internal - Analysis | 용어 분석 서비스 인터페이스 |
| [api_dictionary.md](api_dictionary.md) | Internal - Dictionary | 용어 사전 서비스 인터페이스 |
