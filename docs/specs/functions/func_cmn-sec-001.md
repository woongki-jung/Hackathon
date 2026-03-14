# 인증 정보 암호화 관리 기능 정의

## 개요

- **기능 목적**: Azure AD 인증 정보 및 API 키를 안전하게 암호화 저장하고 조회하는 기능을 제공한다.
- **적용 범위**: 환경설정 저장(CMN-CFG-001), 토큰 관리(CMN-AUTH-001) 등 인증 정보를 다루는 모든 기능에서 사용한다.

---

## CMN-SEC-001: 인증 정보 암호화 관리

### 기본 정보

| 항목 | 내용 |
|------|------|
| 기능명 | 인증 정보 암호화 관리 |
| 분류 | 공통 기능 |
| 레이어 | Infrastructure |
| 트리거 | 인증 정보 저장 시, 인증 정보 조회 시 |
| 관련 정책 | POL-AUTH (AUTH-02) |

### 입력 / 출력

#### 저장 (Encrypt & Store)

**입력**

| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| key | string | ✅ | 저장 키 식별자 | 비어 있지 않은 문자열 |
| value | string | ✅ | 저장할 평문 값 | 비어 있지 않은 문자열 |
| scope | enum | ✅ | 보호 범위 (CurrentUser / LocalMachine) | 기본값: CurrentUser |

**출력**

| 항목 | 타입 | 설명 |
|------|------|------|
| success | boolean | 저장 성공 여부 |

#### 조회 (Retrieve & Decrypt)

**입력**

| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| key | string | ✅ | 저장 키 식별자 | 비어 있지 않은 문자열 |

**출력**

| 항목 | 타입 | 설명 |
|------|------|------|
| value | string? | 복호화된 평문 값 (없으면 null) |

#### 예외 / 오류

| 조건 | 오류 코드 | 설명 |
|------|-----------|------|
| 암호화 실패 | ERR_SEC_ENCRYPT_FAILED | DPAPI 암호화 처리 실패 |
| 복호화 실패 | ERR_SEC_DECRYPT_FAILED | 저장된 데이터 손상 또는 복호화 불가 |
| 저장소 접근 불가 | ERR_SEC_STORE_UNAVAILABLE | Windows Credential Manager 접근 불가 |

### 처리 흐름

**저장 흐름**:

1. **입력 유효성 검사**: key, value가 비어 있지 않은지 확인한다.
2. **암호화**: DPAPI(DataProtectionScope.CurrentUser)를 사용하여 value를 암호화한다.
3. **저장**: Windows Credential Manager에 암호화된 데이터를 저장한다.
4. **결과 반환**: 성공 여부를 반환한다.

**조회 흐름**:

1. **입력 유효성 검사**: key가 비어 있지 않은지 확인한다.
2. **조회**: Windows Credential Manager에서 key에 해당하는 데이터를 조회한다.
3. **복호화**: DPAPI로 복호화하여 평문을 복원한다.
4. **참조 해제 준비**: 호출자에게 반환 후 내부 버퍼를 즉시 정리할 수 있도록 설계한다 (AUTH 제약사항).
5. **결과 반환**: 복호화된 값 또는 null을 반환한다.

### 구현 가이드

- **패턴**: Repository 패턴으로 저장소 구현을 추상화. `ISecretStore` 인터페이스를 정의하여 테스트에서 대체 가능하도록 설계.
- **보안**:
  - 평문 값을 `SecureString` 또는 `byte[]`로 다루고, 사용 후 즉시 제로화(zeroing)한다.
  - 로그에 인증 정보를 절대 출력하지 않는다.
- **외부 의존성**:
  - Windows DPAPI (`System.Security.Cryptography.ProtectedData`)
  - Windows Credential Manager (대안: 환경변수 폴백)

### 관련 기능

- **이 기능을 호출하는 기능**: CMN-AUTH-001, CMN-CFG-001
- **이 기능이 호출하는 기능**: CMN-LOG-001

### 테스트 시나리오

| 시나리오 | 입력 조건 | 기대 결과 |
|----------|-----------|-----------|
| 정상 저장/조회 | 유효한 key, value | 저장 성공, 조회 시 원본 값 반환 |
| 존재하지 않는 키 조회 | 미등록 key | null 반환 |
| 빈 키 저장 | key="" | ERR_SEC_ENCRYPT_FAILED |
| 덮어쓰기 | 동일 key로 재저장 | 새 값으로 갱신 |
| 환경변수 폴백 | Credential Manager 미사용, 환경변수에 값 존재 | 환경변수 값 반환 |
