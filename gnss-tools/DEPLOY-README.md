# GNSS 时间工具部署指南

本项目是纯前端静态站点，不需要后端或数据库。构建结果可直接部署到静态网站托管服务，并作为 PWA 安装到电脑或手机主屏幕。

## Windows 和 Linux 免安装桌面版

从 [GitHub Releases](https://github.com/Maybe2future/GNSS-TOOLS/releases/latest) 下载对应附件即可，无需安装 Node.js：

- Windows x64：下载 [`GNSS-Time-Tool-Windows-x64.exe`](https://github.com/Maybe2future/GNSS-TOOLS/releases/latest/download/GNSS-Time-Tool-Windows-x64.exe) 并双击。未进行商业代码签名，可能出现 SmartScreen 提示。
- Linux x64：下载 [`GNSS-Time-Tool-Linux-x64.AppImage`](https://github.com/Maybe2future/GNSS-TOOLS/releases/latest/download/GNSS-Time-Tool-Linux-x64.AppImage)，允许执行后双击。缺少 FUSE 时可使用 `./GNSS-Time-Tool-Linux-x64.AppImage --appimage-extract-and-run`。
- 应用通过 `127.0.0.1` 随机空闲端口提供内置静态资源，外部网站链接交给系统默认浏览器打开；关闭应用窗口即停止本地服务。

### 自行打包

要求 Node.js 22.12 或更高版本，包管理器使用 pnpm 10.28.2。以下命令在 `gnss-tools/` 中执行：

```bash
pnpm install
pnpm check
pnpm test:desktop
pnpm desktop:dist
```

结果输出到 `release/`。Windows 便携版在 Windows 构建，Linux AppImage 在 Linux 构建。仓库根目录的 `.github/workflows/desktop-release.yml` 会在推送 `v*.*.*` 标签后分别构建两个平台，并将附件汇总到同名 GitHub Release；标签必须与 `package.json` 中的版本一致。`test:desktop` 专门验证根路径桌面构建，因此不要在运行它时设置 `NEXT_PUBLIC_BASE_PATH`。

## 1. 本地检查与构建

要求 Node.js 22.12 或更高版本，包管理器使用 pnpm 10.28.2。

```bash
cd gnss-tools
pnpm install
pnpm check
pnpm build
```

`pnpm check` 会先完成生产构建并生成 Next.js 类型，再依次执行类型检查、ESLint 和 77 项算法测试，确保干净克隆的仓库也能直接运行。完整静态网站输出到 `out/`，部署时必须上传整个目录，包括：

- `_next/` 中的脚本、样式和字体；
- 各路由的 `index.html` 与 `index.txt`；
- `manifest.webmanifest`；
- `sw.js`；
- `icons/`。

## 2. 一键部署到公开网页

### Cloudflare Pages：网页上传

1. 打开 Cloudflare 的 Workers & Pages，创建 Pages 项目。
2. 选择上传静态资源，将本地 `out/` 目录中的全部内容上传。
3. 部署完成后使用平台分配的 HTTPS 地址访问。
4. 后续更新时重新构建并创建新部署。

### Vercel

```bash
npx vercel deploy --prod
```

按命令行提示登录并选择项目。项目已经配置静态导出，不需要额外后端函数。

### GitHub Pages

仓库根目录的 `.github/workflows/pages.yml` 会在 `main` 分支更新后自动检查、构建并部署到 `https://maybe2future.github.io/GNSS-TOOLS/`。工作流通过 `NEXT_PUBLIC_BASE_PATH=/GNSS-TOOLS` 配置 Next.js 子路径；PWA 清单使用相对路径，Service Worker 根据注册作用域缓存资源，因此同一套源码也支持本地根目录运行。

也可以在其他静态托管服务中发布 `out/`。部署到 `/some-prefix/` 子路径时，在构建命令前设置 `NEXT_PUBLIC_BASE_PATH=/some-prefix`；部署到域名根目录时无需设置该变量。

## 3. 自有服务器与 Nginx

把 `out/` 上传到例如 `/var/www/gnss-tools/`，参考配置：

```nginx
server {
    listen 80;
    server_name 你的域名;
    root /var/www/gnss-tools;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location = /sw.js {
        default_type application/javascript;
        add_header Cache-Control "no-cache";
    }
}
```

生产环境应使用 HTTPS。Service Worker 只在 HTTPS 或 localhost 等安全上下文运行，且服务器必须将 `.js` 返回为 JavaScript MIME 类型，不能返回 `text/plain`。

## 4. 安装到电脑和手机

页面右上角提供“安装应用”入口：

- 支持原生安装提示的浏览器会直接打开安装流程。
- 不支持安装事件的浏览器会显示菜单操作指引。
- iPhone／iPad 使用 Safari 的“分享”→“添加到主屏幕”。

安装后可通过独立窗口启动。首次必须在线打开，让 Service Worker 完成缓存；之后可离线重载已预缓存的全部功能页。在线时优先获取最新 HTML 和 RSC 数据，离线时使用缓存。

当前交付是 PWA，不是应用商店中的原生 APK／IPA。如必须上架商店，可后续使用 Capacitor 封装。

## 5. 更新与缓存注意事项

- 每次发布都完整替换 `out/`，不要混用不同构建的 `_next/` 文件。
- 修改缓存策略、预缓存列表或应用图标时，递增 `public/sw.js` 中的 `CACHE_NAME`，确保旧缓存被清理。
- 不要对 `sw.js` 设置长期不可变缓存，否则浏览器可能延迟发现更新。
- 离线功能只处理同源 GET 请求，不会缓存用户上传的星历文件或外部网站内容。

## 6. 常见问题

**页面能打开但样式或脚本 404**

确认 `_next/` 已完整上传，并且没有混用新旧构建。

**子页面刷新 404**

项目已使用目录形式导出，例如 `/converter/index.html`。Nginx 的 `try_files` 必须包含 `$uri/`。

**安装按钮没有出现原生弹窗**

检查是否使用 HTTPS 或 localhost，以及浏览器是否支持 PWA；也可以按照按钮中的手动安装说明操作。

**本地验证离线功能失败**

先用支持正确 MIME 类型的静态服务器打开生产构建，等待 Service Worker 激活，再停止服务器测试。直接双击 HTML 或使用 `file://` 不支持 PWA。

**算法回归测试**

`pnpm test` 当前包含 77 项测试：时间转换 42＋11 项、SP3 13 项、广播星历 11 项。详细结果见 `TEST-REPORT.md`。
