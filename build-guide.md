# GNSS 1.1 静态网站构建指南

## 项目准备

GNSS 1.1 是一个基于 Next.js 的项目，可以构建为静态 HTML 网站并部署到 OSS bucket 等静态托管服务上。

## 构建步骤

### 1. 配置 Next.js 导出选项

确保 `gnss1.1/next.config.mjs` 文件包含以下内容：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'export', // 开启静态导出
}

export default nextConfig
```

注意：`output: 'export'` 配置项是使 Next.js 生成静态 HTML 文件的关键。

### 2. 安装项目依赖

```bash
# 进入项目目录
cd F:\v0\gnss1.1

# 安装依赖
pnpm install
```

### 3. 构建项目

```bash
# 在项目目录中执行构建命令
cd F:\v0\gnss1.1
pnpm build
```

构建完成后，静态文件将位于 `gnss1.1/out` 目录中。

## 构建结果

成功构建后，`gnss1.1/out` 目录中包含以下内容：

- HTML 页面文件：
  - index.html（首页）
  - calendar.html
  - sp3-analyzer.html
  - converter.html
  - ftp-links.html
  - resources.html
  - 404.html（错误页面）
  
- `_next` 目录：包含所有 JavaScript、CSS 和其他资源文件

- 图像和其他静态资源

## 部署到 OSS

将 `gnss1.1/out` 目录中的**所有内容**上传到 OSS Bucket：

```bash
# 使用 ossutil 命令行工具
ossutil64 cp -r F:\v0\gnss1.1\out\ oss://你的bucket名称/ --acl=public-read
```

## 重要注意事项

1. **必须上传所有文件**：包括 `_next` 目录及其所有子目录
2. **保持目录结构**：上传时维持原有的文件结构
3. **OSS 配置**：
   - 设置默认首页：index.html
   - 设置 404 页面：404.html
   - 确保公共读取权限

## 常见问题解决

- **页面加载但样式或功能丢失**：确保 `_next` 目录完整上传
- **图片无法显示**：检查图片路径配置和图片文件是否已上传
- **无法导航**：检查是否配置了正确的 OSS 静态网站设置

## 更新网站

需要更新网站时，重复以上步骤 2-3，然后重新上传生成的静态文件。 