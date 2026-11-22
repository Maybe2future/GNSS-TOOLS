/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const nextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true, // 生成 /page/index.html，任意静态服务器（含 python http.server）均可直接访问
  images: {
    unoptimized: true,
  },
}

export default nextConfig
