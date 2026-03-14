using FluentAssertions;
using MailTermAnalyzer.Core.Settings;
using MailTermAnalyzer.Infrastructure.Settings;
using Xunit;

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
