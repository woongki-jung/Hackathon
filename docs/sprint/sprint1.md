# Sprint 1: 프로젝트 셋업 + 트레이 앱 + 환경설정 UI

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** WinUI 3 기반 프로젝트 초기 구조를 생성하고, 시스템 트레이에 상주하는 앱과 환경설정 화면의 저장/로드 기능을 완성한다.

**Architecture:** Clean Architecture를 간소화하여 App(WinUI 3), Core(비즈니스 로직), Infrastructure(외부 연동) 3개 프로젝트로 구성한다. 트레이 아이콘은 H.NotifyIcon.WinUI 패키지를 활용하며, 환경설정은 민감 정보를 DPAPI로 암호화하여 로컬 JSON에 저장한다. UI는 MVVM 패턴(CommunityToolkit.Mvvm)으로 View/ViewModel을 분리한다.

**Tech Stack:** .NET 10, WinUI 3 (Windows App SDK 1.6+), H.NotifyIcon.WinUI, CommunityToolkit.Mvvm, Microsoft.Extensions.Configuration, System.Security.Cryptography (DPAPI)

**기간:** 2026-03-13 ~ 2026-03-20 (1주)

**스프린트 번호:** Sprint 1 (Phase 1 전반부)

---

## 스프린트 목표

| 목표 | 측정 기준 |
|------|-----------|
| 프로젝트 솔루션 구조 완성 | `dotnet build` 성공, 3개 프로젝트 참조 관계 정상 |
| 트레이 아이콘 동작 | 앱 실행 시 트레이 표시, 클릭/우클릭 메뉴 동작 |
| 윈도우 닫기 시 트레이 최소화 | X 버튼 클릭 → 앱 종료 아닌 트레이 축소 |
| 환경설정 화면 렌더링 | 4개 설정 그룹 UI 정상 표시 |
| 환경설정 저장/로드 | 저장 후 앱 재시작 시 값 복원, 민감 정보 DPAPI 암호화 |

---

## 구현 범위

### 포함 (In Scope)
- WinUI 3 솔루션 및 프로젝트 초기 구조 생성
- 시스템 트레이 아이콘 및 컨텍스트 메뉴 (POL-UI: UI-01)
- 트레이 풍선 알림 기반 코드 (POL-UI: UI-02)
- 환경설정 다이얼로그 UI 4개 그룹 (POL-UI: UI-03)
  - 메일 계정 (계정 연결 상태 표시)
  - 수신 설정 (폴링 주기, 읽지 않은 메일만, 최대 조회 수)
  - 저장 경로 (분석 요청 폴더, 폴더 선택 다이얼로그)
  - 용어 분석 (일일 최대 API 호출 횟수, 불용어 목록 편집)
- 환경설정 저장/로드 로직 (POL-AUTH: AUTH-02, POL-DATA: DATA-01)
  - 환경변수 우선 → appsettings.json fallback
  - 민감 정보(Client Secret) DPAPI 암호화
  - IOptionsMonitor 패턴으로 실시간 반영
- 메인 윈도우 기본 레이아웃 (800x600 기본, 640x480 최소, POL-UI: UI-07)
- 단위 테스트: 설정 로드/저장 로직

### 제외 (Out of Scope)
- Microsoft Graph API 메일 수신 서비스 (Sprint 2)
- 메일 내용 텍스트 파일 저장 (Sprint 2)
- 메인 윈도우 메일 목록 표시 (Sprint 2)
- 용어 분석 기능 전체 (Sprint 3-4)
- 용어사전 뷰어 (Sprint 5-6)

---

## 의존성 및 리스크

| 항목 | 종류 | 설명 | 대응 방안 |
|------|------|------|-----------|
| H.NotifyIcon.WinUI 패키지 | 외부 의존 | WinUI 3에서 트레이 아이콘 지원 제한 (ROADMAP 기술 고려사항) | NuGet 사전 설치 검증, 동작 확인 후 진행 |
| .NET 10 미리보기 불안정성 | 환경 리스크 | ROADMAP에 .NET 9 LTS fallback 준비 명시 | .NET 9 LTS로 대체 가능하도록 TargetFramework 변수화 |
| DPAPI 암호화 API 사용 | 기술 | Windows 전용 API, 크로스플랫폼 불가 (단, 앱이 Windows 전용이므로 문제없음) | 해당 없음 |
| 폴더 선택 다이얼로그 | WinUI 3 | WinUI 3의 FolderPicker는 패키지 앱 HWND 필요 | WinRT Interop으로 HWND 주입 구현 |

---

## 작업 분해 (Task Breakdown)

---

### Task 1: 솔루션 및 프로젝트 초기 구조 생성

**우선순위:** Must Have | **복잡도:** 낮 | **예상 소요:** 30분

**Files:**
- Create: `MailTermAnalyzer.sln`
- Create: `src/MailTermAnalyzer.App/MailTermAnalyzer.App.csproj`
- Create: `src/MailTermAnalyzer.Core/MailTermAnalyzer.Core.csproj`
- Create: `src/MailTermAnalyzer.Infrastructure/MailTermAnalyzer.Infrastructure.csproj`
- Create: `tests/MailTermAnalyzer.Tests/MailTermAnalyzer.Tests.csproj`
- Create: `.gitignore`
- Create: `Directory.Build.props`

**Step 1: 솔루션 및 프로젝트 생성**

```bash
# 솔루션 루트(도메인 디렉터리) 기준으로 실행
dotnet new sln -n MailTermAnalyzer
mkdir -p src/MailTermAnalyzer.App src/MailTermAnalyzer.Core src/MailTermAnalyzer.Infrastructure tests/MailTermAnalyzer.Tests

# WinUI 3 앱 프로젝트 (winui 템플릿 사용)
dotnet new winui -n MailTermAnalyzer.App -o src/MailTermAnalyzer.App

# 클래스 라이브러리
dotnet new classlib -n MailTermAnalyzer.Core -o src/MailTermAnalyzer.Core --framework net10.0-windows
dotnet new classlib -n MailTermAnalyzer.Infrastructure -o src/MailTermAnalyzer.Infrastructure --framework net10.0-windows

# xUnit 테스트 프로젝트
dotnet new xunit -n MailTermAnalyzer.Tests -o tests/MailTermAnalyzer.Tests --framework net10.0-windows
```

**Step 2: 솔루션에 프로젝트 추가**

```bash
dotnet sln add src/MailTermAnalyzer.App/MailTermAnalyzer.App.csproj
dotnet sln add src/MailTermAnalyzer.Core/MailTermAnalyzer.Core.csproj
dotnet sln add src/MailTermAnalyzer.Infrastructure/MailTermAnalyzer.Infrastructure.csproj
dotnet sln add tests/MailTermAnalyzer.Tests/MailTermAnalyzer.Tests.csproj
```

**Step 3: 프로젝트 참조 설정**

```bash
# App -> Core, Infrastructure 참조
dotnet add src/MailTermAnalyzer.App/MailTermAnalyzer.App.csproj reference src/MailTermAnalyzer.Core/MailTermAnalyzer.Core.csproj
dotnet add src/MailTermAnalyzer.App/MailTermAnalyzer.App.csproj reference src/MailTermAnalyzer.Infrastructure/MailTermAnalyzer.Infrastructure.csproj

# Infrastructure -> Core 참조
dotnet add src/MailTermAnalyzer.Infrastructure/MailTermAnalyzer.Infrastructure.csproj reference src/MailTermAnalyzer.Core/MailTermAnalyzer.Core.csproj

# Tests -> Core, Infrastructure 참조
dotnet add tests/MailTermAnalyzer.Tests/MailTermAnalyzer.Tests.csproj reference src/MailTermAnalyzer.Core/MailTermAnalyzer.Core.csproj
dotnet add tests/MailTermAnalyzer.Tests/MailTermAnalyzer.Tests.csproj reference src/MailTermAnalyzer.Infrastructure/MailTermAnalyzer.Infrastructure.csproj
```

**Step 4: NuGet 패키지 설치**

```bash
# App 프로젝트
dotnet add src/MailTermAnalyzer.App/MailTermAnalyzer.App.csproj package H.NotifyIcon.WinUI
dotnet add src/MailTermAnalyzer.App/MailTermAnalyzer.App.csproj package CommunityToolkit.Mvvm
dotnet add src/MailTermAnalyzer.App/MailTermAnalyzer.App.csproj package Microsoft.Extensions.Hosting

# Core 프로젝트
dotnet add src/MailTermAnalyzer.Core/MailTermAnalyzer.Core.csproj package Microsoft.Extensions.Options
dotnet add src/MailTermAnalyzer.Core/MailTermAnalyzer.Core.csproj package Microsoft.Extensions.Configuration.Abstractions

# Infrastructure 프로젝트
dotnet add src/MailTermAnalyzer.Infrastructure/MailTermAnalyzer.Infrastructure.csproj package Microsoft.Extensions.Configuration
dotnet add src/MailTermAnalyzer.Infrastructure/MailTermAnalyzer.Infrastructure.csproj package Microsoft.Extensions.Configuration.Json
dotnet add src/MailTermAnalyzer.Infrastructure/MailTermAnalyzer.Infrastructure.csproj package Microsoft.Extensions.Configuration.EnvironmentVariables

# Tests 프로젝트
dotnet add tests/MailTermAnalyzer.Tests/MailTermAnalyzer.Tests.csproj package FluentAssertions
dotnet add tests/MailTermAnalyzer.Tests/MailTermAnalyzer.Tests.csproj package Moq
```

**Step 5: Directory.Build.props 생성**

```xml
<!-- Directory.Build.props -->
<Project>
  <PropertyGroup>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>false</TreatWarningsAsErrors>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>
</Project>
```

**Step 6: .gitignore 생성**

```bash
dotnet new gitignore
# appsettings.local.json (민감 설정 파일) 추가
echo "appsettings.local.json" >> .gitignore
echo "*.user" >> .gitignore
```

**Step 7: 빌드 확인**

```bash
dotnet build
```

예상 출력: `Build succeeded.`

**Step 8: 커밋**

```bash
git checkout -b sprint1
git add MailTermAnalyzer.sln src/ tests/ Directory.Build.props .gitignore
git commit -m "feat: 프로젝트 초기 구조 생성 (솔루션, 3개 프로젝트, 테스트)"
```

---

### Task 2: AppSettings 모델 및 설정 로드/저장 로직

**우선순위:** Must Have | **복잡도:** 낮 | **예상 소요:** 45분

> 정책 참조: POL-AUTH (AUTH-01, AUTH-02), POL-MAIL (MAIL-01~03), POL-DATA (DATA-01), POL-TERM (TERM-05), POL-UI (UI-03)

**Files:**
- Create: `src/MailTermAnalyzer.Core/Settings/AppSettings.cs`
- Create: `src/MailTermAnalyzer.Core/Settings/MailSettings.cs`
- Create: `src/MailTermAnalyzer.Core/Settings/AuthSettings.cs`
- Create: `src/MailTermAnalyzer.Infrastructure/Settings/SettingsService.cs`
- Create: `src/MailTermAnalyzer.Infrastructure/Settings/DpapiProtector.cs`
- Create: `tests/MailTermAnalyzer.Tests/Settings/SettingsServiceTests.cs`

**Step 1: 설정 모델 클래스 정의 (Core)**

```csharp
// src/MailTermAnalyzer.Core/Settings/AuthSettings.cs
namespace MailTermAnalyzer.Core.Settings;

/// <summary>
/// Azure AD 및 Claude API 인증 설정 (POL-AUTH: AUTH-01, AUTH-04)
/// </summary>
public class AuthSettings
{
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    /// <summary>암호화된 Client Secret (DPAPI). 평문으로 저장하지 않는다 (AUTH-02).</summary>
    public string EncryptedClientSecret { get; set; } = string.Empty;
    public string AnthropicApiKey { get; set; } = string.Empty;
}
```

```csharp
// src/MailTermAnalyzer.Core/Settings/MailSettings.cs
namespace MailTermAnalyzer.Core.Settings;

/// <summary>
/// 메일 수신 설정 (POL-MAIL: MAIL-01~03)
/// </summary>
public class MailSettings
{
    /// <summary>메일함 확인 주기(초). 최소 30, 최대 3600, 기본 60 (MAIL-01).</summary>
    public int PollIntervalSeconds { get; set; } = 60;
    /// <summary>모니터링 메일함. 기본값 Inbox (MAIL-02).</summary>
    public string MailboxName { get; set; } = "Inbox";
    public string UserEmail { get; set; } = string.Empty;
    /// <summary>읽지 않은 메일만 조회 여부. 기본값 true (MAIL-03).</summary>
    public bool FetchUnreadOnly { get; set; } = true;
    /// <summary>1회 최대 조회 수. 기본값 50 (MAIL-03).</summary>
    public int MaxFetchCount { get; set; } = 50;
}
```

```csharp
// src/MailTermAnalyzer.Core/Settings/AppSettings.cs
namespace MailTermAnalyzer.Core.Settings;

/// <summary>
/// 앱 전체 설정 루트 모델
/// </summary>
public class AppSettings
{
    public AuthSettings Auth { get; set; } = new();
    public MailSettings Mail { get; set; } = new();
    /// <summary>분석 요청 폴더 경로 (POL-DATA: DATA-01). 기본값: 앱 실행경로/AnalysisRequests/</summary>
    public string OutputAnalysisDir { get; set; } = string.Empty;
    /// <summary>일일 최대 Claude API 호출 횟수 (POL-TERM: TERM-05). 기본값 200.</summary>
    public int DailyMaxApiCalls { get; set; } = 200;
    /// <summary>불용어 목록 (POL-TERM: TERM-02)</summary>
    public List<string> StopWords { get; set; } = ["IT", "OK", "PM", "AM", "RE", "FW", "FYI"];
    /// <summary>메인 윈도우 너비 복원용 (POL-UI: UI-07)</summary>
    public int WindowWidth { get; set; } = 800;
    /// <summary>메인 윈도우 높이 복원용 (POL-UI: UI-07)</summary>
    public int WindowHeight { get; set; } = 600;
}
```

**Step 2: DPAPI 암호화 헬퍼 작성 (Infrastructure)**

```csharp
// src/MailTermAnalyzer.Infrastructure/Settings/DpapiProtector.cs
using System.Security.Cryptography;
using System.Text;

namespace MailTermAnalyzer.Infrastructure.Settings;

/// <summary>
/// Windows DPAPI를 사용한 민감 정보 암호화/복호화 (POL-AUTH: AUTH-02)
/// </summary>
public static class DpapiProtector
{
    /// <summary>평문을 DPAPI로 암호화하여 Base64 문자열로 반환한다.</summary>
    public static string Protect(string plainText)
    {
        if (string.IsNullOrEmpty(plainText)) return string.Empty;
        var data = Encoding.UTF8.GetBytes(plainText);
        var encrypted = ProtectedData.Protect(data, null, DataProtectionScope.CurrentUser);
        return Convert.ToBase64String(encrypted);
    }

    /// <summary>DPAPI로 암호화된 Base64 문자열을 복호화하여 평문으로 반환한다.</summary>
    public static string Unprotect(string encryptedBase64)
    {
        if (string.IsNullOrEmpty(encryptedBase64)) return string.Empty;
        var data = Convert.FromBase64String(encryptedBase64);
        var decrypted = ProtectedData.Unprotect(data, null, DataProtectionScope.CurrentUser);
        return Encoding.UTF8.GetString(decrypted);
    }
}
```

**Step 3: SettingsService 구현 (Infrastructure)**

```csharp
// src/MailTermAnalyzer.Infrastructure/Settings/SettingsService.cs
using System.Text.Json;
using MailTermAnalyzer.Core.Settings;
using Microsoft.Extensions.Configuration;

namespace MailTermAnalyzer.Infrastructure.Settings;

/// <summary>
/// 설정 저장/로드 서비스.
/// 우선순위: 환경변수 > appsettings.local.json > appsettings.json (POL-AUTH: AUTH-01)
/// </summary>
public class SettingsService
{
    private readonly string _settingsFilePath;
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public SettingsService(string settingsFilePath)
    {
        _settingsFilePath = settingsFilePath;
    }

    /// <summary>
    /// 설정을 로드한다. 환경변수가 존재하는 경우 해당 값으로 덮어씌운다.
    /// </summary>
    public AppSettings Load()
    {
        AppSettings settings;

        if (File.Exists(_settingsFilePath))
        {
            var json = File.ReadAllText(_settingsFilePath, System.Text.Encoding.UTF8);
            settings = JsonSerializer.Deserialize<AppSettings>(json, JsonOptions) ?? new AppSettings();
        }
        else
        {
            settings = new AppSettings();
        }

        // 환경변수 오버라이드 (POL-AUTH: AUTH-01)
        ApplyEnvironmentVariables(settings);

        // 기본값 범위 검증 (POL-MAIL: MAIL-01)
        ValidateAndFixDefaults(settings);

        return settings;
    }

    /// <summary>
    /// 설정을 파일에 저장한다. Client Secret은 DPAPI 암호화 후 저장한다 (AUTH-02).
    /// </summary>
    public void Save(AppSettings settings)
    {
        var dir = Path.GetDirectoryName(_settingsFilePath);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);

        var json = JsonSerializer.Serialize(settings, JsonOptions);
        File.WriteAllText(_settingsFilePath, json, System.Text.Encoding.UTF8);
    }

    /// <summary>Client Secret 평문을 암호화하여 설정에 저장한다.</summary>
    public void SetClientSecret(AppSettings settings, string plainSecret)
    {
        settings.Auth.EncryptedClientSecret = DpapiProtector.Protect(plainSecret);
    }

    /// <summary>암호화된 Client Secret을 복호화하여 반환한다.</summary>
    public string GetClientSecret(AppSettings settings)
    {
        return DpapiProtector.Unprotect(settings.Auth.EncryptedClientSecret);
    }

    private static void ApplyEnvironmentVariables(AppSettings settings)
    {
        settings.Auth.TenantId = Env("AZURE_TENANT_ID") ?? settings.Auth.TenantId;
        settings.Auth.ClientId = Env("AZURE_CLIENT_ID") ?? settings.Auth.ClientId;
        // Client Secret 환경변수는 암호화하지 않고 메모리에서만 사용
        var secretFromEnv = Env("AZURE_CLIENT_SECRET");
        if (!string.IsNullOrEmpty(secretFromEnv))
            settings.Auth.EncryptedClientSecret = DpapiProtector.Protect(secretFromEnv);

        settings.Auth.AnthropicApiKey = Env("ANTHROPIC_API_KEY") ?? settings.Auth.AnthropicApiKey;
        settings.Mail.UserEmail = Env("MAIL_USER_EMAIL") ?? settings.Mail.UserEmail;
        settings.Mail.MailboxName = Env("MAIL_MAILBOX_NAME") ?? settings.Mail.MailboxName;

        if (int.TryParse(Env("MAIL_POLL_INTERVAL_SECONDS"), out var interval))
            settings.Mail.PollIntervalSeconds = interval;
        if (bool.TryParse(Env("MAIL_FETCH_UNREAD_ONLY"), out var unreadOnly))
            settings.Mail.FetchUnreadOnly = unreadOnly;
        if (int.TryParse(Env("MAIL_MAX_FETCH_COUNT"), out var maxCount))
            settings.Mail.MaxFetchCount = maxCount;

        settings.OutputAnalysisDir = Env("OUTPUT_ANALYSIS_DIR") ?? settings.OutputAnalysisDir;
    }

    private static void ValidateAndFixDefaults(AppSettings settings)
    {
        // MAIL-01: 폴링 주기 범위 검증 (30~3600)
        if (settings.Mail.PollIntervalSeconds < 30 || settings.Mail.PollIntervalSeconds > 3600)
        {
            Console.WriteLine($"[경고] 폴링 주기({settings.Mail.PollIntervalSeconds}초)가 범위를 벗어나 기본값(60초)으로 설정됩니다.");
            settings.Mail.PollIntervalSeconds = 60;
        }

        // DATA-01: 기본 분석 요청 폴더 경로
        if (string.IsNullOrEmpty(settings.OutputAnalysisDir))
        {
            settings.OutputAnalysisDir = Path.Combine(
                AppContext.BaseDirectory, "AnalysisRequests");
        }
    }

    private static string? Env(string key) =>
        string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key))
            ? null
            : Environment.GetEnvironmentVariable(key);
}
```

**Step 4: 단위 테스트 작성**

```csharp
// tests/MailTermAnalyzer.Tests/Settings/SettingsServiceTests.cs
using FluentAssertions;
using MailTermAnalyzer.Core.Settings;
using MailTermAnalyzer.Infrastructure.Settings;

namespace MailTermAnalyzer.Tests.Settings;

public class SettingsServiceTests : IDisposable
{
    private readonly string _tempPath;
    private readonly SettingsService _sut;

    public SettingsServiceTests()
    {
        _tempPath = Path.Combine(Path.GetTempPath(), $"test_settings_{Guid.NewGuid()}.json");
        _sut = new SettingsService(_tempPath);
    }

    [Fact]
    public void Load_파일없을때_기본값반환()
    {
        var settings = _sut.Load();

        settings.Mail.PollIntervalSeconds.Should().Be(60);
        settings.Mail.MailboxName.Should().Be("Inbox");
        settings.Mail.FetchUnreadOnly.Should().BeTrue();
        settings.Mail.MaxFetchCount.Should().Be(50);
        settings.DailyMaxApiCalls.Should().Be(200);
    }

    [Fact]
    public void Save_후_Load시_값이_유지된다()
    {
        var original = new AppSettings
        {
            Mail = new MailSettings
            {
                PollIntervalSeconds = 120,
                UserEmail = "test@example.com",
                MailboxName = "Inbox",
                FetchUnreadOnly = false,
                MaxFetchCount = 30
            },
            DailyMaxApiCalls = 100
        };

        _sut.Save(original);
        var loaded = _sut.Load();

        loaded.Mail.PollIntervalSeconds.Should().Be(120);
        loaded.Mail.UserEmail.Should().Be("test@example.com");
        loaded.Mail.FetchUnreadOnly.Should().BeFalse();
        loaded.DailyMaxApiCalls.Should().Be(100);
    }

    [Fact]
    public void SetClientSecret_암호화되어저장된다()
    {
        var settings = new AppSettings();
        _sut.SetClientSecret(settings, "my-secret-value");

        settings.Auth.EncryptedClientSecret.Should().NotBeNullOrEmpty();
        settings.Auth.EncryptedClientSecret.Should().NotBe("my-secret-value");
    }

    [Fact]
    public void GetClientSecret_복호화하여평문반환()
    {
        var settings = new AppSettings();
        _sut.SetClientSecret(settings, "my-secret-value");

        var decrypted = _sut.GetClientSecret(settings);

        decrypted.Should().Be("my-secret-value");
    }

    [Theory]
    [InlineData(10)]   // 최소(30) 미만
    [InlineData(9999)] // 최대(3600) 초과
    public void Load_폴링주기범위위반시_기본값60초적용(int invalidInterval)
    {
        var settings = new AppSettings { Mail = new MailSettings { PollIntervalSeconds = invalidInterval } };
        _sut.Save(settings);

        var loaded = _sut.Load();

        loaded.Mail.PollIntervalSeconds.Should().Be(60);
    }

    public void Dispose()
    {
        if (File.Exists(_tempPath))
            File.Delete(_tempPath);
    }
}
```

**Step 5: 테스트 실행**

```bash
dotnet test tests/MailTermAnalyzer.Tests/ --filter "SettingsServiceTests" -v
```

예상 출력: `Passed! - Failed: 0, Passed: 6`

**Step 6: 커밋**

```bash
git add src/MailTermAnalyzer.Core/Settings/ src/MailTermAnalyzer.Infrastructure/Settings/ tests/MailTermAnalyzer.Tests/Settings/
git commit -m "feat: AppSettings 모델 및 설정 저장/로드 서비스 구현 (DPAPI 암호화)"
```

---

### Task 3: 트레이 아이콘 및 메인 윈도우 기본 구조

**우선순위:** Must Have | **복잡도:** 중 | **예상 소요:** 60분

> 정책 참조: POL-UI (UI-01, UI-02, UI-07)

**Files:**
- Modify: `src/MailTermAnalyzer.App/App.xaml`
- Modify: `src/MailTermAnalyzer.App/App.xaml.cs`
- Modify: `src/MailTermAnalyzer.App/MainWindow.xaml`
- Modify: `src/MailTermAnalyzer.App/MainWindow.xaml.cs`
- Create: `src/MailTermAnalyzer.App/Assets/tray-icon.ico` (아이콘 파일 준비 필요)

**Step 1: App.xaml.cs - 트레이 아이콘 초기화**

```csharp
// src/MailTermAnalyzer.App/App.xaml.cs
using H.NotifyIcon;
using Microsoft.UI.Xaml;

namespace MailTermAnalyzer.App;

public partial class App : Application
{
    private TaskbarIcon? _trayIcon;
    public MainWindow? MainWindow { get; private set; }

    public App()
    {
        InitializeComponent();
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        MainWindow = new MainWindow();
        InitializeTrayIcon();
        // 앱 시작 시 메인 윈도우를 표시하지 않고 트레이에서 대기
        // 필요 시 아래 줄 주석 해제하여 시작 시 윈도우 표시
        // MainWindow.Activate();
    }

    private void InitializeTrayIcon()
    {
        _trayIcon = new TaskbarIcon
        {
            IconSource = new BitmapImage(new Uri("ms-appx:///Assets/tray-icon.ico")),
            ToolTipText = "메일 용어 분석기"
        };

        // 좌클릭: 메인 윈도우 표시/숨김 토글 (UI-01)
        _trayIcon.LeftClickCommand = new RelayCommand(ToggleMainWindow);

        // 우클릭 컨텍스트 메뉴 (UI-01)
        var contextMenu = new MenuFlyout();
        contextMenu.Items.Add(new MenuFlyoutItem { Text = "열기", Command = new RelayCommand(ShowMainWindow) });
        contextMenu.Items.Add(new MenuFlyoutItem { Text = "환경설정", Command = new RelayCommand(ShowSettings) });
        contextMenu.Items.Add(new MenuFlyoutItem { Text = "메일 즉시 확인", Command = new RelayCommand(CheckMailNow) });
        contextMenu.Items.Add(new MenuFlyoutSeparator());
        contextMenu.Items.Add(new MenuFlyoutItem { Text = "종료", Command = new RelayCommand(ExitApp) });
        _trayIcon.ContextFlyout = contextMenu;
    }

    private void ToggleMainWindow()
    {
        if (MainWindow is null) return;
        if (MainWindow.Visible)
            MainWindow.Hide();
        else
            ShowMainWindow();
    }

    public void ShowMainWindow()
    {
        MainWindow?.Activate();
        MainWindow?.Show();
    }

    private void ShowSettings()
    {
        // Task 4에서 구현
        ShowMainWindow();
    }

    private void CheckMailNow()
    {
        // Sprint 2에서 구현 (메일 수신 서비스 연동)
    }

    private void ExitApp()
    {
        _trayIcon?.Dispose();
        MainWindow?.Close();
        Environment.Exit(0);
    }

    /// <summary>트레이 풍선 알림 표시 (UI-02)</summary>
    public void ShowBalloonNotification(string title, string message)
    {
        _trayIcon?.ShowNotification(title, message);
    }
}
```

**Step 2: MainWindow.xaml - 기본 레이아웃**

```xml
<!-- src/MailTermAnalyzer.App/MainWindow.xaml -->
<Window
    x:Class="MailTermAnalyzer.App.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="메일 용어 분석기">

    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- 상단 타이틀바 영역 -->
        <TextBlock Grid.Row="0" Text="메일 용어 분석기"
                   Style="{StaticResource TitleTextBlockStyle}"
                   Margin="16,12"/>

        <!-- 중앙 콘텐츠 (Sprint 5에서 용어사전 뷰어로 교체) -->
        <StackPanel Grid.Row="1"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Center"
                    Spacing="8">
            <TextBlock Text="시스템 트레이에서 실행 중입니다."
                       Style="{StaticResource BodyTextBlockStyle}"
                       HorizontalAlignment="Center"/>
            <TextBlock x:Name="StatusText"
                       Text="마지막 메일 확인: -"
                       Style="{StaticResource CaptionTextBlockStyle}"
                       HorizontalAlignment="Center"
                       Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
        </StackPanel>

        <!-- 하단 상태 표시줄 (UI-04) -->
        <Border Grid.Row="2"
                BorderBrush="{ThemeResource DividerStrokeColorDefaultBrush}"
                BorderThickness="0,1,0,0"
                Padding="16,8">
            <TextBlock x:Name="FooterText"
                       Text="총 0개 용어 등록됨 | 마지막 메일 확인: -"
                       Style="{StaticResource CaptionTextBlockStyle}"
                       Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
        </Border>
    </Grid>
</Window>
```

**Step 3: MainWindow.xaml.cs - 닫기 트레이 최소화**

```csharp
// src/MailTermAnalyzer.App/MainWindow.xaml.cs
using Microsoft.UI.Xaml;

namespace MailTermAnalyzer.App;

public sealed partial class MainWindow : Window
{
    public bool Visible { get; private set; } = false;

    public MainWindow()
    {
        InitializeComponent();
        // 최소 윈도우 크기 설정 (POL-UI: UI-07) - AppWindow 활용
        AppWindow.Resize(new Windows.Graphics.SizeInt32(800, 600));

        // 닫기(X) 버튼 클릭 시 트레이로 최소화 (UI-01)
        AppWindow.Closing += OnWindowClosing;
    }

    private void OnWindowClosing(Microsoft.UI.Windowing.AppWindow sender,
        Microsoft.UI.Windowing.AppWindowClosingEventArgs args)
    {
        // 앱 종료가 아닌 Hide 처리 (UI-01: "앱 종료는 트레이 메뉴의 종료 항목을 통해서만")
        args.Cancel = true;
        Hide();
    }

    public new void Show()
    {
        Visible = true;
        Activate();
    }

    public new void Hide()
    {
        Visible = false;
        (Application.Current as App)?.MainWindow?.AppWindow.Hide();
    }
}
```

**Step 4: 빌드 확인**

```bash
dotnet build src/MailTermAnalyzer.App/
```

예상 출력: `Build succeeded.`

**Step 5: 커밋**

```bash
git add src/MailTermAnalyzer.App/
git commit -m "feat: 시스템 트레이 아이콘 및 메인 윈도우 기본 구조 구현 (UI-01, UI-02, UI-07)"
```

---

### Task 4: 환경설정 다이얼로그 UI

**우선순위:** Must Have | **복잡도:** 중 | **예상 소요:** 60분

> 정책 참조: POL-UI (UI-03), POL-AUTH (AUTH-01, AUTH-02), POL-MAIL (MAIL-01~03), POL-DATA (DATA-01), POL-TERM (TERM-02, TERM-05)

**Files:**
- Create: `src/MailTermAnalyzer.App/Views/SettingsDialog.xaml`
- Create: `src/MailTermAnalyzer.App/Views/SettingsDialog.xaml.cs`
- Create: `src/MailTermAnalyzer.App/ViewModels/SettingsViewModel.cs`

**Step 1: SettingsViewModel 작성**

```csharp
// src/MailTermAnalyzer.App/ViewModels/SettingsViewModel.cs
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MailTermAnalyzer.Core.Settings;
using MailTermAnalyzer.Infrastructure.Settings;

namespace MailTermAnalyzer.App.ViewModels;

/// <summary>
/// 환경설정 다이얼로그 ViewModel (POL-UI: UI-03)
/// </summary>
public partial class SettingsViewModel : ObservableObject
{
    private readonly SettingsService _settingsService;
    private readonly AppSettings _originalSettings;

    // --- 메일 계정 (UI-03: 계정 연결 상태만 표시) ---
    [ObservableProperty]
    private string _userEmail = string.Empty;

    [ObservableProperty]
    private string _accountStatus = "미설정";

    // --- 수신 설정 (POL-MAIL: MAIL-01~03) ---
    [ObservableProperty]
    private int _pollIntervalSeconds;

    [ObservableProperty]
    private bool _fetchUnreadOnly;

    [ObservableProperty]
    private int _maxFetchCount;

    // --- 저장 경로 (POL-DATA: DATA-01) ---
    [ObservableProperty]
    private string _outputAnalysisDir = string.Empty;

    // --- 용어 분석 (POL-TERM: TERM-02, TERM-05) ---
    [ObservableProperty]
    private int _dailyMaxApiCalls;

    [ObservableProperty]
    private string _stopWordsText = string.Empty; // 개행 구분 목록으로 편집

    public SettingsViewModel(SettingsService settingsService, AppSettings currentSettings)
    {
        _settingsService = settingsService;
        _originalSettings = currentSettings;
        LoadFromSettings(currentSettings);
    }

    private void LoadFromSettings(AppSettings settings)
    {
        UserEmail = settings.Mail.UserEmail;
        AccountStatus = string.IsNullOrEmpty(settings.Auth.TenantId) ? "미설정" : "연결됨";
        PollIntervalSeconds = settings.Mail.PollIntervalSeconds;
        FetchUnreadOnly = settings.Mail.FetchUnreadOnly;
        MaxFetchCount = settings.Mail.MaxFetchCount;
        OutputAnalysisDir = settings.OutputAnalysisDir;
        DailyMaxApiCalls = settings.DailyMaxApiCalls;
        StopWordsText = string.Join(Environment.NewLine, settings.StopWords);
    }

    /// <summary>현재 ViewModel 값을 AppSettings에 반영하고 저장한다 (UI-03: 저장 즉시 반영).</summary>
    [RelayCommand]
    public void Save()
    {
        _originalSettings.Mail.UserEmail = UserEmail;
        _originalSettings.Mail.PollIntervalSeconds = PollIntervalSeconds;
        _originalSettings.Mail.FetchUnreadOnly = FetchUnreadOnly;
        _originalSettings.Mail.MaxFetchCount = MaxFetchCount;
        _originalSettings.OutputAnalysisDir = OutputAnalysisDir;
        _originalSettings.DailyMaxApiCalls = DailyMaxApiCalls;
        _originalSettings.StopWords = StopWordsText
            .Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        _settingsService.Save(_originalSettings);
    }
}
```

**Step 2: SettingsDialog.xaml 작성**

```xml
<!-- src/MailTermAnalyzer.App/Views/SettingsDialog.xaml -->
<ContentDialog
    x:Class="MailTermAnalyzer.App.Views.SettingsDialog"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="환경설정"
    PrimaryButtonText="저장"
    CloseButtonText="취소"
    DefaultButton="Primary">

    <ScrollViewer VerticalScrollBarVisibility="Auto" MinWidth="480">
        <StackPanel Spacing="24" Padding="0,8">

            <!-- 1. 메일 계정 그룹 (UI-03) -->
            <StackPanel Spacing="8">
                <TextBlock Text="메일 계정"
                           Style="{StaticResource SubtitleTextBlockStyle}"/>
                <InfoBar x:Name="AccountStatusBar"
                         IsOpen="True"
                         IsClosable="False"
                         Severity="Informational"
                         Title="Azure AD 인증 정보는 환경변수로 관리됩니다."
                         Message="AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET 환경변수를 설정하세요."/>
                <TextBox x:Name="UserEmailBox"
                         Header="모니터링 계정 이메일"
                         PlaceholderText="user@example.com"
                         Text="{Binding UserEmail, Mode=TwoWay}"/>
                <TextBlock x:Name="AccountStatusText"
                           Text="{Binding AccountStatus}"
                           Foreground="{ThemeResource TextFillColorSecondaryBrush}"/>
            </StackPanel>

            <!-- 구분선 -->
            <Border BorderBrush="{ThemeResource DividerStrokeColorDefaultBrush}" BorderThickness="0,1,0,0"/>

            <!-- 2. 수신 설정 그룹 (POL-MAIL: MAIL-01~03) -->
            <StackPanel Spacing="8">
                <TextBlock Text="수신 설정"
                           Style="{StaticResource SubtitleTextBlockStyle}"/>
                <NumberBox x:Name="PollIntervalBox"
                           Header="메일 확인 주기 (초, 30~3600)"
                           Minimum="30" Maximum="3600" SpinButtonPlacementMode="Inline"
                           Value="{Binding PollIntervalSeconds, Mode=TwoWay}"/>
                <ToggleSwitch x:Name="UnreadOnlyToggle"
                              Header="읽지 않은 메일만 가져오기"
                              IsOn="{Binding FetchUnreadOnly, Mode=TwoWay}"/>
                <NumberBox x:Name="MaxFetchBox"
                           Header="1회 최대 가져오기 수"
                           Minimum="1" Maximum="200" SpinButtonPlacementMode="Inline"
                           Value="{Binding MaxFetchCount, Mode=TwoWay}"/>
            </StackPanel>

            <!-- 구분선 -->
            <Border BorderBrush="{ThemeResource DividerStrokeColorDefaultBrush}" BorderThickness="0,1,0,0"/>

            <!-- 3. 저장 경로 그룹 (POL-DATA: DATA-01) -->
            <StackPanel Spacing="8">
                <TextBlock Text="저장 경로"
                           Style="{StaticResource SubtitleTextBlockStyle}"/>
                <Grid ColumnSpacing="8">
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*"/>
                        <ColumnDefinition Width="Auto"/>
                    </Grid.ColumnDefinitions>
                    <TextBox Grid.Column="0"
                             Header="분석 요청 폴더 경로"
                             PlaceholderText="C:\AnalysisRequests"
                             x:Name="OutputDirBox"
                             Text="{Binding OutputAnalysisDir, Mode=TwoWay}"/>
                    <Button Grid.Column="1"
                            Content="폴더 선택"
                            VerticalAlignment="Bottom"
                            Click="OnBrowseFolderClick"/>
                </Grid>
            </StackPanel>

            <!-- 구분선 -->
            <Border BorderBrush="{ThemeResource DividerStrokeColorDefaultBrush}" BorderThickness="0,1,0,0"/>

            <!-- 4. 용어 분석 그룹 (POL-TERM: TERM-02, TERM-05) -->
            <StackPanel Spacing="8">
                <TextBlock Text="용어 분석"
                           Style="{StaticResource SubtitleTextBlockStyle}"/>
                <NumberBox x:Name="DailyMaxApiCallsBox"
                           Header="일일 최대 API 호출 횟수"
                           Minimum="1" Maximum="10000" SpinButtonPlacementMode="Inline"
                           Value="{Binding DailyMaxApiCalls, Mode=TwoWay}"/>
                <TextBox x:Name="StopWordsBox"
                         Header="불용어 목록 (한 줄에 하나씩)"
                         AcceptsReturn="True"
                         Height="100"
                         ScrollViewer.VerticalScrollBarVisibility="Auto"
                         Text="{Binding StopWordsText, Mode=TwoWay}"/>
            </StackPanel>

        </StackPanel>
    </ScrollViewer>
</ContentDialog>
```

**Step 3: SettingsDialog.xaml.cs 작성**

```csharp
// src/MailTermAnalyzer.App/Views/SettingsDialog.xaml.cs
using MailTermAnalyzer.App.ViewModels;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Windows.Storage.Pickers;
using WinRT.Interop;

namespace MailTermAnalyzer.App.Views;

public sealed partial class SettingsDialog : ContentDialog
{
    private readonly SettingsViewModel _viewModel;

    public SettingsDialog(SettingsViewModel viewModel)
    {
        InitializeComponent();
        _viewModel = viewModel;
        DataContext = _viewModel;

        PrimaryButtonClick += OnSaveClick;
    }

    private void OnSaveClick(ContentDialog sender, ContentDialogButtonClickEventArgs args)
    {
        _viewModel.SaveCommand.Execute(null);
    }

    /// <summary>폴더 선택 다이얼로그 (WinRT Interop으로 HWND 주입)</summary>
    private async void OnBrowseFolderClick(object sender, RoutedEventArgs e)
    {
        var picker = new FolderPicker();
        picker.SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.Desktop;
        picker.FileTypeFilter.Add("*");

        // WinUI 3에서는 HWND 주입 필요
        var hwnd = WindowNative.GetWindowHandle(
            (Application.Current as App)?.MainWindow);
        InitializeWithWindow.Initialize(picker, hwnd);

        var folder = await picker.PickSingleFolderAsync();
        if (folder is not null)
        {
            _viewModel.OutputAnalysisDir = folder.Path;
        }
    }
}
```

**Step 4: App.xaml.cs에서 설정 다이얼로그 연동**

`ShowSettings` 메서드를 업데이트하여 SettingsDialog를 열도록 수정:

```csharp
// App.xaml.cs의 ShowSettings 메서드 업데이트
private async void ShowSettings()
{
    ShowMainWindow();
    var settingsService = new MailTermAnalyzer.Infrastructure.Settings.SettingsService(
        Path.Combine(AppContext.BaseDirectory, "appsettings.local.json"));
    var settings = settingsService.Load();
    var viewModel = new ViewModels.SettingsViewModel(settingsService, settings);
    var dialog = new Views.SettingsDialog(viewModel) { XamlRoot = MainWindow?.Content?.XamlRoot };
    await dialog.ShowAsync();
}
```

**Step 5: 빌드 확인**

```bash
dotnet build src/MailTermAnalyzer.App/
```

예상 출력: `Build succeeded.`

**Step 6: 커밋**

```bash
git add src/MailTermAnalyzer.App/Views/ src/MailTermAnalyzer.App/ViewModels/
git commit -m "feat: 환경설정 다이얼로그 UI 구현 (4개 설정 그룹, MVVM, 폴더 선택)"
```

---

### Task 5: 전체 빌드 검증 및 스프린트 1 완료

**우선순위:** Must Have | **복잡도:** 낮 | **예상 소요:** 20분

**Step 1: Release 빌드 확인**

```bash
dotnet build --configuration Release
```

예상 출력: `Build succeeded.`

**Step 2: 단위 테스트 전체 실행**

```bash
dotnet test tests/MailTermAnalyzer.Tests/ -v
```

예상 출력: `Passed! - Failed: 0, Passed: 6`

**Step 3: 최종 커밋**

```bash
git add .
git commit -m "chore: Sprint 1 전체 빌드 검증 완료"
```

---

## 완료 기준 (Definition of Done)

| 항목 | 기준 | 검증 방법 |
|------|------|-----------|
| ✅ 빌드 성공 | `dotnet build --configuration Release` 오류 없음 | CI/로컬 빌드 |
| ✅ 단위 테스트 통과 | 설정 로드/저장 6개 테스트 전부 PASS | `dotnet test` |
| ⬜ 트레이 아이콘 표시 | 앱 실행 시 시스템 트레이에 아이콘 노출 | 수동 실행 확인 |
| ⬜ 트레이 클릭 → 윈도우 열림 | 좌클릭 시 메인 윈도우 표시 | 수동 실행 확인 |
| ⬜ 우클릭 메뉴 5개 항목 | 열기/환경설정/메일 즉시 확인/구분선/종료 | 수동 실행 확인 |
| ⬜ X 버튼 → 트레이 최소화 | 닫기 클릭 시 앱 종료 아닌 트레이 이동 | 수동 실행 확인 |
| ⬜ 환경설정 다이얼로그 렌더링 | 4개 설정 그룹 UI 정상 표시 | 수동 실행 확인 |
| ⬜ 설정 저장 후 복원 | 저장 후 앱 재시작 시 입력값 유지 | 수동 실행 확인 |
| ⬜ Client Secret DPAPI 암호화 | 저장된 JSON에 평문 시크릿 없음 | 파일 직접 확인 |

---

## 수동 검증 시나리오 (deploy.md 참조)

아래 항목은 빌드 후 직접 앱을 실행하여 확인이 필요합니다.

**트레이 아이콘 검증 절차:**
1. `dotnet run --project src/MailTermAnalyzer.App/` 또는 빌드된 .exe 실행
2. 시스템 트레이(작업 표시줄 오른쪽 하단) 영역에 앱 아이콘 확인
3. 아이콘 좌클릭 → 메인 윈도우 표시 확인
4. 메인 윈도우 X 버튼 클릭 → 앱 종료 아닌 트레이 이동 확인
5. 트레이 아이콘 우클릭 → 5개 메뉴 항목 확인

**환경설정 검증 절차:**
1. 트레이 우클릭 → "환경설정" 클릭
2. 설정 다이얼로그 열림 확인
3. 수신 설정 > 폴링 주기를 120으로 변경
4. "저장" 클릭
5. 앱 재실행 → 환경설정 열기 → 폴링 주기 120 유지 확인

---

## 예상 산출물

| 산출물 | 경로 |
|--------|------|
| WinUI 3 솔루션 | `MailTermAnalyzer.sln` |
| 앱 프로젝트 | `src/MailTermAnalyzer.App/` |
| Core 프로젝트 (설정 모델) | `src/MailTermAnalyzer.Core/Settings/` |
| Infrastructure 프로젝트 (설정 서비스) | `src/MailTermAnalyzer.Infrastructure/Settings/` |
| 단위 테스트 | `tests/MailTermAnalyzer.Tests/Settings/` |
| 설정 파일 | `appsettings.local.json` (런타임 생성, .gitignore 등록) |

---

## 기술 고려사항

- **H.NotifyIcon.WinUI**: 패키지 설치 후 `TaskbarIcon`을 App.xaml에 리소스로 선언하는 방식과 코드-비하인드 방식 중 공식 문서 예제를 따른다.
- **WinUI 3 FolderPicker**: Unpackaged 앱의 경우 `InitializeWithWindow.Initialize(picker, hwnd)` 호출이 필수이다.
- **AppWindow.Hide()**: WinUI 3에서 윈도우를 숨기려면 `AppWindow.Hide()`를 사용한다. `Window.Hide()`는 직접 호출 불가.
- **DPAPI**: `System.Security.Cryptography.ProtectedData`는 `System.Security.Cryptography.ProtectedData` NuGet 패키지가 필요할 수 있다 (.NET Core 계열). `dotnet add package System.Security.Cryptography.ProtectedData`로 추가.
- **ContentDialog XamlRoot**: WinUI 3에서 ContentDialog를 표시하려면 반드시 `XamlRoot`를 설정해야 한다.
