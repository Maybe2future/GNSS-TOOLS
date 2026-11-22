# GNSS-TOOLS · GNSS 工具集

面向 GNSS 日常数据处理的纯前端工具集。支持网页在线使用，也提供 Windows、Linux 免安装桌面版；计算均在本机浏览器或应用窗口内完成，不上传用户星历文件。

## 直接使用

### 在线网页

[打开 GNSS 工具集](https://maybe2future.github.io/GNSS-TOOLS/)，无需安装，可添加到桌面或手机主屏幕。

### 免安装桌面版

前往 [GitHub Releases 最新版本](https://github.com/Maybe2future/GNSS-TOOLS/releases/latest)，根据系统下载对应附件：

| 平台 | 附件后缀 | 使用方法 |
| --- | --- | --- |
| Windows x64 | `-Windows-x64.exe` | 下载后双击运行，无需安装 Node.js 或其他运行环境 |
| Linux x64 | `-Linux-x64.AppImage` | 在文件属性中允许“作为程序执行”，或在终端执行 `chmod +x 文件名`，然后双击运行 |

- 桌面版已内置全部网页和 Electron 运行环境，离线即可使用，关闭窗口即退出应用。
- Windows 版本未进行商业代码签名，可能出现 SmartScreen 提示；请只从本项目 Releases 下载。
- 部分 Linux 系统需要 AppImage/FUSE 支持；缺少 FUSE 时可在终端使用 `./文件名 --appimage-extract-and-run`，仍然无需安装。

## 功能

- GPS、北斗 BDS、TAI、UTC 时间系统互转，支持历史闰秒修正。
- GNSS 日历、周数、周内秒和年积日查询。
- SP3 精密星历精度统计、双文件互比和图表展示。
- RINEX 广播星历轨道解算并导出 SP3。
- GNSS 产品 FTP、常用网站与开源软件导航。

## 本地开发

要求 Node.js 22.12 或更高版本，包管理器使用 pnpm 10.28.2。

```bash
cd gnss-tools
pnpm install
pnpm dev
```

完整检查与静态构建：

```bash
pnpm check
```

在当前操作系统上构建桌面版：

```bash
pnpm desktop:dist
```

打包结果位于 `gnss-tools/release/`。Windows 便携版请在 Windows 构建，Linux AppImage 请在 Linux 构建。仓库的 `desktop-release.yml` 工作流也会在推送 `v*.*.*` 标签后自动构建两个平台并发布到 Releases。

## 截图

<img width="2549" height="1415" alt="GNSS 工具集界面" src="https://github.com/user-attachments/assets/e8e7d852-2834-490e-9cb6-c25e52747e2d" />

本项目为个人工作需要所开发，可根据需要进行二次开发和部署。

作者邮箱：18765541687@163.com
