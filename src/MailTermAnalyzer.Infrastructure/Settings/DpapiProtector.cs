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
