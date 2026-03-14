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
    private readonly AppSettings _settings;

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
        _settings = currentSettings;
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
        _settings.Mail.UserEmail = UserEmail;
        _settings.Mail.PollIntervalSeconds = PollIntervalSeconds;
        _settings.Mail.FetchUnreadOnly = FetchUnreadOnly;
        _settings.Mail.MaxFetchCount = MaxFetchCount;
        _settings.OutputAnalysisDir = OutputAnalysisDir;
        _settings.DailyMaxApiCalls = DailyMaxApiCalls;
        _settings.StopWords = StopWordsText
            .Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        _settingsService.Save(_settings);
    }
}
