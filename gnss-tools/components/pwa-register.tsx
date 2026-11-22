"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return
    }

    const isSecure = window.location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(window.location.hostname)
    if (!isSecure) return

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
    navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` }).catch(() => {
      // 注册失败不影响在线功能；安装入口会提供浏览器操作指引。
    })
  }, [])

  return null
}
