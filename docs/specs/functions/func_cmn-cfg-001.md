# 환경설정 관리 기능 정의

## 개요
- DB 기반 키-값 설정 저장/조회 및 환경변수 통합 관리 기능을 정의한다.
- 적용 범위: 환경설정 API, IMAP/분석 설정 조회, 서버 초기화

---

## CMN-CFG-001 환경설정 관리

### 기본 정보
| 항목 | 내용 |
|------|------|
| 기능명 | 환경설정 관리 |
| 분류 | 공통 기능 |
| 레이어 | lib/config |
| 트리거 | 환경설정 조회/저장 API 호출, 서비스 초기화 시 |
| 관련 정책 | POL-AUTH (AUTH-R-014, AUTH-R-017 ~ AUTH-R-020), POL-DATA (DATA-R-019, DATA-R-020) |

### 입력 / 출력

#### 1. 설정 조회 (getSetting / getAllSettings)

##### 입력 (Input)
| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| key | string | ✅ (단건) | 설정 키 | 사전 정의 키 목록 내 |

##### 출력 (Output)
| 항목 | 타입 | 설명 |
|------|------|------|
| value | string | null | 설정 값 (민감정보는 마스킹) |
| settings | Record<string, string> | 전체 설정 목록 (민감정보 마스킹) |

#### 2. 설정 저장 (setSetting)

##### 입력 (Input)
| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| key | string | ✅ | 설정 키 | 사전 정의 키 목록 내 |
| value | string | ✅ | 설정 값 | 최대 500자 |

##### 출력 (Output)
| 항목 | 타입 | 설명 |
|------|------|------|
| success | boolean | 저장 성공 여부 |

##### 예외 / 오류
| 조건 | 오류 코드 | 설명 |
|------|-----------|------|
| 알 수 없는 설정 키 | ERR_INVALID_KEY | 사전 정의되지 않은 키 |
| 값 형식 오류 | ERR_INVALID_VALUE | 포트 번호에 문자열 등 |

#### 3. IMAP 설정 조합 조회 (getImapConfig)

##### 출력 (Output)
| 항목 | 타입 | 설명 |
|------|------|------|
| host | string | null | IMAP 호스트 (DB 우선, 환경변수 폴백) |
| port | number | IMAP 포트 (기본 993) |
| username | string | null | IMAP 사용자명 |
| password | string | null | 환경변수 MAIL_PASSWORD에서만 읽음 |
| useSsl | boolean | SSL 사용 여부 (기본 true) |
| isConfigured | boolean | 필수 설정 완료 여부 |

### 처리 흐름

1. **설정 조회 시**: DB 조회 -> 환경변수 폴백 -> 민감정보 마스킹 후 반환 (AUTH-R-020)
2. **설정 저장 시**: 키 유효성 검증 -> DB UPSERT (INSERT OR UPDATE) -> updated_at 갱신
3. **IMAP 설정 조합**: DB 설정 + 환경변수(비밀번호) 병합, 필수값 완료 여부 판단

### 사전 정의 설정 키 (DATA-002 AppSetting 참조)

| key | 설명 | 환경변수 폴백 | 민감 여부 |
|-----|------|--------------|-----------|
| mail.imap.host | IMAP 호스트 | MAIL_IMAP_HOST | NO |
| mail.imap.port | IMAP 포트 | MAIL_IMAP_PORT | NO |
| mail.imap.username | IMAP 아이디 | MAIL_USERNAME | YES (마스킹) |
| mail.imap.use_ssl | SSL 사용 | MAIL_USE_SSL | NO |
| mail.check_interval | 확인 주기 (ms) | MAIL_CHECK_INTERVAL | NO |
| analysis.model | Claude 모델명 | ANTHROPIC_MODEL | NO |

### 구현 가이드

- **패턴**: Repository 패턴 - lib/config/config-service.ts
- **환경변수 우선순위**: 환경변수 > DB 설정값 (비밀번호/API 키는 환경변수 전용)
- **보안**:
  - 비밀번호(MAIL_PASSWORD), API 키(ANTHROPIC_API_KEY)는 DB에 저장하지 않음 (AUTH-R-017, AUTH-R-018)
  - 조회 시 민감정보 마스킹 ("****" 또는 boolean으로 반환) (AUTH-R-020)
  - .env.local은 API로 직접 읽기/수정 불가 (DATA-R-020)
- **외부 의존성**: Drizzle ORM (DB 접근), process.env (환경변수)

### 관련 기능
- **이 기능을 호출하는 기능**: MAIL-RECV-001, TERM-GEN-001, SCHED-001, API Route Handler
- **이 기능이 호출하는 기능**: 없음

### 관련 데이터
- DATA-002 AppSetting (app_settings 테이블)

### 테스트 시나리오

| 시나리오 | 입력 조건 | 기대 결과 |
|----------|-----------|-----------|
| 정상 설정 조회 | key="mail.imap.host" | DB 값 또는 환경변수 값 반환 |
| 민감정보 조회 | key="mail.imap.username" | 마스킹된 값 반환 ("u***@example.com") |
| 설정 저장 | key="mail.imap.host", value="imap.gmail.com" | DB UPSERT 성공 |
| IMAP 설정 조합 | DB + 환경변수 모두 설정됨 | isConfigured=true, 전체 설정 반환 |
| IMAP 미설정 | host 미설정 | isConfigured=false |
| 잘못된 키 저장 | key="unknown.key" | ERR_INVALID_KEY |
