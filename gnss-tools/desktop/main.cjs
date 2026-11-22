const path = require("node:path")
const { app, BrowserWindow, dialog, shell } = require("electron")
const { createStaticServer } = require("./static-server.cjs")

let mainWindow = null
let server = null
let localOrigin = null

function openExternal(url) {
  try {
    const target = new URL(url)
    if (["http:", "https:"].includes(target.protocol) && target.origin !== localOrigin) {
      void shell.openExternal(target.toString())
    }
  } catch {
    // 忽略无效地址，不影响当前应用窗口。
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f8fafc",
    title: "GNSS 时间工具",
    icon: path.join(__dirname, "..", "out", "icons", "icon-512.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  mainWindow.once("ready-to-show", () => mainWindow?.show())
  mainWindow.on("closed", () => {
    mainWindow = null
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url)
    return { action: "deny" }
  })
  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      if (new URL(url).origin !== localOrigin) {
        event.preventDefault()
        openExternal(url)
      }
    } catch {
      event.preventDefault()
    }
  })

  void mainWindow.loadURL(`${localOrigin}/`)
}

async function startServer() {
  const staticRoot = path.join(__dirname, "..", "out")
  server = createStaticServer(staticRoot)
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("本地服务未能分配端口")
  }
  localOrigin = `http://127.0.0.1:${address.port}`
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    try {
      await startServer()
      createWindow()
    } catch (error) {
      dialog.showErrorBox("GNSS 时间工具启动失败", error instanceof Error ? error.message : String(error))
      app.quit()
    }
  })

  app.on("activate", () => {
    if (server?.listening && localOrigin && BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}

app.on("window-all-closed", () => {
  app.quit()
})

app.on("will-quit", () => {
  if (server?.listening) server.close()
})
