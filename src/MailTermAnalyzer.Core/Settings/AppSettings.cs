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
