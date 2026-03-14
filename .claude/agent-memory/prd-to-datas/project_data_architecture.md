---
name: project_data_architecture
description: 메일 용어 해설 도구의 데이터 아키텍처 - 6개 엔티티, SQLite 기반, FTS5 검색
type: project
---

메일 수신 용어 해설 업무 지원 도구의 데이터 모델을 SQLite 3 기반으로 설계 완료.

**핵심 엔티티 6개:**
- DATA-001 AppSettings (app_settings): 환경설정 키-값 저장소
- DATA-002 MailProcessingLog (mail_processing_logs): 메일 처리 기록, 중복 방지
- DATA-003 Term (terms): 용어 사전 핵심 엔티티, 소프트 삭제 적용, FTS5 전문검색
- DATA-004 TermSourceFile (term_source_files): 용어 출처 파일 (Term 하위, 최대 10건)
- DATA-005 StopWord (stop_words): 불용어 목록
- DATA-006 AnalysisQueue (analysis_queue): Claude API 호출 대기/재시도 큐

**주요 설계 결정:**
- DB 기술: SQLite 3 (POL-DATA에서 "JSON 또는 SQLite" 명시)
- 소프트 삭제: terms 테이블만 적용 (deleted_at)
- 검색: FTS5 가상 테이블로 용어/해설 전문 검색 지원
- 개인정보: 메일 본문은 DB에 저장하지 않고 파일로만 관리
- 인증정보: DB에 저장하지 않음 (환경변수/Credential Manager)
- PRAGMA foreign_keys = ON 필수

**Why:** PRD가 로컬 데스크톱 앱(.NET 10, Windows 11)이므로 SQLite가 적합하며, POL-DATA에서도 이를 명시함.
**How to apply:** 스프린트 구현 시 EF Core SQLite Provider 또는 Microsoft.Data.Sqlite를 사용하고, FTS5 트리거 동기화를 빠뜨리지 않도록 주의.
