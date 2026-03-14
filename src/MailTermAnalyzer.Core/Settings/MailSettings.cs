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
