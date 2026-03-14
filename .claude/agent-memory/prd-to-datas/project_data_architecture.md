---
name: project_data_architecture
description: 메일 용어 해설 도구의 데이터 아키텍처 - 7개 엔티티, SQLite(better-sqlite3+Drizzle ORM), FTS5, Next.js 15 웹 서비스
type: project
---

메일 수신 용어 해설 업무 지원 웹 서비스의 데이터 모델을 SQLite + Drizzle ORM 기반으로 설계 완료.

**핵심 엔티티 7개:**
- DATA-001 User (users): 사용자 계정 (admin/user 역할), 소프트 삭제 적용
- DATA-002 AppSetting (app_settings): 환경설정 키-값 저장소, IMAP 설정 키 방식 (mail.imap.host 등)
- DATA-003 MailProcessingLog (mail_processing_logs): 메일 수신/분석 처리 이력, 90일 보존 후 하드 삭제
- DATA-004 Term (terms): 용어 사전 핵심 엔티티, FTS5 전문검색, 영구 보존
- DATA-005 TermSourceFile (term_source_files): 용어 출처 메일 파일 (Term과 N:1)
- DATA-006 StopWord (stop_words): 불용어 목록
- DATA-007 AnalysisQueue (analysis_queue): 메일 분석 대기열 및 결과(요약, 후속 작업), 영구 보존

**주요 설계 결정:**
- DB 기술: SQLite (better-sqlite3 드라이버 + Drizzle ORM)
- DB 경로: ./data/app.db (DATABASE_PATH 환경변수)
- 소프트 삭제: users만 적용 (deleted_at)
- 하드 삭제: mail_processing_logs (90일), 메일 임시 파일 (30일)
- 영구 보존: terms, term_source_files, analysis_queue, 용어 .md 파일
- 검색: FTS5 가상 테이블 + 트리거 동기화
- 인증: bcrypt 해싱 (users.password_hash), iron-session 쿠키
- 민감정보: IMAP 비밀번호/Claude API 키는 DB 미저장 (.env.local만)
- PRAGMA foreign_keys = ON 필수

**개인정보 필드:**
- users.username, users.password_hash
- app_settings의 mail.imap.username 키

**Why:** Next.js 15 웹 서비스로 전환된 PRD, better-sqlite3 + Drizzle ORM 기술 스택
**How to apply:** 스프린트 구현 시 Drizzle ORM 스키마와 마이그레이션에 이 설계를 반영하고, FTS5 트리거 동기화를 raw SQL 마이그레이션으로 처리
