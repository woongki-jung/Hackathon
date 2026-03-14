---
name: project_function_architecture
description: 메일 수신 용어 해설 도구의 기능 아키텍처 - 공통 7개, 도메인 특화 17개 기능 정의 및 의존성 구조
type: project
---

기능 정의 완료: 공통 기능 7개 + 도메인 특화 로직 17개 = 총 24개 기능

**Why:** PRD와 5개 정책(POL-AUTH/MAIL/DATA/TERM/UI)의 모든 규칙을 기능으로 매핑하기 위해 설계됨

**How to apply:**
- 공통 기능(CMN-*): 인증(AUTH-001), 암호화(SEC-001), 설정(CFG-001), HTTP 재시도(HTTP-001), 파일시스템(FS-001), 로깅(LOG-001), 알림(NOTI-001)
- 도메인: 메일 수신(MAIL-*) 3개, 데이터 저장(DATA-*) 4개, 용어 분석(TERM-*) 6개, 뷰어(VIEW-*) 3개
- 의존성 방향: Infrastructure -> Application -> Domain (단방향)
- 외부 연동: Microsoft Graph API (메일), Claude API (해설 생성), Windows DPAPI (암호화)
- 핵심 오케스트레이터: TERM-BATCH-001 (배치 분석)이 가장 많은 기능을 조합
