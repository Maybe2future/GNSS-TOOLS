"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean }

export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [isAppleMobile, setIsAppleMobile] = useState(false)

  useEffect(() => {
    const navigatorWithStandalone = navigator as NavigatorWithStandalone
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true
    setInstalled(standalone)
    setIsAppleMobile(/iphone|ipad|ipod/i.test(navigator.userAgent))

    const handlePrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    const handleInstalled = () => {
      setPromptEvent(null)
      setInstalled(true)
      setShowHelp(false)
    }

    window.addEventListener("beforeinstallprompt", handlePrompt)
    window.addEventListener("appinstalled", handleInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  const install = async () => {
    if (!promptEvent) {
      setShowHelp(true)
      return
    }

    const event = promptEvent
    await event.prompt()
    await event.userChoice
    setPromptEvent(null)
  }

  if (installed) return null

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 w-10 shrink-0 px-0 sm:w-auto sm:px-3"
        onClick={install}
        aria-label="安装应用"
        title={promptEvent ? "安装 GNSS 工具集" : "查看安装到主屏幕的方法"}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">安装应用</span>
      </Button>
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>安装到主屏幕</DialogTitle>
            <DialogDescription>安装后可像普通应用一样打开，并在已缓存页面上离线使用。</DialogDescription>
          </DialogHeader>
          {isAppleMobile ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6">
              <li>使用 Safari 打开本页面。</li>
              <li>点击浏览器底部的“分享”按钮。</li>
              <li>选择“添加到主屏幕”，再点击“添加”。</li>
            </ol>
          ) : (
            <div className="space-y-2 text-sm leading-6">
              <p>打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。</p>
              <p className="text-muted-foreground">如果菜单中没有该选项，请通过 HTTPS 或 localhost 访问，并确认当前浏览器支持安装网页应用。</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
