using System.Text.Json;
using MailTermAnalyzer.Core.Settings;

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
