# 정책 정의 총괄 문서

## 개요

본 문서는 `docs/PRD.md`에 정의된 메일 수신 용어 해설 업무 지원 도구의 서비스 정책을 정의합니다.
각 정책은 개별 문서로 상세 내용을 관리하며, 본 문서는 정책 목록과 상호 관계를 총괄합니다.

## 정책 목록

| 정책 코드 | 정책명 | 설명 | 문서 |
|-----------|--------|------|------|
| POL-AUTH | 인증 및 보안 정책 | 메일 계정 인증 정보 보호 및 API 인증 관련 정책 | [policy_pol-auth.md](policy_pol-auth.md) |
| POL-MAIL | 메일 수신 정책 | 메일함 모니터링 주기, 수신 범위, 처리 규칙 | [policy_pol-mail.md](policy_pol-mail.md) |
| POL-DATA | 데이터 저장 정책 | 메일 텍스트 저장 형식, 경로, 파일 명명 규칙 | [policy_pol-data.md](policy_pol-data.md) |
| POL-TERM | 용어 분석 정책 | 용어 분류 기준, 해설 생성 규칙, 사전 관리 정책 | [policy_pol-term.md](policy_pol-term.md) |
| POL-UI | UI/UX 정책 | 트레이 동작 규칙, 뷰어 표시 규칙, 검색 정책 | [policy_pol-ui.md](policy_pol-ui.md) |

## 정책 간 의존 관계

```
POL-AUTH ──> POL-MAIL ──> POL-DATA ──> POL-TERM
                                          │
POL-UI <──────────────────────────────────┘
```

- **POL-AUTH**: 모든 외부 통신의 전제 조건 (메일 서버 접속, Claude API 호출)
- **POL-MAIL**: POL-AUTH의 인증 정보를 사용하여 메일을 수신
- **POL-DATA**: POL-MAIL에서 수신한 메일을 저장하는 규칙 정의
- **POL-TERM**: POL-DATA에 저장된 파일을 분석하여 용어 사전 생성
- **POL-UI**: POL-TERM의 용어 사전 데이터를 사용자에게 표시

## 기술 환경 전제

- 실행 환경: Windows 11 이상
- 런타임: .NET 10
- 메일 프로토콜: Microsoft Graph API (Microsoft 365 / Outlook)
- AI 해설 생성: Claude Code API
