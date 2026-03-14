---
name: tech-stack
description: 메일 용어 분석기 프로젝트의 기술 스택 및 아키텍처 결정 사항
type: project
---

수신 이메일의 업무 용어를 자동 분석하여 해설을 제공하는 Windows 데스크톱 업무 지원 도구이다.

**Why:** ROADMAP.md의 기술 아키텍처 결정 사항에 명시된 내용이다.

**How to apply:** 구현 계획 수립 시 해당 기술 스택을 일관되게 적용한다.

## 기술 스택

| 항목 | 선택 |
|------|------|
| 런타임 | .NET 10 (.NET 9 LTS fallback 준비) |
| UI 프레임워크 | WinUI 3 (Windows App SDK) |
| 트레이 아이콘 | H.NotifyIcon.WinUI |
| MVVM | CommunityToolkit.Mvvm |
| 메일 연동 | Microsoft Graph API (OAuth2 Client Credentials) |
| 용어 해설 엔진 | Anthropic Claude API |
| 데이터 저장 | SQLite (EF Core) |
| 설정 저장 | appsettings.json + 환경변수, 민감정보 DPAPI 암호화 |
| 프로젝트 구조 | Clean Architecture 간소화 (App / Core / Infrastructure) |
| 테스트 프레임워크 | xUnit + FluentAssertions + Moq |

## 솔루션 구조

```
MailTermAnalyzer.sln
  src/MailTermAnalyzer.App         # WinUI 3 앱
  src/MailTermAnalyzer.Core        # 비즈니스 로직, 모델
  src/MailTermAnalyzer.Infrastructure  # 외부 연동 (Graph API, Claude API, DB)
  tests/MailTermAnalyzer.Tests     # xUnit 단위/통합 테스트
```

## 환경변수 목록 (CLAUDE.local.md 정의)

- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- `MAIL_USER_EMAIL`, `MAIL_MAILBOX_NAME`
- `MAIL_POLL_INTERVAL_SECONDS` (기본 60, 최소 30, 최대 3600)
- `MAIL_FETCH_UNREAD_ONLY` (기본 true)
- `MAIL_MAX_FETCH_COUNT` (기본 50)
- `OUTPUT_ANALYSIS_DIR`
- `ANTHROPIC_API_KEY`
- `GRAPH_API_BASE_URL` (기본 https://graph.microsoft.com/v1.0)
