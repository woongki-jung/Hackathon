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
