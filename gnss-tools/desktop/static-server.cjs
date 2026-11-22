const fs = require("node:fs")
const http = require("node:http")
const path = require("node:path")

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

function sendFile(request, response, filePath, statusCode = 200) {
  const stat = fs.statSync(filePath)
  const extension = path.extname(filePath).toLowerCase()
  const immutable = filePath.includes(`${path.sep}_next${path.sep}static${path.sep}`)
  const noCache = extension === ".html" || path.basename(filePath) === "sw.js"

  response.writeHead(statusCode, {
    "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : noCache ? "no-cache" : "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  })

  if (request.method === "HEAD") {
    response.end()
    return
  }

  const stream = fs.createReadStream(filePath)
  stream.on("error", () => response.destroy())
  stream.pipe(response)
}

function createStaticServer(rootDirectory) {
  const root = path.resolve(rootDirectory)

  return http.createServer((request, response) => {
    if (!["GET", "HEAD"].includes(request.method || "GET")) {
      response.writeHead(405, { Allow: "GET, HEAD" })
      response.end("Method Not Allowed")
      return
    }

    let pathname
    try {
      pathname = decodeURIComponent(new URL(request.url || "/", "http://127.0.0.1").pathname)
    } catch {
      response.writeHead(400)
      response.end("Bad Request")
      return
    }

    let filePath = path.resolve(root, `.${pathname}`)
    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403)
      response.end("Forbidden")
      return
    }

    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html")
      } else if (!fs.existsSync(filePath) && !path.extname(pathname)) {
        filePath = path.join(filePath, "index.html")
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        sendFile(request, response, filePath)
        return
      }
    } catch {
      // 统一按 404 处理，避免向页面暴露本机文件路径或异常堆栈。
    }

    const notFoundPage = path.join(root, "404.html")
    if (fs.existsSync(notFoundPage)) {
      sendFile(request, response, notFoundPage, 404)
      return
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    response.end("Not Found")
  })
}

module.exports = { createStaticServer }
