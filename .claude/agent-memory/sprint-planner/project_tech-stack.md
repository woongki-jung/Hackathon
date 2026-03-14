---
name: tech-stack
description: 메일 용어 분석기 프로젝트의 기술 스택 및 아키텍처 결정 사항 (Next.js 웹 서비스)
type: project
---

수신 이메일의 업무 용어를 자동 분석하여 해설을 제공하는 웹 서비스이다.

**Why:** ROADMAP.md의 기술 아키텍처 결정 사항에 명시된 내용이다. 이전 .NET/WinUI3 기반에서 Next.js 웹 서비스로 기술 스택이 전환되었다.

**How to apply:** 구현 계획 수립 시 해당 기술 스택을 일관되게 적용한다.

## 기술 스택

| 항목 | 선택 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.1.6 (ROADMAP에 15 명시이나 실제 16.1.6 설치) |
| 언어 | TypeScript | ^5 |
| DB | SQLite (better-sqlite3) | ^12.8.0 |
| ORM | Drizzle ORM + drizzle-kit | ^0.45.1 / ^0.31.9 |
| 인증 | iron-session + bcrypt | ^8.0.4 / ^6.0.0 |
| 스타일 | Tailwind CSS | ^4 |
| 메일 수신 | imapflow | ^1.2.13 |
| AI 분석 | @anthropic-ai/sdk | ^0.78.0 |
| 스케줄러 | node-cron | ^4.2.1 |
| 검색 | SQLite FTS5 | 내장 |

## 프로젝트 구조

```
domain-dictionary/          # Next.js 프로젝트 루트
├── src/
│   ├── app/               # App Router 페이지
│   │   ├── (authenticated)/  # 인증 필요 레이아웃 그룹
│   │   └── login/           # 로그인 화면
│   ├── db/
│   │   ├── schema.ts        # Drizzle 스키마 (7개 테이블)
│   │   └── index.ts         # DB 연결 싱글톤
│   ├── lib/                 # 공통 유틸리티
│   └── instrumentation.ts   # 서버 초기화 훅
├── drizzle/                 # 마이그레이션 파일
├── data/
│   └── app.db              # SQLite DB 파일
└── drizzle.config.ts        # drizzle-kit 설정
```

## 환경변수 목록 (CLAUDE.local.md 정의)

- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — 초기 관리자 계정
- `DATABASE_PATH` — SQLite DB 파일 경로 (기본: ./data/app.db)
- `MAIL_IMAP_HOST`, `MAIL_IMAP_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_USE_SSL`
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- `MAIL_CHECK_INTERVAL` — 메일 확인 주기 (ms)
- `SESSION_SECRET` — iron-session 암호화 키 (32자 이상)

## 데이터 모델 (7개 테이블)

| 테이블 | 용도 |
|--------|------|
| users | 사용자 (admin/user 역할, 소프트 삭제) |
| app_settings | 키-값 형태 앱 설정 |
| mail_processing_logs | 메일 수신/처리 이력 |
| terms | 추출된 용어 사전 |
| term_source_files | 용어 출처 메일 정보 |
| stop_words | 불용어 목록 |
| analysis_queue | 메일 분석 대기열 |
