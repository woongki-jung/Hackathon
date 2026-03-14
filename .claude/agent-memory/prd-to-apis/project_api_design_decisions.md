---
name: API 설계 주요 결정 사항
description: 메일 용어 해설 도구의 API 인터페이스 설계 시 내린 주요 결정 사항 및 구조
type: project
---

## API 인터페이스 구조

데스크톱 앱이므로 자체 REST API 서버를 노출하지 않음. 인터페이스를 두 가지로 분류:

1. **External API (외부 호출)**: 앱에서 외부 시스템을 호출하는 인터페이스
   - Microsoft Graph API (GRAPH-001~005): OAuth 토큰, 메일 조회/읽음처리, 폴더 조회
   - Anthropic Claude API (CLAUDE-001): 용어 해설 생성

2. **Internal Service (내부 서비스 계층)**: 앱 내부 모듈 간 계약
   - Config (CFG-001~003): 설정 읽기/저장/검증
   - Mail (MAIL-001~003): 메일 수신/파일저장/이력관리
   - Analysis (ANAL-001~003): 배치분석/용어추출/해설생성
   - Dictionary (DICT-001~006): 검색/상세/등록갱신/인기용어/통계/백업

**Why:** 데스크톱 앱은 클라이언트이므로 "호출하는 API"와 "내부 서비스 인터페이스"로 분리하는 것이 구현 시 모듈 간 결합도를 낮추는 데 유리함.

**How to apply:** 내부 서비스 인터페이스는 구현 시 C# interface로 직접 매핑 가능. 외부 API는 HttpClient 래퍼 서비스로 구현.

## 인증 패턴

- Graph API: OAuth 2.0 Client Credentials Flow, 토큰 만료 5분 전 자동 갱신
- Claude API: x-api-key 헤더, ANTHROPIC_API_KEY 환경변수
- 인증 정보는 설정 조회 API에서 연결 상태(boolean)만 반환, 시크릿 노출 금지

## 코드 채번 체계

그룹별 접두사 사용: GRAPH-, CLAUDE-, CFG-, MAIL-, ANAL-, DICT-
