# 용어 분류 기능 정의

## 개요

- **기능 목적**: 추출된 용어를 EMR, Business, Abbreviation 카테고리로 분류한다.
- **적용 범위**: 배치 분석(TERM-BATCH-001)에서 불용어 필터링 후 호출된다.

---

## TERM-CLS-001: 용어 분류

### 기본 정보

| 항목 | 내용 |
|------|------|
| 기능명 | 용어 분류 |
| 분류 | 도메인 특화 로직 |
| 레이어 | Domain |
| 트리거 | TERM-BATCH-001에서 필터링된 용어에 대해 호출 |
| 관련 정책 | POL-TERM (TERM-01) |

### 입력 / 출력

#### 입력 (Input)

| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| candidate | TermCandidate | ✅ | 분류 대상 용어 후보 | |

#### 출력 (Output)

| 항목 | 타입 | 설명 |
|------|------|------|
| category | enum | EMR / Business / Abbreviation |
| confidence | float | 분류 신뢰도 (0.0~1.0) |

### 처리 흐름

1. **EMR 용어 사전 매칭**: 사전 정의된 EMR 용어 목록(OCS, PACS, CDR, HL7, FHIR 등)과 매칭한다 (TERM-01).
   - 정확 매칭 시 EMR 카테고리, confidence=1.0
2. **Business 용어 사전 매칭**: 의료/병원 업무 용어 목록(DRG, 수가, 원외처방 등)과 매칭한다 (TERM-01).
   - 정확 매칭 시 Business 카테고리, confidence=1.0
3. **패턴 기반 분류**: 사전에 없는 경우 패턴으로 추론한다.
   - 2글자 이상 연속 대문자 -> Abbreviation (기본 분류, TERM-01)
   - 영문+숫자 코드 패턴 -> EMR (의료 코드 체계 가능성)
   - 한글 전문 용어 -> Business
4. **결과 반환**: 카테고리와 신뢰도를 반환한다.

### 구현 가이드

- **패턴**: Strategy 패턴으로 분류 규칙을 확장 가능하게 설계. 규칙 체인(Chain of Responsibility) 고려.
- **확장성**: EMR/Business 용어 사전은 외부 파일에서 로드하여 유지보수 가능하게 설계.
- **성능**: 사전을 HashSet/Dictionary로 메모리에 캐싱하여 빠른 조회 보장.

### 관련 기능

- **이 기능을 호출하는 기능**: TERM-BATCH-001
- **이 기능이 호출하는 기능**: 없음 (순수 함수)

### 테스트 시나리오

| 시나리오 | 입력 조건 | 기대 결과 |
|----------|-----------|-----------|
| EMR 용어 매칭 | "PACS" | category=EMR, confidence=1.0 |
| Business 용어 매칭 | "DRG" | category=Business, confidence=1.0 |
| 대문자 약어 기본 분류 | "ABC" (사전 미등록) | category=Abbreviation |
| 코드 패턴 | "HL7v2" | category=EMR |
| 한글 전문 용어 | "수가" | category=Business |
