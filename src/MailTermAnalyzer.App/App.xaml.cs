using H.NotifyIcon;
using MailTermAnalyzer.Infrastructure.Settings;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using System.IO;
using Windows.Foundation;

namespace MailTermAnalyzer.App;

public partial class App : Application
{
    private TaskbarIcon? _trayIcon;
    public MainWindow? MainWindow { get; private set; }

    private readonly SettingsService _settingsService;

    public App()
    {
        InitializeComponent();
        _settingsService = new SettingsService(
            Path.Combine(AppContext.BaseDirectory, "appsettings.local.json"));
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        MainWindow = new MainWindow();
        InitializeTrayIcon();
        // 앱 시작 시 트레이 대기 (메인 윈도우 표시 안 함)
    }

    private void InitializeTrayIcon()
    {
        _trayIcon = new TaskbarIcon
        {
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
        if (MainWindow.IsVisible)
            MainWindow.HideWindow();
        else
            ShowMainWindow();
    }

    public void ShowMainWindow()
    {
        MainWindow?.ShowWindow();
    }

    private async void ShowSettings()
    {
        ShowMainWindow();
        if (MainWindow?.Content?.XamlRoot is null) return;
        var settings = _settingsService.Load();
        var viewModel = new ViewModels.SettingsViewModel(_settingsService, settings);
        var dialog = new Views.SettingsDialog(viewModel)
        {
            XamlRoot = MainWindow.Content.XamlRoot
        };
        await dialog.ShowAsync();
    }

    private void CheckMailNow()
    {
        // Sprint 2에서 구현 (메일 수신 서비스 연동)
    }

    private void ExitApp()
    {
        _trayIcon?.Dispose();
        MainWindow?.Close();
        System.Environment.Exit(0);
    }

    /// <summary>트레이 풍선 알림 표시 (UI-02)</summary>
    public void ShowBalloonNotification(string title, string message)
    {
        _trayIcon?.ShowNotification(title, message);
    }
}

/// <summary>간단한 커맨드 구현 (MVVM 없이 트레이 메뉴 바인딩용)</summary>
internal class RelayCommand : System.Windows.Input.ICommand
{
    private readonly Action _execute;

    public RelayCommand(Action execute) => _execute = execute;

    public event EventHandler? CanExecuteChanged;

    public bool CanExecute(object? parameter) => true;

    public void Execute(object? parameter) => _execute();
}
