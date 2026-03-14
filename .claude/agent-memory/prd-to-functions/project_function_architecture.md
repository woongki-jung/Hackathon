---
name: project_function_architecture
description: 메일 수신 용어 해설 웹 서비스의 기능 아키텍처 - Next.js 15 lib/ 레이어 기반, 공통 6개 + 도메인 18개 기능 정의 및 의존성 구조
type: project
---

기능 정의 완료: 공통 기능 6개 + 도메인 특화 로직 18개 = 총 24개 기능 (Next.js 15 웹 서비스)

**Why:** PRD와 5개 정책(POL-AUTH/MAIL/DATA/TERM/UI)의 모든 규칙을 Next.js 15 기반 기능으로 매핑하기 위해 설계됨

**How to apply:**
- 공통 기능(CMN-*): 인증(AUTH-001, bcrypt), 세션(SESSION-001, iron-session), 설정(CFG-001), HTTP 재시도(HTTP-001), 파일시스템(FS-001), 로깅(LOG-001)
- 도메인: 메일(MAIL-*) 3개, 데이터(DATA-*) 4개, 용어 분석(TERM-*) 7개, 뷰어(VIEW-*) 3개, 스케줄러(SCHED-001) 1개
- 의존성 방향: Infrastructure -> lib/ services -> API Route Handler
- 외부 연동: imapflow(IMAP 메일), @anthropic-ai/sdk(Claude API), node-cron(스케줄러)
- 핵심 오케스트레이터: TERM-BATCH-001이 SCHED-001에 의해 주기 호출, 전체 메일수신~분석 파이프라인 조율
- 삭제된 기능: CMN-SEC-001(DPAPI), CMN-NOTI-001(트레이 알림) - WPF에서 웹 전환으로 불필요
