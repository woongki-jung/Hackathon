---
name: project-overview
description: 메일 수신 용어 해설 업무 지원 도구 프로젝트의 핵심 정보 및 기술 스택
type: project
---

프로젝트: 메일 수신 용어 해설 업무 지원 웹 서비스 (EMR/의료 도메인)

**Why:** 업무 수행 과정에서 다양한 용어에 대한 이해도를 높여 소통을 원활히 하기 위한 도구

**How to apply:**
- 기술 스택: Next.js 15 (App Router), better-sqlite3 + Drizzle ORM, iron-session, bcrypt, imapflow, @anthropic-ai/sdk, node-cron, Tailwind CSS
- 주요 기능: 웹 로그인, 환경설정, 서비스 상태 조회, 업무지원(메일 분석 결과), 용어사전 뷰어
- 백엔드: IMAP 메일 수신, Claude API 용어 분석, node-cron 스케줄러
- 데이터 저장: SQLite(./data/app.db), 메일 임시파일(./data/mails), 용어 해설집(./data/terms)
- 2026-03-15 기준 정책 정의 문서(POL-AUTH, POL-MAIL, POL-DATA, POL-TERM, POL-UI) Next.js 기반으로 재작성 완료
- 인증: iron-session 쿠키 세션, bcrypt 비밀번호 해싱, 관리자/일반사용자 2역할
- 환경변수: .env.local로 민감정보 관리
