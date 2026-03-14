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
        picker.SuggestedStartLocation = PickerLocationId.Desktop;
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
