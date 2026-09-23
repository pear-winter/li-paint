# ♪ 梨梨画室

独立 NovelAI 绘图工具，包含安卓 APK 与网页版。没有酒馆依赖，也没有酒馆正文标签捕获功能。

## 安卓安装

[下载 1.0.1 APK](downloads/pear-atelier-1.0.1.apk)。GitHub 手机页面如展示文件信息，请选择下载原始文件。

安卓 8 及以上，需较新的 Android System WebView。已安装 1.0 的用户可直接覆盖安装；沿用同一签名。1.0.1 使用梨梨指定的人物图标。

## 网页部署：Cloudflare Workers

仓库已包含完整部署配置，网页本身没有 ChatGPT 登录逻辑。仓库上传完成不等于网站已经发布。

1. 登录自己的 Cloudflare 账号，进入 **Workers & Pages**，创建 Worker 并选择连接 GitHub 仓库。
2. 授权 **pear-winter/li-paint**，选择分支 **main**。
3. 项目名称填写 **li-paint**，根目录保留仓库根目录。
4. 构建命令填 **npm run build**，部署命令填 **npx wrangler deploy**。
5. 完成部署后打开 Cloudflare 显示的实际网址。后续向 main 推送修改可自动更新。

不用在 Cloudflare 环境变量或 GitHub 仓库里填 NovelAI Key。打开画室后，每位使用者在「设置」中填写自己的接口与 Key。

也可通过 Pages 直接上传部署：将 dist/server/index.js 放到压缩包根目录并命名为 _worker.js，连同 dist 下的前端文件压缩，上传到 Pages。不要只上传前端文件，官网接口转发需要 _worker.js。

## 功能

绘图、Vibe 库、图库、设置四页；提示词与参数保存、图生图、局部重绘、精确参考、PNG 元数据解析、Vibe 组导入导出、收藏与相册、按日期筛选及批量下载。内置黑白、粉白、粉白圆角、白绿虚线主题。

图库、Vibe、设置与 Key 保存在当前设备的浏览器/应用存储。网页与 APK 不自动同步；卸载应用或清理站点数据会清除本地内容。网页官网请求通过此 Worker 转发到固定的 NovelAI 域名，不在服务器保存 Key；第三方接口由浏览器直接请求，需要接口允许跨域。

PNG 若只含 Vibe 参数而没有嵌入编码或原图，无法仅凭参数还原 Vibe 素材。

## 本地检查

需要 Node.js 22 或更新版本：

```sh
npm run build
npm run check
npm test
```

`dist/` 为前端源文件，`server/handler.js` 为接口转发与静态资源处理。构建生成 `dist/server/index.js`。

## 安卓构建

Java 17、Android SDK platform/build-tools 35.0.0、ECJ 3.38.0。配置 `ANDROID_SDK_ROOT`、`ECJ_JAR`、`PEAR_SIGNING_DIR`，执行 `python3 android/build-apk.py`。

签名目录需包含 `release.p12`（别名 pear）与 `password.txt`。签名备份由梨梨单独保管，不上传仓库；更新 APK 必须继续使用同一签名。

## 验证范围

已完成独立界面初始化与模拟生图流程测试、接口转发路由/权限/重定向测试，以及 APK 签名校验。尚未完成真实账号付费生图或安卓实机全面测试。


## 1.0.2 设置迁移与主题

设置 → 全部设置 · 导入与导出：备份提示词、人物、参数、API 配置、点数记录、按钮与美化。可勾选包含 Key（默认不含）及 Vibe / 参考图（默认包含）。JSON 文件可在 APK 和网页之间互相导入；图库、收藏和相册不在设置备份中，导入不会删除它们。导入前检查格式并显示替换范围，确认后重新打开页面。未包含的 Key 只会保留同一 ID、网址与类型的本地 Key。

黑白线框始终内置。新增“跟随酒馆主题”以及“导入酒馆主题配色”：同页面可读取 SmartTheme 变量，独立网页 / APK 需要导入酒馆导出的主题 JSON，无法实时读取其他应用。没有颜色时使用深灰回退。

升级 APK 请覆盖安装 1.0.2，不要卸载。Pages 项目通过“创建新部署”上传新包，继续使用原网址，保留浏览器本地数据。
