# 용어 분류 기능 정의

## 개요
- 추출된 용어를 emr/business/abbreviation/general 카테고리로 분류하는 기능을 정의한다.
- 적용 범위: 용어 추출 결과의 분류 검증 및 보정

---

## TERM-CLS-001 용어 분류

### 기본 정보
| 항목 | 내용 |
|------|------|
| 기능명 | 용어 분류 |
| 분류 | 도메인 특화 로직 |
| 레이어 | lib/analysis |
| 트리거 | TERM-EXT-001 용어 추출 시 (Claude API 응답에 분류 포함) |
| 관련 정책 | POL-TERM (TERM-R-013) |

### 입력 / 출력

#### classifyTerm / validateCategory

##### 입력 (Input)
| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| category | string | ✅ | Claude API가 반환한 분류값 | - |

##### 출력 (Output)
| 항목 | 타입 | 설명 |
|------|------|------|
| validCategory | "emr" / "business" / "abbreviation" / "general" | 유효한 분류값 |

### 분류 기준 (TERM-R-013)

| 분류 | 설명 | 예시 |
|------|------|------|
| emr | EMR(전자의무기록) 시스템 관련 용어 | OCS, PACS, HL7, DICOM |
| business | 비즈니스/업무 용어 | 매출, 결산, 발주, 납기 |
| abbreviation | 약어/축약어 | ASAP, FYI, KPI, SLA |
| general | 기타 일반 전문용어 | 스크럼, 리팩토링, 마이그레이션 |

### 처리 흐름

1. **분류값 검증**: Claude API 응답의 category가 허용 값 목록에 포함되는지 확인
2. **정규화**: 대소문자 통일, 공백 제거
3. **폴백**: 유효하지 않은 분류값은 "general"로 대체

### 구현 가이드

- **패턴**: Pure Function - lib/analysis/term-classifier.ts
- **Claude API 통합**: TERM-EXT-001의 프롬프트에서 분류를 함께 요청하므로, 이 기능은 응답 검증/정규화 역할
- **확장성**: 분류 카테고리 추가 시 이 모듈만 수정
- **외부 의존성**: 없음 (순수 유틸리티)

### 관련 기능
- **이 기능을 호출하는 기능**: TERM-EXT-001
- **이 기능이 호출하는 기능**: 없음

### 관련 데이터
- DATA-004 Term (category 필드)

### 테스트 시나리오

| 시나리오 | 입력 조건 | 기대 결과 |
|----------|-----------|-----------|
| 유효한 분류 | category="emr" | "emr" 반환 |
| 대소문자 정규화 | category="EMR" | "emr" 반환 |
| 미지 분류 | category="medical" | "general" 폴백 |
| 빈 값 | category="" | "general" 폴백 |
