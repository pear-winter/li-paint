# ♪ 梨梨画室 3.17.0

同步梨梨的《♪ 梨梨画室 v3.17.0》脚本，包含独立 APK、网页、Windows EXE 与原生 SillyTavern 扩展。独立版保留绘图、元数据库、Vibe 库、图库、设置五页；酒馆扩展另外保留正文抓取、文生图配置和聊天插图按钮。

## 3.17.0 更新

- 同步新脚本：绘画进度条、已用时间、预计剩余时间、排队数量。进度按相似任务历史耗时估算，不是服务端真实采样步数。
- 停止或失败显示「未完成」，不再被残留刷新改成完成；关闭画室扩展时清理进度计时器。
- 原生酒馆扩展增加兼容层，最低版本从 1.19 下调至 1.10；补齐旧版上下文缺少的设置、保存和聊天标识接口。
- 正文图片交由当前酒馆的 saveBase64AsFile 保存，适配旧 /uploadimage、新 /api/images/upload，以及 data URL / 裸 base64 的格式差异。
- 兼容没有 APP_READY 事件、事件已经触发、禁用再启用等启动场景；非 HTTPS 的本地酒馆提供安全随机 UUID 回退。
- 保留 3.16.4 的画师串参数、种子手动应用、副 API 中文翻译和五页独立网页。

本次交付网站 ZIP，上传到原 Cloudflare Pages 项目后上线。APK 仍为 3.11.1，Windows EXE 仍为 3.9.1，本次未重新打包。

已通过语法和模拟测试：旧图库/设置、Vibe/元数据、生图排队、画师串/种子/翻译、进度成功/失败/停止清理，以及 1.10.0、1.12.0、1.19.0 的上下文启动与原始图片上传函数。未启动这些版本的完整酒馆服务器或调用付费生图/翻译接口；其他旧版分支仍可能需要具体适配。请使用较新的浏览器（PNG/ZIP 解压需要 DecompressionStream）。

## 安卓

[下载 APK](downloads/pear-atelier-3.11.1.apk)。安卓 8 及以上，使用较新的 Android System WebView。

沿用原包名 net.pearatelier.app、原签名和原存储地址。直接覆盖安装，不卸载旧版。versionCode 7，版本 3.11.1。

## Windows

Windows 安装文件为 `pear-atelier-3.9.1.exe`，由此前交付附件提供，也可按下方说明构建。Windows 10/11 x64，双击打开。需要 Microsoft Edge WebView2 Runtime。文件未做 Windows 商业代码签名。

画室设置与图库保存在 `%LOCALAPPDATA%/PearAtelier/WebView`，导出的图片/JSON 默认保存到用户目录 `Downloads/PearAtelier`。高 DPI 使用 PerMonitorV2；原生接口桥支持 HTTPS、取消请求及二进制图片响应。固定本地端口 17866，重复打开时会提示关闭旧窗口。

## 酒馆扩展

SillyTavern 1.10 或更新版（已对 1.10.0 / 1.12.0 / 1.19.0 接口做兼容测试，不代表所有旧版本和分支都完成实机验证）。通过「扩展 → 安装扩展」粘贴 https://github.com/pear-winter/li-paint 安装本公开仓库。仓库根目录 manifest.json 是扩展清单。

先关闭酒馆助手里旧的「梨梨画室」脚本，再启用本扩展，避免两个入口同时接管画室。不要删除旧画室数据。扩展继续使用 `extensionSettings.pear_nai_studio` 和原 scope 对应的 IndexedDB，保存的设置和本地图库继续读取。首次打开点原来的画室图标；不需要酒馆助手运行。

如果使用扩展 ZIP，解压后将 `lili-atelier-extension` 整个目录放入 `SillyTavern/public/scripts/extensions/third-party/`，确认目录下直接有 manifest.json，再刷新酒馆。

## 网站更新

原网站：https://li-paint.pages.dev

现有 Pages 项目为直接上传模式，推送 GitHub 不会自动部署。在 Cloudflare → Workers & Pages → li-paint → 创建新部署 → Production，上传 [li-paint-pages-3.17.0.zip](downloads/li-paint-pages-3.17.0.zip)。继续用原网址，浏览器本地数据才会继续读取。

ZIP 根目录包含 `_worker.js` 和前端文件。官网请求转发至固定 NovelAI 域名，第三方接口需要允许浏览器跨域。不要在仓库或 Cloudflare 环境变量中写个人 Key；每位用户在画室设置中填写自己的接口。副 API 同样需要允许浏览器跨域的 HTTPS 地址；其凭证保存在本设备 IndexedDB，当前脚本的全部设置备份不包含副 API 配置。

## 数据与迁移

APK、网页、EXE 和酒馆各自保存在本设备，彼此不自动同步。在「设置 → 全部设置 · 导入与导出」迁移设置；图库、收藏和相册不包含在设置备份中。包含 Key 的备份应自己保管。卸载、清除应用数据或清除网站数据会清除本地内容。

## 构建

`src/studio.js` 是上传脚本的原始内容；`scripts/sync-studio.py` 生成独立版和原生扩展，保留原界面及主题。`scripts/runtime-patches.py` 对两个产物应用进度清理与 UUID 兼容修复；`extension/compat.js` 独立处理酒馆版本差异。

```sh
npm ci
npm test
npm run check
python3 scripts/package-pages.py
```

Android：Java 17、Android SDK 35.0.0、ECJ 3.38.0，配置 `ANDROID_SDK_ROOT`、`ECJ_JAR`、`PEAR_SIGNING_DIR` 后执行 `python3 android/build-apk.py`。签名目录包含 release.p12 和 password.txt（alias pear）；签名文件不入仓库。

Windows：Go 1.24+，执行 `python3 windows/build.py`；可通过 GO 指定 Go 可执行文件。使用仓库内图标及 DPI 清单，构建 x64 EXE。

## 历史验证范围

已验证旧 IndexedDB v2 升级保留图片、设置备份、元数据/Vibe 导入和页面切换、接口转发权限/重定向限制、桌面二进制响应与文件保存、新旧 APK 签名一致。Windows EXE 已交叉构建；尚未进行 Windows/Android 实机全面测试或真实付费生图。

## 旧版接口核对依据

- [1.10.0 上下文和保存函数](https://github.com/SillyTavern/SillyTavern/blob/1.10.0/public/script.js)
- [1.10.0 图片保存函数](https://github.com/SillyTavern/SillyTavern/blob/1.10.0/public/scripts/utils.js)
- [1.12.0 图片保存函数](https://github.com/SillyTavern/SillyTavern/blob/1.12.0/public/scripts/utils.js)
- [1.19.0 图片保存函数](https://github.com/SillyTavern/SillyTavern/blob/1.19.0/public/scripts/utils.js)

无需安装酒馆助手即可运行扩展。已有用户在扩展管理中更新梨梨画室后刷新页面即可；不要同时启用另一份画室脚本。
