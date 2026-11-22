"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Clock,
  Calendar,
  ArrowRightLeft,
  Copy,
  Check,
  Info,
  ChevronRight,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import {
  type TimeSystem,
  type SystemTimeFormats,
  weekTowToAllFormats,
  dateTimeToAllFormats,
  doyToAllFormats,
  convertSystemTimestampToAllSystems,
  getMinimumCrossSystemTimestamp,
  getSystemConfig,
  getSystemDifferenceText,
  systemTimestampToPhysicalMs,
  validateDateTimeInput,
  validateWeekTowInput,
  type SystemConversionOptions,
  formatWeekTow,
  formatDateTime,
  formatDoy,
  isLeapYear,
  doyToDate,
  sodToTime,
} from "@/lib/gnss-utils"

const SYSTEMS: TimeSystem[] = ["GPS", "BDS", "TAI", "UTC"]

const SYSTEM_META: Record<
  TimeSystem,
  { label: string; color: string; bg: string; border: string; gradient: string; icon: string }
> = {
  GPS: {
    label: "GPS",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    gradient: "from-blue-500 to-blue-700",
    icon: "🛰️",
  },
  BDS: {
    label: "北斗 BDS",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    gradient: "from-red-500 to-red-700",
    icon: "🌏",
  },
  TAI: {
    label: "原子时 TAI",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    gradient: "from-purple-500 to-purple-700",
    icon: "⚛️",
  },
  UTC: {
    label: "UTC",
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    border: "border-cyan-200 dark:border-cyan-800",
    gradient: "from-cyan-500 to-cyan-700",
    icon: "🌍",
  },
}

// =============================================================================
// 复制到剪贴板 Hook
// =============================================================================
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // ignore
    }
  }, [])
  return { copied, copy }
}

// =============================================================================
// 结果展示行组件
// =============================================================================
function ResultRow({
  label,
  value,
  copyKey,
  copy,
  copied,
  highlight = false,
}: {
  label: string
  value: string
  copyKey: string
  copy: (text: string, key: string) => void
  copied: string | null
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        highlight
          ? "bg-primary/10 dark:bg-primary/20 border border-primary/20"
          : "bg-muted/50 dark:bg-muted/20"
      }`}
    >
      <div>
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="font-mono text-sm font-semibold mt-0.5">{value}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => copy(value, copyKey)}
      >
        {copied === copyKey ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

// =============================================================================
// 根据全格式结果同步所有输入框
// =============================================================================
function syncAllInputs(result: SystemTimeFormats | null) {
  if (!result) return null
  return {
    week: result.week.toString(),
    tow: result.tow.toString(),
    year: result.year.toString(),
    month: result.month.toString(),
    day: result.day.toString(),
    hour: result.hour.toString(),
    minute: result.minute.toString(),
    second: result.second.toString(),
    doyYear: result.year.toString(),
    doy: result.doy.toString(),
    doySod: result.sod.toString(),
  }
}

// =============================================================================
// 单系统转换面板
// =============================================================================
function SingleSystemConverter() {
  const [system, setSystem] = useState<TimeSystem>("GPS")
  const [result, setResult] = useState<SystemTimeFormats | null>(null)
  const { copied, copy } = useCopy()

  // 输入状态
  const [inputs, setInputs] = useState({
    week: "",
    tow: "",
    year: "",
    month: "",
    day: "",
    hour: "",
    minute: "",
    second: "",
    doyYear: "",
    doy: "",
    doySod: "",
  })

  const [lastInputSource, setLastInputSource] = useState<"week" | "datetime" | "doy" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const applyResult = (r: SystemTimeFormats, source: "week" | "datetime" | "doy") => {
    setResult(r)
    setInputs((prev) => ({ ...prev, ...syncAllInputs(r)! }))
    setLastInputSource(source)
    setError(null)
  }

  const rejectInput = (message: string) => {
    setResult(null)
    setError(message)
    return false
  }

  // 从周+周内秒计算并同步
  const updateFromWeekTow = (wStr: string, tStr: string) => {
    if (wStr === "" || tStr === "") {
      setResult(null)
      setError(null)
      return false
    }
    try {
      applyResult(weekTowToAllFormats(system, Number(wStr), Number(tStr)), "week")
      return true
    } catch (cause) {
      return rejectInput(cause instanceof Error ? cause.message : "周秒输入无效")
    }
  }

  // 从年月日时分秒计算并同步
  const updateFromDateTime = (y: string, m: string, d: string, h: string, min: string, s: string) => {
    if ([y, m, d, h, min, s].some((value) => value === "")) {
      setResult(null)
      setError(null)
      return false
    }
    try {
      applyResult(dateTimeToAllFormats(system, Number(y), Number(m), Number(d), Number(h), Number(min), Number(s)), "datetime")
      return true
    } catch (cause) {
      return rejectInput(cause instanceof Error ? cause.message : "日历时间输入无效")
    }
  }

  // 从年积日计算并同步
  const updateFromDoy = (y: string, d: string, s: string) => {
    if ([y, d, s].some((value) => value === "")) {
      setResult(null)
      setError(null)
      return false
    }
    try {
      applyResult(doyToAllFormats(system, Number(y), Number(d), Number(s)), "doy")
      return true
    } catch (cause) {
      return rejectInput(cause instanceof Error ? cause.message : "年积日输入无效")
    }
  }

  const meta = SYSTEM_META[system]
  const cfg = getSystemConfig(system)

  return (
    <div className="space-y-6">
      {/* 系统选择 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SYSTEMS.map((s) => {
          const active = s === system
          const m = SYSTEM_META[s]
          return (
            <button
              key={s}
              onClick={() => {
                setSystem(s)
                setResult(null)
                setInputs({
                  week: "",
                  tow: "",
                  year: "",
                  month: "",
                  day: "",
                  hour: "",
                  minute: "",
                  second: "",
                  doyYear: "",
                  doy: "",
                  doySod: "",
                })
                setLastInputSource(null)
                setError(null)
              }}
              className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                active
                  ? `${m.border} ${m.bg} shadow-md scale-[1.02]`
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{m.icon}</span>
                <div>
                  <div className={`font-bold ${active ? m.color : ""}`}>{m.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {active ? "已选择" : "点击切换"}
                  </div>
                </div>
              </div>
              {active && (
                <motion.div
                  layoutId="activeSystem"
                  className={`absolute inset-0 rounded-xl border-2 ${m.border}`}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* 三个输入区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 周 + 周内秒 */}
        <Card className={`${meta.bg} overflow-hidden`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${meta.color}`}>
              <Clock className="h-5 w-5" />
              周 + 周内秒
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>周数 (Week)</Label>
              <Input
                type="number"
                placeholder="例如: 2415"
                value={inputs.week}
                onChange={(e) => {
                  const val = e.target.value
                  setInputs((prev) => ({ ...prev, week: val }))
                  if (inputs.tow !== "") updateFromWeekTow(val, inputs.tow)
                }}
                className="bg-white/80 dark:bg-gray-950/80"
              />
            </div>
            <div className="space-y-2">
              <Label>周内秒 (TOW)</Label>
              <Input
                type="number"
                placeholder="0 ~ 604799"
                value={inputs.tow}
                onChange={(e) => {
                  const val = e.target.value
                  setInputs((prev) => ({ ...prev, tow: val }))
                  if (inputs.week !== "") updateFromWeekTow(inputs.week, val)
                }}
                className="bg-white/80 dark:bg-gray-950/80"
              />
              <p className="text-xs text-muted-foreground">
                范围: 0 ~ 604799（一周总秒数）
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 年月日时分秒 */}
        <Card className={`${meta.bg} overflow-hidden`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${meta.color}`}>
              <Calendar className="h-5 w-5" />
              年月日时分秒
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">年</Label>
                <Input
                  type="number"
                  placeholder="2026"
                  value={inputs.year}
                  onChange={(e) => {
                    const val = e.target.value
                    setInputs((prev) => ({ ...prev, year: val }))
                    updateFromDateTime(val, inputs.month, inputs.day, inputs.hour, inputs.minute, inputs.second)
                  }}
                  className="bg-white/80 dark:bg-gray-950/80"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">月</Label>
                <Input
                  type="number"
                  placeholder="1"
                  min={1}
                  max={12}
                  value={inputs.month}
                  onChange={(e) => {
                    const val = e.target.value
                    setInputs((prev) => ({ ...prev, month: val }))
                    updateFromDateTime(inputs.year, val, inputs.day, inputs.hour, inputs.minute, inputs.second)
                  }}
                  className="bg-white/80 dark:bg-gray-950/80"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">日</Label>
                <Input
                  type="number"
                  placeholder="1"
                  min={1}
                  max={31}
                  value={inputs.day}
                  onChange={(e) => {
                    const val = e.target.value
                    setInputs((prev) => ({ ...prev, day: val }))
                    updateFromDateTime(inputs.year, inputs.month, val, inputs.hour, inputs.minute, inputs.second)
                  }}
                  className="bg-white/80 dark:bg-gray-950/80"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">时</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min={0}
                  max={23}
                  value={inputs.hour}
                  onChange={(e) => {
                    const val = e.target.value
                    setInputs((prev) => ({ ...prev, hour: val }))
                    updateFromDateTime(inputs.year, inputs.month, inputs.day, val, inputs.minute, inputs.second)
                  }}
                  className="bg-white/80 dark:bg-gray-950/80"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">分</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min={0}
                  max={59}
                  value={inputs.minute}
                  onChange={(e) => {
                    const val = e.target.value
                    setInputs((prev) => ({ ...prev, minute: val }))
                    updateFromDateTime(inputs.year, inputs.month, inputs.day, inputs.hour, val, inputs.second)
                  }}
                  className="bg-white/80 dark:bg-gray-950/80"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">秒</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min={0}
                  max={system === "UTC" ? 60 : 59}
                  value={inputs.second}
                  onChange={(e) => {
                    const val = e.target.value
                    setInputs((prev) => ({ ...prev, second: val }))
                    updateFromDateTime(inputs.year, inputs.month, inputs.day, inputs.hour, inputs.minute, val)
                  }}
                  className="bg-white/80 dark:bg-gray-950/80"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 年积日 */}
        <Card className={`${meta.bg} overflow-hidden`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${meta.color}`}>
              <Globe className="h-5 w-5" />
              年积日 + 日内秒
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">年份</Label>
                <Input
                  type="number"
                  placeholder="2026"
                  value={inputs.doyYear}
                  onChange={(e) => {
                    const val = e.target.value
                    setInputs((prev) => ({ ...prev, doyYear: val }))
                    updateFromDoy(val, inputs.doy, inputs.doySod)
                  }}
                  className="bg-white/80 dark:bg-gray-950/80"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">年积日 (DOY)</Label>
                <Input
                  type="number"
                  placeholder="1 ~ 366"
                  min={1}
                  max={366}
                  value={inputs.doy}
                  onChange={(e) => {
                    const val = e.target.value
                    setInputs((prev) => ({ ...prev, doy: val }))
                    updateFromDoy(inputs.doyYear, val, inputs.doySod)
                  }}
                  className="bg-white/80 dark:bg-gray-950/80"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">日内秒 (SOD)</Label>
              <Input
                type="number"
                placeholder="0 ~ 86399"
                min={0}
                max={system === "UTC" ? 86400 : 86399}
                value={inputs.doySod}
                onChange={(e) => {
                  const val = e.target.value
                  setInputs((prev) => ({ ...prev, doySod: val }))
                  updateFromDoy(inputs.doyYear, inputs.doy, val)
                }}
                className="bg-white/80 dark:bg-gray-950/80"
              />
              <p className="text-xs text-muted-foreground">
                范围: 0 ~ 86399（真实 UTC 闰日可用 86400 表示 23:59:60）
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* 转换结果 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden border-2 shadow-lg">
              <div className={`h-1 bg-gradient-to-r ${meta.gradient}`} />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{meta.icon}</span>
                  {meta.label} 转换结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ResultRow
                    label="周 + 周内秒"
                    value={formatWeekTow(result.week, result.tow)}
                    copyKey="result-weektow"
                    copy={copy}
                    copied={copied}
                    highlight={lastInputSource === "week"}
                  />
                  <ResultRow
                    label="年月日时分秒"
                    value={formatDateTime(
                      result.year,
                      result.month,
                      result.day,
                      result.hour,
                      result.minute,
                      result.second
                    )}
                    copyKey="result-datetime"
                    copy={copy}
                    copied={copied}
                    highlight={lastInputSource === "datetime"}
                  />
                  <ResultRow
                    label="年积日"
                    value={formatDoy(result.year, result.doy, result.sod)}
                    copyKey="result-doy"
                    copy={copy}
                    copied={copied}
                    highlight={lastInputSource === "doy"}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 系统信息 */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <span className="font-semibold">{meta.label}</span> 起始历元:{" "}
                {cfg.epoch.toISOString().replace("T", " ").replace(".000Z", "")} UTC
              </p>
              <p>
                与 UTC 时间差（当前值）:{" "}
                {cfg.leapSeconds > 0
                  ? `${cfg.name} 比 UTC 快 ${cfg.leapSeconds} 秒`
                  : cfg.leapSeconds < 0
                    ? `${cfg.name} 比 UTC 慢 ${Math.abs(cfg.leapSeconds)} 秒`
                    : "与 UTC 一致"}
                ，历史日期按闰秒表自动修正
              </p>
              <p className="text-xs opacity-70">
                提示：在任意输入区域输入有效值，其他两个区域将自动更新。
                {system === "UTC" && " UTC 周秒为 POSIX 式标称值；真实闰秒以 23:59:60 单独表示。"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// 系统间转换面板
// =============================================================================
function CrossSystemConverter() {
  const [sourceSystem, setSourceSystem] = useState<TimeSystem>("GPS")
  const [inputTab, setInputTab] = useState<"week" | "datetime" | "doy">("week")
  const [results, setResults] = useState<Record<TimeSystem, SystemTimeFormats> | null>(null)
  const [convertedAtMs, setConvertedAtMs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showFormats, setShowFormats] = useState({ weekTow: true, dateTime: true, doy: true })
  const { copied, copy } = useCopy()

  // 三种输入状态
  const [week, setWeek] = useState("")
  const [tow, setTow] = useState("")

  const [dtYear, setDtYear] = useState("")
  const [dtMonth, setDtMonth] = useState("")
  const [dtDay, setDtDay] = useState("")
  const [dtHour, setDtHour] = useState("")
  const [dtMinute, setDtMinute] = useState("")
  const [dtSecond, setDtSecond] = useState("")

  const [doyYear, setDoyYear] = useState("")
  const [doyVal, setDoyVal] = useState("")
  const [doySod, setDoySod] = useState("")

  const handleConvert = () => {
    setError(null)
    setResults(null)
    setConvertedAtMs(null)
    try {
      const cfg = getSystemConfig(sourceSystem)
      let sourceTimestampMs: number
      const options: SystemConversionOptions = {}

      if (inputTab === "week") {
        if (week === "" || tow === "") throw new Error("请输入周数和周内秒")
        const w = Number(week)
        const t = Number(tow)
        const validationError = validateWeekTowInput(w, t)
        if (validationError) throw new Error(validationError)
        sourceTimestampMs = cfg.epoch.getTime() + w * 604800 * 1000 + t * 1000
      } else if (inputTab === "datetime") {
        if ([dtYear, dtMonth, dtDay, dtHour, dtMinute, dtSecond].some((value) => value === "")) {
          throw new Error("请完整输入年月日时分秒")
        }
        const y = Number(dtYear)
        const m = Number(dtMonth)
        const d = Number(dtDay)
        const h = Number(dtHour)
        const min = Number(dtMinute)
        const s = Number(dtSecond)
        const validationError = validateDateTimeInput(sourceSystem, y, m, d, h, min, s)
        if (validationError) throw new Error(validationError)
        sourceTimestampMs = Date.UTC(y, m - 1, d, h, min, s)
        if (sourceSystem === "UTC" && s === 60) options.utcLeapSecond = { year: y, month: m, day: d, hour: h, minute: min }
      } else {
        if ([doyYear, doyVal, doySod].some((value) => value === "")) {
          throw new Error("请完整输入年份、年积日和日内秒")
        }
        const y = Number(doyYear)
        const d = Number(doyVal)
        const s = Number(doySod)
        const maxDoy = isLeapYear(y) ? 366 : 365
        if (![y, d, s].every(Number.isInteger) || y < 1000 || d < 1 || d > maxDoy || s < 0 || s > 86400) {
          throw new Error("请输入有效的四位年份、年积日和日内秒")
        }
        const { month, day } = doyToDate(y, d)
        const isLeapSod = s === 86400
        const { hour, minute, second } = isLeapSod ? { hour: 23, minute: 59, second: 60 } : sodToTime(s)
        const validationError = validateDateTimeInput(sourceSystem, y, month, day, hour, minute, second)
        if (validationError) throw new Error(validationError)
        sourceTimestampMs = Date.UTC(y, month - 1, day, hour, minute, second)
        if (sourceSystem === "UTC" && isLeapSod) options.utcLeapSecond = { year: y, month, day, hour, minute }
      }

      if (sourceTimestampMs < getMinimumCrossSystemTimestamp(sourceSystem)) {
        throw new Error("源时刻早于该系统支持的跨系统换算范围")
      }
      setResults(convertSystemTimestampToAllSystems(sourceSystem, sourceTimestampMs, options))
      setConvertedAtMs(systemTimestampToPhysicalMs(sourceSystem, sourceTimestampMs, options))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "输入无效，请检查后重试")
    }
  }

  return (
    <div className="space-y-6">
      {/* 源系统选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            源系统与时间输入
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>选择源时间系统</Label>
            <div className="flex flex-wrap gap-2">
              {SYSTEMS.map((s) => {
                const active = s === sourceSystem
                const m = SYSTEM_META[s]
                return (
                  <Button
                    key={s}
                    variant={active ? "default" : "outline"}
                    onClick={() => {
                      setSourceSystem(s)
                      setResults(null)
                      setConvertedAtMs(null)
                      setError(null)
                    }}
                    className={`gap-1 ${active ? `bg-gradient-to-r ${m.gradient} text-white border-0` : ""}`}
                  >
                    <span>{m.icon}</span>
                    {m.label}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* 输入格式切换 */}
          <div className="space-y-2">
            <Label>选择输入格式</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "week" as const, label: "周 + 周内秒", icon: <Clock className="h-4 w-4" /> },
                { key: "datetime" as const, label: "年月日时分秒", icon: <Calendar className="h-4 w-4" /> },
                { key: "doy" as const, label: "年积日 + 日内秒", icon: <Globe className="h-4 w-4" /> },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  variant={inputTab === tab.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setInputTab(tab.key)
                    setResults(null)
                    setConvertedAtMs(null)
                    setError(null)
                  }}
                  className={`gap-1 ${inputTab === tab.key ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {tab.icon}
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 根据选择的格式显示对应输入框 */}
          {inputTab === "week" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>周数</Label>
                <Input type="number" placeholder="例如: 2415" value={week} onChange={(e) => setWeek(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>周内秒</Label>
                <Input type="number" placeholder="0 ~ 604799" value={tow} onChange={(e) => setTow(e.target.value)} />
              </div>
            </div>
          )}

          {inputTab === "datetime" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">年</Label>
                  <Input type="number" placeholder="2026" value={dtYear} onChange={(e) => setDtYear(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">月</Label>
                  <Input type="number" placeholder="1" min={1} max={12} value={dtMonth} onChange={(e) => setDtMonth(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">日</Label>
                  <Input type="number" placeholder="1" min={1} max={31} value={dtDay} onChange={(e) => setDtDay(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">时</Label>
                  <Input type="number" placeholder="0" min={0} max={23} value={dtHour} onChange={(e) => setDtHour(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">分</Label>
                  <Input type="number" placeholder="0" min={0} max={59} value={dtMinute} onChange={(e) => setDtMinute(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">秒</Label>
                  <Input type="number" placeholder="0" min={0} max={sourceSystem === "UTC" ? 60 : 59} value={dtSecond} onChange={(e) => setDtSecond(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {inputTab === "doy" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">年份</Label>
                  <Input type="number" placeholder="2026" value={doyYear} onChange={(e) => setDoyYear(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">年积日 (DOY)</Label>
                  <Input type="number" placeholder="1 ~ 366" min={1} max={366} value={doyVal} onChange={(e) => setDoyVal(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">日内秒 (SOD)</Label>
                <Input type="number" placeholder="0 ~ 86399" min={0} max={sourceSystem === "UTC" ? 86400 : 86399} value={doySod} onChange={(e) => setDoySod(e.target.value)} />
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button onClick={handleConvert} className="w-full sm:w-auto">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            转换为各系统时间
          </Button>
        </CardContent>
      </Card>

      {/* 结果展示格式选择 */}
      {results && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">展示格式:</span>
              {[
                { key: "weekTow" as const, label: "周+周内秒" },
                { key: "dateTime" as const, label: "年月日时分秒" },
                { key: "doy" as const, label: "年积日" },
              ].map((fmt) => (
                <label key={fmt.key} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showFormats[fmt.key]}
                    onChange={(e) =>
                      setShowFormats((prev) => ({ ...prev, [fmt.key]: e.target.checked }))
                    }
                    className="rounded border-gray-300"
                  />
                  {fmt.label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 转换结果 */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {SYSTEMS.map((s, idx) => {
              const r = results[s]
              const m = SYSTEM_META[s]
              const isSource = s === sourceSystem
              return (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`overflow-hidden h-full ${isSource ? `border-2 ${m.border}` : ""}`}>
                    <div className={`h-1 bg-gradient-to-r ${m.gradient}`} />
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{m.icon}</span>
                          <span className={m.color}>{m.label}</span>
                        </span>
                        {isSource && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            源系统
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      {r.isBeforeEpoch ? (
                        <p className="rounded-lg bg-muted/50 px-3 py-4 text-sm text-muted-foreground">
                          该时刻早于 {s} 系统历元，不适用。
                        </p>
                      ) : (
                        <>
                          {showFormats.weekTow && (
                            <ResultRow
                              label="周 + 周内秒"
                              value={formatWeekTow(r.week, r.tow)}
                              copyKey={`cross-${s}-weektow`}
                              copy={copy}
                              copied={copied}
                            />
                          )}
                          {showFormats.dateTime && (
                            <ResultRow
                              label="年月日时分秒"
                              value={formatDateTime(r.year, r.month, r.day, r.hour, r.minute, r.second)}
                              copyKey={`cross-${s}-datetime`}
                              copy={copy}
                              copied={copied}
                            />
                          )}
                          {showFormats.doy && (
                            <ResultRow
                              label="年积日"
                              value={formatDoy(r.year, r.doy, r.sod)}
                              copyKey={`cross-${s}-doy`}
                              copy={copy}
                              copied={copied}
                            />
                          )}
                          {!isSource && convertedAtMs !== null && (
                            <div className={`text-xs p-2 rounded ${m.bg} ${m.color}`}>
                              {getSystemDifferenceText(sourceSystem, s, convertedAtMs)}
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// 主页面
// =============================================================================
export default function ConverterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <SiteHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 dark:from-blue-400 dark:via-purple-400 dark:to-cyan-400">
            GNSS 时间转换器
          </h1>
        </div>
        <Tabs defaultValue="single" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-lg grid-cols-2 p-1 bg-muted/50 backdrop-blur-sm">
              <TabsTrigger value="single" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm">
                <Clock className="h-4 w-4" />
                单系统全格式转换
              </TabsTrigger>
              <TabsTrigger value="cross" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm">
                <ArrowRightLeft className="h-4 w-4" />
                系统间转换
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="single" className="mt-0">
            <SingleSystemConverter />
          </TabsContent>

          <TabsContent value="cross" className="mt-0">
            <CrossSystemConverter />
          </TabsContent>
        </Tabs>

        {/* 快速导航 */}
        <div className="mt-12 flex justify-center">
          <Link href="/calendar">
            <Button variant="outline" className="gap-2">
              前往 GNSS 日历
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-12 border-t border-border">
        <div className="text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} GNSS 工具集 | 支持 GPS / 北斗 / TAI / UTC 时间系统</p>
        </div>
      </footer>
    </div>
  )
}
