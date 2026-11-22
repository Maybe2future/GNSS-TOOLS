const assert = require("node:assert/strict")
const path = require("node:path")
const { after, before, test } = require("node:test")
const { createStaticServer } = require("./static-server.cjs")

let server
let baseUrl

before(async () => {
  server = createStaticServer(path.join(__dirname, "..", "out"))
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (server?.listening) {
    await new Promise((resolve) => server.close(resolve))
  }
})

test("桌面静态服务提供页面、资源和正确响应头", async (t) => {
  await t.test("首页与子路由可访问", async () => {
    for (const route of ["/", "/converter/", "/sp3-analyzer/"]) {
      const response = await fetch(`${baseUrl}${route}`)
      assert.equal(response.status, 200)
      assert.match(response.headers.get("content-type"), /text\/html/)
      assert.match(response.headers.get("cache-control"), /no-cache/)
      assert.match(await response.text(), /GNSS/)
    }
  })

  await t.test("Next.js 脚本资源可访问", async () => {
    const html = await (await fetch(`${baseUrl}/`)).text()
    const assetPath = html.match(/(?:src|href)="(\/_next\/static\/[^"]+)"/)?.[1]
    assert.ok(assetPath, "首页应包含带构建哈希的静态资源")
    const response = await fetch(`${baseUrl}${assetPath}`)
    assert.equal(response.status, 200)
    assert.match(response.headers.get("cache-control"), /immutable/)
    await response.arrayBuffer()
  })

  await t.test("PWA 文件使用正确类型和缓存策略", async () => {
    const manifest = await fetch(`${baseUrl}/manifest.webmanifest`)
    assert.equal(manifest.status, 200)
    assert.match(manifest.headers.get("content-type"), /application\/manifest\+json/)
    assert.equal((await manifest.json()).short_name, "GNSS 工具集")

    const worker = await fetch(`${baseUrl}/sw.js`)
    assert.equal(worker.status, 200)
    assert.match(worker.headers.get("content-type"), /text\/javascript/)
    assert.match(worker.headers.get("cache-control"), /no-cache/)
  })

  await t.test("HEAD 与 404 响应正确", async () => {
    const head = await fetch(`${baseUrl}/`, { method: "HEAD" })
    assert.equal(head.status, 200)
    assert.equal(await head.text(), "")

    const missing = await fetch(`${baseUrl}/not-a-page/`)
    assert.equal(missing.status, 404)
  })
})
