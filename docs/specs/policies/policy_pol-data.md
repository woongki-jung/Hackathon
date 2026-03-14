# POL-DATA: 데이터 저장 정책

## 정책 개요

| 항목 | 내용 |
|------|------|
| 정책 코드 | POL-DATA |
| 정책명 | 데이터 저장 정책 |
| 적용 대상 | 메일 텍스트 파일 저장, 용어 사전 데이터 저장 |
| 관련 PRD 기능 | 메일 수신 기능, 용어사전 생성 기능 |
| 의존 정책 | POL-MAIL |

## 정책 상세

### DATA-01: 분석 요청 파일 저장 경로

- 메일 내용은 `OUTPUT_ANALYSIS_DIR` 환경변수에 지정된 디렉터리에 저장한다.
- 기본값: 앱 실행 경로 하위 `AnalysisRequests/` 디렉터리
- 디렉터리가 존재하지 않는 경우 자동으로 생성한다.
- 경로에 한글 또는 공백이 포함되어도 정상 동작해야 한다.

### DATA-02: 분석 요청 파일 명명 규칙

- 파일명 형식: `{수신일시}_{MessageID해시}.txt`
  - 수신일시: `yyyyMMdd_HHmmss` 형식
  - MessageID해시: Message ID의 SHA256 해시 앞 8자리
  - 예시: `20260313_143022_a1b2c3d4.txt`
- 동일 파일명이 존재하는 경우 덮어쓰지 않고 건너뛴다 (이미 처리된 메일로 판단).

### DATA-03: 분석 요청 파일 내용 형식

```
---
subject: {메일 제목}
from: {발신자 이메일}
received_at: {수신 일시 ISO 8601}
message_id: {메일 Message ID}
---

{메일 본문 텍스트}
```

- YAML frontmatter 형식의 메타데이터 영역과 본문 영역을 `---` 구분자로 분리한다.
- 인코딩: UTF-8 (BOM 없음)

### DATA-04: 용어 사전 데이터 저장

- 용어 사전은 로컬 파일 기반으로 저장한다 (JSON 또는 SQLite).
- 저장 경로: 앱 실행 경로 하위 `Dictionary/` 디렉터리
- 용어 사전 항목 구조:
  - `term`: 용어 원문
  - `category`: 분류 (EMR / Business / Abbreviation)
  - `description`: 해설 텍스트
  - `source_count`: 발견 횟수
  - `first_seen_at`: 최초 발견 일시
  - `last_seen_at`: 최근 발견 일시
  - `source_files`: 출처 파일 목록 (최대 10건)

### DATA-05: 데이터 백업 정책

- 용어 사전 데이터는 앱 종료 시 자동으로 백업 파일을 생성한다.
- 백업 파일 경로: `Dictionary/backup/dictionary_{yyyyMMdd_HHmmss}.bak`
- 백업 파일은 최근 7개만 유지하며, 초과 시 가장 오래된 파일을 삭제한다.

### DATA-06: 분석 완료 파일 관리

- 분석이 완료된 파일은 `OUTPUT_ANALYSIS_DIR` 하위 `Processed/` 디렉터리로 이동한다.
- 이동 실패 시 파일을 유지하되, 처리 완료 상태를 별도 메타 파일에 기록한다.

## 제약 사항

- 파일 시스템 접근 권한이 없는 경우 앱 시작 시 경고를 표시하고 해당 기능을 비활성화한다.
- 디스크 용량 부족(1GB 미만) 시 메일 수신을 일시 중지하고 트레이 알림을 표시한다.
