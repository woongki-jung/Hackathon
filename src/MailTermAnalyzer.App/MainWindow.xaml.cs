using Microsoft.UI.Xaml;

namespace MailTermAnalyzer.App;

public sealed partial class MainWindow : Window
{
    public bool IsVisible { get; private set; } = false;

    public MainWindow()
    {
        InitializeComponent();
        // 기본 크기 설정 (POL-UI: UI-07)
        AppWindow.Resize(new Windows.Graphics.SizeInt32(800, 600));

        // 닫기(X) 버튼 클릭 시 트레이로 최소화 (UI-01)
        AppWindow.Closing += OnWindowClosing;
    }

    private void OnWindowClosing(Microsoft.UI.Windowing.AppWindow sender,
        Microsoft.UI.Windowing.AppWindowClosingEventArgs args)
    {
        // 앱 종료가 아닌 Hide 처리 (UI-01: "앱 종료는 트레이 메뉴의 종료 항목을 통해서만")
        args.Cancel = true;
        HideWindow();
    }

    public void ShowWindow()
    {
        IsVisible = true;
        AppWindow.Show();
        Activate();
    }

    public void HideWindow()
    {
        IsVisible = false;
        AppWindow.Hide();
    }
}
