# 분석 요청 파일 생성 기능 정의

## 개요
- 수신된 메일 텍스트를 ./data/mails 경로에 파일로 저장하는 기능을 정의한다.
- 적용 범위: 메일 수신 후 분석 대상 파일 생성

---

## DATA-FILE-001 분석 요청 파일 생성

### 기본 정보
| 항목 | 내용 |
|------|------|
| 기능명 | 분석 요청 파일 생성 |
| 분류 | 도메인 특화 로직 |
| 레이어 | lib/data |
| 트리거 | MAIL-PROC-001에서 메일 내용 추출 완료 후 |
| 관련 정책 | POL-DATA (DATA-R-005, DATA-R-007), POL-MAIL (MAIL-R-010, MAIL-R-011) |

### 입력 / 출력

#### saveMailFile

##### 입력 (Input)
| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| content | string | ✅ | 추출된 메일 텍스트 (제목+본문) | - |
| messageIdHash | string | ✅ | Message-ID 해시값 | 영문숫자, 8자 |
| timestamp | number | ✅ | Unix 밀리초 타임스탬프 | - |

##### 출력 (Output)
| 항목 | 타입 | 설명 |
|------|------|------|
| fileName | string | 생성된 파일명 (`{timestamp}_{messageIdHash}.txt`) |
| filePath | string | 파일 절대 경로 |

##### 예외 / 오류
| 조건 | 오류 코드 | 설명 |
|------|-----------|------|
| 저장 실패 | ERR_FILE_WRITE | 디스크 오류 등 |
| 디렉터리 생성 실패 | ERR_DIR_CREATE | ./data/mails 생성 불가 |

### 처리 흐름

1. **저장 경로 결정**: 환경변수 MAIL_STORAGE_PATH (기본값: `./data/mails`) (DATA-R-005)
2. **디렉터리 보장**: CMN-FS-001.ensureDirectory로 경로 존재 확인/생성
3. **파일명 생성**: `{timestamp}_{messageIdHash}.txt` (MAIL-R-011)
4. **파일 쓰기**: CMN-FS-001.writeFile로 UTF-8 텍스트 저장
5. **결과 반환**: 파일명 및 경로

### 파일명 형식 (MAIL-R-011)
```
{timestamp}_{messageIdHash}.txt
```
- timestamp: 밀리초 단위 Unix 시간 (예: 1710489600000)
- messageIdHash: Message-ID SHA-256 해시 앞 8자 (예: a1b2c3d4)
- 예시: `1710489600000_a1b2c3d4.txt`

### 구현 가이드

- **패턴**: 순수 함수 - lib/data/mail-file-service.ts
- **경로 보안**: CMN-FS-001의 경로 검증 활용 (DATA-R-007)
- **외부 의존성**: CMN-FS-001 (파일 I/O)

### 관련 기능
- **이 기능을 호출하는 기능**: TERM-BATCH-001
- **이 기능이 호출하는 기능**: CMN-FS-001

### 관련 데이터
- 파일 시스템: MAIL_STORAGE_PATH (`./data/mails`)

### 테스트 시나리오

| 시나리오 | 입력 조건 | 기대 결과 |
|----------|-----------|-----------|
| 정상 저장 | 유효한 content, hash, timestamp | 파일 생성, 파일명 반환 |
| 디렉터리 미존재 | ./data/mails 없음 | 자동 생성 후 저장 |
| 동일 파일명 | 이미 존재하는 파일명 | 덮어쓰기 (동일 메일 재처리) |
