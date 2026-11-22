const CACHE_NAME = "gnss-tools-v3"
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, "")
const withBasePath = (path) => `${BASE_PATH}${path}`
const APP_ROUTES = [
  "/",
  "/converter/",
  "/calendar/",
  "/sp3-analyzer/",
  "/broadcast-to-sp3/",
  "/resources/",
  "/ftp-links/",
  "/open-source/",
]
const PRECACHE_URLS = [
  ...APP_ROUTES,
  ...APP_ROUTES.map((route) => `${route}index.txt`),
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
].map(withBasePath)

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(PRECACHE_URLS)

      // 从导出的 HTML 收集带构建哈希的脚本、样式和字体，确保各路由可独立离线打开。
      const assetUrls = new Set()
      for (const route of APP_ROUTES) {
        const response = await cache.match(withBasePath(route))
        if (!response) continue
        const html = await response.text()
        for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
          const url = new URL(match[1], self.registration.scope)
          if (url.origin === self.location.origin && url.pathname.startsWith(withBasePath("/_next/static/"))) {
            assetUrls.add(`${url.pathname}${url.search}`)
          }
        }
      }
      await cache.addAll([...assetUrls])
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((name) => name.startsWith("gnss-tools-") && name !== CACHE_NAME).map((name) => caches.delete(name)))
      await self.clients.claim()
    })(),
  )
})

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    return (await caches.match(request)) || (await caches.match(fallbackUrl)) || (await caches.match(withBasePath("/"))) || Response.error()
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname === withBasePath("/sw.js")) return

  if (request.mode === "navigate") {
    const pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`
    event.respondWith(networkFirst(request, pathname))
    return
  }

  // App Router 的 RSC 预取带动态查询参数；离线时按路径回退到静态导出的 index.txt。
  if (request.headers.get("RSC") === "1" || url.pathname.endsWith("/index.txt")) {
    event.respondWith(networkFirst(request, url.pathname))
    return
  }

  if (url.pathname.startsWith(withBasePath("/_next/static/")) || ["style", "script", "image", "font", "manifest"].includes(request.destination)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached

        const response = await fetch(request)
        if (response.ok && response.type === "basic") {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(request, response.clone())
        }
        return response
      })(),
    )
  }
})
