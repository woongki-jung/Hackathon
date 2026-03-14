# 메일 내용 추출 기능 정의

## 개요

- **기능 목적**: 수신된 메일에서 제목, 본문(HTML->텍스트 변환), 메타데이터를 추출하여 구조화된 데이터로 변환한다.
- **적용 범위**: 메일 폴링(MAIL-RECV-001) 후 각 메일에 대해 호출된다.

---

## MAIL-PROC-001: 메일 내용 추출

### 기본 정보

| 항목 | 내용 |
|------|------|
| 기능명 | 메일 내용 추출 |
| 분류 | 도메인 특화 로직 |
| 레이어 | Domain |
| 트리거 | MAIL-RECV-001에서 조회된 각 메일에 대해 호출 |
| 관련 정책 | POL-MAIL (MAIL-05) |

### 입력 / 출력

#### 입력 (Input)

| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| messageId | string | ✅ | 메일 Message ID | 비어 있지 않은 문자열 |
| subject | string | ✅ | 메일 제목 | |
| bodyContent | string | ✅ | 메일 본문 (HTML 또는 텍스트) | |
| bodyContentType | enum | ✅ | 본문 형식 (HTML / Text) | |
| fromAddress | string | ✅ | 발신자 이메일 | 이메일 형식 |
| receivedDateTime | DateTime | ✅ | 수신 일시 | |

#### 출력 (Output)

| 항목 | 타입 | 설명 |
|------|------|------|
| subject | string | 메일 제목 (원본) |
| plainTextBody | string | HTML 태그 제거된 텍스트 본문 |
| fromAddress | string | 발신자 이메일 |
| receivedAt | DateTime | 수신 일시 |
| messageId | string | Message ID |
| isTruncated | boolean | 본문 잘림 여부 (1MB 초과 시) |

#### 예외 / 오류

| 조건 | 오류 코드 | 설명 |
|------|-----------|------|
| HTML 파싱 실패 | ERR_MAIL_PARSE_FAILED | HTML을 텍스트로 변환할 수 없음 |
| 빈 본문 | ERR_MAIL_EMPTY_BODY | 메일 본문이 비어 있음 |

### 처리 흐름

1. **본문 형식 판별**: bodyContentType이 HTML인지 Text인지 확인한다.
2. **HTML 태그 제거**: HTML인 경우 태그를 제거하고 텍스트만 추출한다 (MAIL-05).
   - `<br>`, `<p>` 등 블록 태그는 줄바꿈으로 치환.
   - `<style>`, `<script>` 태그 내용은 완전 제거.
   - HTML 엔티티(`&amp;`, `&lt;` 등)를 디코딩.
3. **크기 제한**: 본문이 1MB를 초과하면 1MB까지만 유지하고 isTruncated=true로 설정 (POL-MAIL 제약사항).
4. **공백 정리**: 연속 공백/줄바꿈을 정리하여 가독성을 확보한다.
5. **구조화 데이터 반환**: 메타데이터와 함께 추출 결과를 반환한다.

### 구현 가이드

- **패턴**: 순수 함수로 구현 (외부 상태 의존 없음). 입력을 받아 변환된 출력을 반환.
- **성능**: HTML 파싱 라이브러리의 스트리밍 모드 활용을 고려 (대용량 메일 대응).
- **외부 의존성**: HTML 파싱/태그 제거 라이브러리 (HtmlAgilityPack 등 선택은 개발자에게 위임)

### 관련 기능

- **이 기능을 호출하는 기능**: MAIL-RECV-001
- **이 기능이 호출하는 기능**: 없음 (순수 함수)

### 테스트 시나리오

| 시나리오 | 입력 조건 | 기대 결과 |
|----------|-----------|-----------|
| HTML 본문 변환 | `<p>Hello <b>World</b></p>` | "Hello World" |
| 텍스트 본문 | 평문 본문 | 그대로 반환 |
| style/script 제거 | `<style>...</style>본문` | "본문"만 반환 |
| HTML 엔티티 디코딩 | `&amp;` | "&" |
| 1MB 초과 | 2MB 본문 | 1MB 잘림, isTruncated=true |
| 빈 본문 | body="" | ERR_MAIL_EMPTY_BODY |
| 줄바꿈 변환 | `<br/>` 태그 | 줄바꿈 문자로 치환 |
