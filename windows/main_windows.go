package main

import (
	"embed"
	"encoding/json"
	webview "github.com/jchv/go-webview2"
	"github.com/jchv/go-webview2/webviewloader"
	"io/fs"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"syscall"
	"unsafe"
)

//go:embed web/*
var files embed.FS

func alert(s string) {
	dll := syscall.NewLazyDLL("user32.dll")
	p := dll.NewProc("MessageBoxW")
	text, _ := syscall.UTF16PtrFromString(s)
	title, _ := syscall.UTF16PtrFromString("梨梨画室")
	p.Call(0, uintptr(unsafe.Pointer(text)), uintptr(unsafe.Pointer(title)), 0)
}
func main() {
	if _, err := webviewloader.GetInstalledVersion(); err != nil {
		alert("请先安装 Microsoft Edge WebView2 Runtime，再打开画室。下载地址见使用说明。")
		return
	}
	ln, e := net.Listen("tcp4", "127.0.0.1:17866")
	if e != nil {
		alert("画室可能已打开，或 17866 端口已占用。请关闭旧窗口后重试。")
		return
	}
	defer ln.Close()
	assets, _ := fs.Sub(files, "web")
	nonceValue := newNonce()
	home, _ := os.UserHomeDir()
	go http.Serve(ln, desktopHandler(assets, nonceValue, filepath.Join(home,"Downloads","PearAtelier")))
	dir := filepath.Join(os.Getenv("LOCALAPPDATA"), "PearAtelier", "WebView")
	w := webview.NewWithOptions(webview.WebViewOptions{DataPath: dir, AutoFocus: true, WindowOptions: webview.WindowOptions{Title: "梨梨画室", IconId: 1, Width: 1100, Height: 800, Center: true}})
	if w == nil {
		alert("请先安装 Microsoft Edge WebView2 Runtime，再打开画室。")
		return
	}
	defer w.Destroy()
	nonce, _ := json.Marshal(nonceValue)
	w.Init("if(window===window.top && location.origin==='http://127.0.0.1:17866'){window.__pearDesktopNonce=" + string(nonce) + ";}")
	w.Navigate("http://127.0.0.1:17866/")
	w.Run()
}
