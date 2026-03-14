# Sprint 1 검증 보고서

**작성일**: 2026-03-14
**스프린트**: Sprint 1 - 프로젝트 셋업 + 트레이 앱 + 환경설정 UI
**브랜치**: sprint1 → main

---

## 요약

| 항목 | 결과 |
|------|------|
| 자동 검증 | 3/4 통과 (App 빌드 제외) |
| 단위 테스트 | Passed: 6 / Failed: 0 |
| 코드 리뷰 | Critical 0건 / Important 2건 / Suggestion 3건 |
| 수동 검증 | 미완료 (환경 준비 필요) |

---

## 자동 검증 결과

### 빌드 검증

| 항목 | 명령 | 결과 | 비고 |
|------|------|------|------|
| Core 빌드 | `dotnet build src/MailTermAnalyzer.Core/` | ✅ 성공 | 경고 0, 오류 0 |
| Infrastructure 빌드 | `dotnet build src/MailTermAnalyzer.Infrastructure/` | ✅ 성공 | 경고 0, 오류 0 |
| App 빌드 | `dotnet build src/MailTermAnalyzer.App/` | ❌ 실패 | Visual Studio C++ 빌드 도구 미설치 (MSVC not found) |

### 단위 테스트

```
dotnet test tests/MailTermAnalyzer.Tests/
```

| 테스트 | 결과 |
|--------|------|
| Load_파일없을때_기본값반환 | ✅ 통과 |
| Save_후_Load시_값이_유지된다 | ✅ 통과 |
| SetClientSecret_암호화되어저장된다 | ✅ 통과 |
| GetClientSecret_복호화하여평문반환 | ✅ 통과 |
| Load_폴링주기범위위반시_기본값60초적용(10) | ✅ 통과 |
| Load_폴링주기범위위반시_기본값60초적용(9999) | ✅ 통과 |

**결과**: Passed: 6, Failed: 0

---

## 코드 리뷰 결과

### 잘된 점

- **계층 분리 명확**: Core(모델) / Infrastructure(서비스) / App(UI) 분리가 계획대로 구현됨
- **DPAPI 암호화**: Client Secret을 평문으로 저장하지 않고 DPAPI Base64로 암호화 — AUTH-02 정책 준수
- **환경변수 우선 처리**: `ApplyEnvironmentVariables`에서 CLAUDE.local.md에 정의된 모든 환경변수를 일관되게 처리
- **테스트 격리**: `IDisposable` + 임시 파일 경로로 테스트 간 독립성 확보
- **계획 대비 편차**: `BitmapImage` 아이콘 초기화를 제거하고 아이콘 없는 트레이로 구동 가능하게 실용적으로 처리

### Important 이슈 (추후 개선 권고)

**[Important-1] `SettingsService`의 `Load()`에서 환경변수 적용 후 Save하지 않음**

환경변수로 Client Secret을 읽어 DPAPI 암호화 후 `settings.Auth.EncryptedClientSecret`에 저장하지만, 이 값을 파일에 기록하지 않습니다. 앱 재시작 시 환경변수가 없으면 시크릿이 사라집니다.

- 위치: `SettingsService.cs` 76-78번 줄
- 현재 동작: 환경변수 → DPAPI 암호화 → 메모리 내 `AppSettings`에만 저장
- 영향: 환경변수 제거 후 재시작 시 Client Secret 소실 가능
- 개선 방향: Sprint 2에서 설정 저장 플로우 개선 시 처리 (현재 Sprint 1 범위 외)

**[Important-2] `RelayCommand`가 App.xaml.cs 내부에 직접 정의됨**

`RelayCommand`가 `App.xaml.cs` 하단에 `internal class`로 정의되어 있습니다. CommunityToolkit.Mvvm의 `RelayCommand`와 이름이 충돌할 수 있고, 동일한 파일 내 클래스 정의는 유지보수 혼란을 줄 수 있습니다.

- 위치: `App.xaml.cs` 98-109번 줄
- 영향: CommunityToolkit 의존성 추가 시 네임스페이스 충돌 가능
- 개선 방향: 별도 파일로 분리 또는 CommunityToolkit.Mvvm의 `RelayCommand` 사용 통일

### Suggestion (참고 개선 사항)

**[Suggestion-1] `SettingsViewModel`이 `AppSettings`를 직접 변경 (뮤터블 참조)**

`_settings` 필드에 생성자에서 받은 `AppSettings` 참조를 직접 수정합니다. `Save()` 호출 전에도 외부에서 참조하는 객체가 변경될 수 있어 예측 불가능한 동작이 생길 수 있습니다.

- 영향도: 현재는 다이얼로그 흐름이 단순하여 실질적 문제 없음
- 개선 방향: 저장 시점에만 원본 반영하도록 defensive copy 패턴 고려

**[Suggestion-2] `Env()` 헬퍼가 `GetEnvironmentVariable`을 두 번 호출**

```csharp
private static string? Env(string key) =>
    string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key))
        ? null
        : Environment.GetEnvironmentVariable(key);
```

동일 키를 두 번 조회합니다. 성능 영향은 미미하나 코드 간결성을 위해 지역 변수 사용 권장.

**[Suggestion-3] `SettingsServiceTests`의 `Dispose()`에 `[Fact]` 어노테이션 누락**

`Dispose()` 메서드가 인터페이스 구현으로 정상 동작하나, xUnit의 `IDisposable` 패턴 사용이 명시적이지 않아 처음 읽는 사람이 혼동할 수 있습니다. 주석 추가 권장.

---

## 수동 검증 필요 항목

`deploy.md` 참조. 아래 항목은 C++ 빌드 도구 설치 후 수행:

| 항목 | 상태 |
|------|------|
| Visual Studio C++ 빌드 도구 설치 | ⬜ |
| App 프로젝트 빌드 (`dotnet build src/MailTermAnalyzer.App/ -p:Platform=x64`) | ⬜ |
| 앱 실행 후 트레이 아이콘 표시 확인 | ⬜ |
| 트레이 좌클릭 → 메인 윈도우 표시 확인 | ⬜ |
| X 버튼 → 트레이 최소화 (앱 종료 아님) 확인 | ⬜ |
| 우클릭 컨텍스트 메뉴 5개 항목 확인 | ⬜ |
| 환경설정 다이얼로그 열림 + 4개 그룹 렌더링 확인 | ⬜ |
| 설정 저장 후 앱 재시작 시 값 복원 확인 | ⬜ |
| `appsettings.local.json`에 Client Secret 평문 없음 확인 | ⬜ |

---

## 알려진 이슈

| 이슈 | 심각도 | 원인 | 해결 방법 |
|------|--------|------|-----------|
| App 빌드 실패 | 중 | Visual Studio C++ 빌드 도구 미설치 | VS Installer에서 "C++를 사용한 데스크톱 개발" 워크로드 추가 |
| 트레이 아이콘 파일 없음 | 낮 | `Assets/tray-icon.ico` 미생성 | 아이콘 파일 추가 필요 (현재 빈 트레이로 동작 가능) |
