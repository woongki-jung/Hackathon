---
name: mail-term-analyzer-project
description: 메일 수신 업무용어 분석 데스크톱 앱 프로젝트 - WinUI 3 + .NET 10, M365 Graph API, Claude API, SQLite
type: project
---

메일 수신 -> 용어 추출 -> Claude 해설 생성 -> 용어사전 뷰어 제공하는 Windows 데스크톱 도구.

**Why:** 업무 중 이메일에 포함된 EMR/비즈니스 용어의 이해도를 높여 소통을 개선하기 위한 도구.

**How to apply:**
- 기술 스택: WinUI 3 (Windows App SDK), .NET 10, Microsoft Graph API, Anthropic Claude API, SQLite + EF Core
- 3 Phase / 6 Sprint 계획, 소규모 팀 (2-4명)
- Phase 1: 트레이 앱 + 환경설정 + 메일 수신
- Phase 2: 파일 감시 + 용어 추출/분류 + Claude 해설 생성 + DB 적재
- Phase 3: 용어사전 뷰어(검색/목록) + 통합 안정화
- ROADMAP.md 최초 생성일: 2026-03-13
