package main

import (
    "embed"
    "log"

    "github.com/wailsapp/wails/v2"
    "github.com/wailsapp/wails/v2/pkg/options"
    "github.com/wailsapp/wails/v2/pkg/options/assetserver"
    "github.com/wailsapp/wails/v2/pkg/options/mac"
    "github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
    app := NewApp()

    err := wails.Run(&options.App{
        Title:     "Media Maestro",
        Width:     1280,
        Height:    800,
        MinWidth:  900,
        MinHeight: 600,
        AssetServer: &assetserver.Options{
            Assets: assets,
        },
        OnStartup:     app.startup,
        OnShutdown:    app.shutdown,
        OnBeforeClose: app.beforeClose,
        Bind: []interface{}{
            app,
        },
        Mac: &mac.Options{
            TitleBar: &mac.TitleBar{
                HideTitleBar: true,
            },
            WebviewIsTransparent: false,
            WindowIsTranslucent:  false,
        },
        Windows: &windows.Options{
            WebviewIsTransparent: true,
            WindowIsTranslucent:  false,
            DisableWindowIcon:    false,
        },
        Debug: options.Debug{
            OpenInspectorOnStartup: false,
        },
    })

    if err != nil {
        log.Fatalf("Failed to start Media Maestro: %v", err)
    }
}