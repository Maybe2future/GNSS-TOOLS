"use client"

import { useEffect, useState } from "react"
import {
  type TimeSystem,
  getSystemUtcOffset,
  timestampToWeekTow,
  timestampToDateTime,
} from "@/lib/gnss-utils"

const SYSTEMS: Array<{ key: TimeSystem; label: string; dot: string }> = [
  { key: "GPS", label: "GPS", dot: "bg-blue-500" },
  { key: "BDS", label: "北斗 BDS", dot: "bg-red-500" },
  { key: "TAI", label: "TAI", dot: "bg-purple-500" },
  { key: "UTC", label: "UTC", dot: "bg-cyan-500" },
]

function pad(n: number, len = 2) {
  return n.toString().padStart(len, "0")
}

/**
 * 四大时间系统实时时钟面板（每秒刷新，按闰秒表换算）
 */
export function LiveTimePanel() {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {SYSTEMS.map(({ key, label, dot }) => {
        let timeText = "--:--:--"
        let subText = " "
        if (now !== null) {
          const sysTs = now + getSystemUtcOffset(key, now) * 1000
          const dt = timestampToDateTime(sysTs)
          const { week, tow } = timestampToWeekTow(key, sysTs)
          timeText = `${pad(dt.hour)}:${pad(dt.minute)}:${pad(dt.second)}`
          subText = `W${week} · ${pad(tow, 6)}s`
        }
        return (
          <div
            key={key}
            className="glass rounded-xl px-4 py-3 text-left shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-2 w-2 rounded-full ${dot} ${now !== null ? "animate-pulse-dot" : ""}`} />
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
            <div className="font-mono text-xl font-bold tabular-nums tracking-tight">{timeText}</div>
            <div className="font-mono text-xs text-muted-foreground tabular-nums mt-0.5">{subText}</div>
          </div>
        )
      })}
    </div>
  )
}
