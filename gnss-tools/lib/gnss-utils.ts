// GNSS 时间工具函数 - 完整版
// 支持 GPS / BDS / TAI / UTC 四个时间系统
//
// 关键设计：
// - 单系统转换：基于"系统时间戳"计算（用户输入的日历值直接用于计算周秒）
// - 系统间转换：输入→源系统时间戳→物理时刻(UTC)→目标系统时间戳→输出
// - 系统与 UTC 的闰秒差按历史闰秒表逐日确定（见 TAI_UTC_TABLE）：
//   GPS = TAI-UTC - 19（当前 +18 秒），BDS = TAI-UTC - 33（当前 +4 秒），TAI = TAI-UTC（当前 +37 秒）

export type TimeSystem = "GPS" | "BDS" | "TAI" | "UTC"

export interface SystemTimeFormats {
  system: TimeSystem
  week: number
  tow: number
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  doy: number
  sod: number
  /** UTC 正闰秒秒点（23:59:60） */
  isLeapSecond?: boolean
  /** 目标时间系统在该时刻尚未启用 */
  isBeforeEpoch?: boolean
}

// =============================================================================
// 常量定义
// =============================================================================

const SECONDS_IN_WEEK = 7 * 24 * 60 * 60 // 604800
const SECONDS_IN_DAY = 24 * 60 * 60 // 86400
const MS_IN_SECOND = 1000

// 各系统配置：历元(UTC时刻) 和 与UTC的闰秒差
// leapSeconds 为"当前值"，仅用于界面展示；实际转换按 TAI_UTC_TABLE 根据日期动态确定
const SYSTEM_CONFIG: Record<
  TimeSystem,
  { epoch: Date; leapSeconds: number; name: string; shortName: string; color: string }
> = {
  GPS: {
    epoch: new Date("1980-01-06T00:00:00Z"),
    leapSeconds: 18,
    name: "GPS",
    shortName: "GPS",
    color: "#3b82f6",
  },
  BDS: {
    epoch: new Date("2006-01-01T00:00:00Z"),
    leapSeconds: 4,
    name: "北斗",
    shortName: "BDS",
    color: "#ef4444",
  },
  TAI: {
    epoch: new Date("1958-01-01T00:00:00Z"),
    leapSeconds: 37,
    name: "国际原子时",
    shortName: "TAI",
    color: "#a855f7",
  },
  UTC: {
    epoch: new Date("1970-01-01T00:00:00Z"),
    leapSeconds: 0,
    name: "协调世界时",
    shortName: "UTC",
    color: "#06b6d4",
  },
}

// =============================================================================
// 闰秒表（TAI-UTC）与动态系统偏差
// =============================================================================

// TAI-UTC 历史闰秒表：[生效时刻(UTC毫秒), TAI-UTC(秒)]
// 1972-01-01 起为整数闰秒；更早日期按 10 秒处理（GNSS 系统当时尚不存在）
const TAI_UTC_TABLE: Array<[number, number]> = [
  [Date.UTC(1972, 0, 1), 10],
  [Date.UTC(1972, 6, 1), 11],
  [Date.UTC(1973, 0, 1), 12],
  [Date.UTC(1974, 0, 1), 13],
  [Date.UTC(1975, 0, 1), 14],
  [Date.UTC(1976, 0, 1), 15],
  [Date.UTC(1977, 0, 1), 16],
  [Date.UTC(1978, 0, 1), 17],
  [Date.UTC(1979, 0, 1), 18],
  [Date.UTC(1980, 0, 1), 19],
  [Date.UTC(1981, 6, 1), 20],
  [Date.UTC(1982, 6, 1), 21],
  [Date.UTC(1983, 6, 1), 22],
  [Date.UTC(1985, 6, 1), 23],
  [Date.UTC(1988, 0, 1), 24],
  [Date.UTC(1990, 0, 1), 25],
  [Date.UTC(1991, 0, 1), 26],
  [Date.UTC(1992, 6, 1), 27],
  [Date.UTC(1993, 6, 1), 28],
  [Date.UTC(1994, 6, 1), 29],
  [Date.UTC(1996, 0, 1), 30],
  [Date.UTC(1997, 6, 1), 31],
  [Date.UTC(1999, 0, 1), 32],
  [Date.UTC(2006, 0, 1), 33],
  [Date.UTC(2009, 0, 1), 34],
  [Date.UTC(2012, 6, 1), 35],
  [Date.UTC(2015, 6, 1), 36],
  [Date.UTC(2017, 0, 1), 37],
]

// 各系统与 TAI 的固定偏差：GPST = TAI - 19s，BDT = TAI - 33s
const SYSTEM_TAI_OFFSET: Record<TimeSystem, number | null> = {
  GPS: 19,
  BDS: 33,
  TAI: 0,
  UTC: null, // UTC 偏差恒为 0（物理时刻本身即 UTC）
}

/**
 * 查询某一 UTC 物理时刻的 TAI-UTC 闰秒值
 */
export function taiMinusUtcAt(utcMs: number): number {
  let result = TAI_UTC_TABLE[0][1]
  for (const [effectiveMs, value] of TAI_UTC_TABLE) {
    if (utcMs >= effectiveMs) {
      result = value
    } else {
      break
    }
  }
  return result
}

/**
 * 查询某一 UTC 物理时刻下，系统时间戳与 UTC 时间戳的偏差（秒）
 * 系统时间戳 = UTC时间戳 + offset
 */
export function getSystemUtcOffset(system: TimeSystem, utcMs: number): number {
  const taiOffset = SYSTEM_TAI_OFFSET[system]
  if (taiOffset === null) return 0
  return taiMinusUtcAt(utcMs) - taiOffset
}

// =============================================================================
// 基础工具函数
// =============================================================================

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365
}

export function daysInMonth(year: number, month: number): number {
  const monthDays = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (isLeapYear(year)) monthDays[2] = 29
  return monthDays[month] ?? 31
}

export function dateToDoy(year: number, month: number, day: number): number {
  const monthDays = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (isLeapYear(year)) monthDays[2] = 29
  let doy = day
  for (let m = 1; m < month; m++) {
    doy += monthDays[m]
  }
  return doy
}

export function doyToDate(year: number, doy: number): { month: number; day: number } {
  const monthDays = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (isLeapYear(year)) monthDays[2] = 29
  let remaining = doy
  let month = 1
  while (remaining > monthDays[month]) {
    remaining -= monthDays[month]
    month++
  }
  return { month, day: remaining }
}

export function timeToSod(hour: number, minute: number, second: number): number {
  return hour * 3600 + minute * 60 + second
}

export function sodToTime(sod: number): { hour: number; minute: number; second: number } {
  const hour = Math.floor(sod / 3600)
  const minute = Math.floor((sod % 3600) / 60)
  const second = Math.floor(sod % 60)
  return { hour, minute, second }
}

// =============================================================================
// 系统时间戳 ↔ 物理时刻(UTC)
// =============================================================================

export interface UtcLeapSecondInput {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export interface SystemConversionOptions {
  /** Date.UTC 无法保留 second=60，因此由调用方额外传递闰秒标签 */
  utcLeapSecond?: UtcLeapSecondInput
}

export interface UtcRepresentation {
  /** 普通 UTC 为正常时间戳；闰秒秒点保留在前一秒并单独标记 */
  timestampMs: number
  isLeapSecond: boolean
}

/** 跨系统换算的可靠起点；1972 年前的早期 UTC 不在支持范围内 */
export function getMinimumCrossSystemTimestamp(system: TimeSystem): number {
  if (system === "GPS" || system === "BDS") return SYSTEM_CONFIG[system].epoch.getTime()
  return Date.UTC(1972, 0, 1)
}

/** 判断某日末尾是否存在正闰秒（23:59:60） */
export function isUtcLeapSecondDate(year: number, month: number, day: number): boolean {
  const nextDayMs = Date.UTC(year, month - 1, day) + SECONDS_IN_DAY * MS_IN_SECOND
  return TAI_UTC_TABLE.some(([effectiveMs], index) => index > 0 && effectiveMs === nextDayMs)
}

/** UTC 日历读数转换为连续 TAI 时间轴，显式支持 23:59:60 */
export function utcDateTimeToTaiMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): number {
  if (second === 60) {
    if (hour !== 23 || minute !== 59 || !isUtcLeapSecondDate(year, month, day)) {
      throw new Error("该日期不存在 UTC 23:59:60 闰秒")
    }
    const normalizedMs = Date.UTC(year, month - 1, day, hour, minute, 60)
    return normalizedMs + taiMinusUtcAt(normalizedMs - MS_IN_SECOND) * MS_IN_SECOND
  }
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second)
  return utcMs + taiMinusUtcAt(utcMs) * MS_IN_SECOND
}

/** 任意系统时间戳转换为连续 TAI 时间轴 */
export function systemTimestampToTaiMs(
  system: TimeSystem,
  timestampMs: number,
  options?: SystemConversionOptions
): number {
  if (system === "UTC") {
    if (options?.utcLeapSecond) {
      const { year, month, day, hour, minute } = options.utcLeapSecond
      return utcDateTimeToTaiMs(year, month, day, hour, minute, 60)
    }
    return timestampMs + taiMinusUtcAt(timestampMs) * MS_IN_SECOND
  }
  return timestampMs + (SYSTEM_TAI_OFFSET[system] ?? 0) * MS_IN_SECOND
}

/** 连续 TAI 时间轴转换为 UTC；闰秒秒点不会被折叠到相邻秒 */
export function taiMsToUtcRepresentation(taiMs: number): UtcRepresentation {
  let offset = TAI_UTC_TABLE[0][1]
  for (let i = 1; i < TAI_UTC_TABLE.length; i++) {
    const [effectiveMs, newOffset] = TAI_UTC_TABLE[i]
    const leapStartTaiMs = effectiveMs + offset * MS_IN_SECOND
    const leapEndTaiMs = effectiveMs + newOffset * MS_IN_SECOND
    if (taiMs < leapStartTaiMs) break
    if (taiMs >= leapStartTaiMs && taiMs < leapEndTaiMs) {
      return {
        timestampMs: effectiveMs - MS_IN_SECOND + (taiMs - leapStartTaiMs),
        isLeapSecond: true,
      }
    }
    offset = newOffset
  }
  return { timestampMs: taiMs - offset * MS_IN_SECOND, isLeapSecond: false }
}

/** 供历史偏差展示使用的 UTC 标称时间戳 */
export function systemTimestampToPhysicalMs(
  system: TimeSystem,
  timestampMs: number,
  options?: SystemConversionOptions
): number {
  return taiMsToUtcRepresentation(systemTimestampToTaiMs(system, timestampMs, options)).timestampMs
}

/**
 * 兼容旧 API。JavaScript Date 无法表达 23:59:60，因此遇到闰秒秒点时明确报错，
 * 不再静默映射到与相邻秒相同的 Date。完整转换请使用 convertSystemTimestampToAllSystems。
 */
export function systemTimestampToPhysical(system: TimeSystem, timestampMs: number): Date {
  const utc = taiMsToUtcRepresentation(systemTimestampToTaiMs(system, timestampMs))
  if (utc.isLeapSecond) {
    throw new Error("JavaScript Date 无法表达 UTC 23:59:60，请使用带闰秒标签的转换结果")
  }
  return new Date(utc.timestampMs)
}

/** 将普通 UTC Date 转换为系统时间戳；Date 本身不能表示 23:59:60 */
export function physicalToSystemTimestamp(system: TimeSystem, physicalDate: Date): Date {
  if (system === "UTC") return new Date(physicalDate.getTime())
  const taiMs = systemTimestampToTaiMs("UTC", physicalDate.getTime())
  return new Date(taiMs - (SYSTEM_TAI_OFFSET[system] ?? 0) * MS_IN_SECOND)
}

// =============================================================================
// 单系统内部转换（基于"系统时间戳"）
// =============================================================================

/**
 * 将系统时间戳转换为该系统的周和周内秒
 * 周秒 = (系统时间戳 - 系统历元) / 604800
 */
export function timestampToWeekTow(system: TimeSystem, timestampMs: number): { week: number; tow: number } {
  const ms = timestampMs - SYSTEM_CONFIG[system].epoch.getTime()
  const totalSeconds = Math.floor(ms / MS_IN_SECOND)
  const week = Math.floor(totalSeconds / SECONDS_IN_WEEK)
  const tow = totalSeconds % SECONDS_IN_WEEK
  return { week, tow }
}

/**
 * 将系统的周和周内秒转换为系统时间戳
 * 系统时间戳 = 历元 + week*604800 + tow
 */
export function weekTowToTimestamp(system: TimeSystem, week: number, tow: number): number {
  return SYSTEM_CONFIG[system].epoch.getTime() + week * SECONDS_IN_WEEK * MS_IN_SECOND + tow * MS_IN_SECOND
}

// =============================================================================
// 日历 ↔ 系统时间戳
// =============================================================================

export function dateTimeToTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): number {
  return Date.UTC(year, month - 1, day, hour, minute, second)
}

export function timestampToDateTime(timestampMs: number): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} {
  const date = new Date(timestampMs)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  }
}

export function doyToTimestamp(year: number, doy: number, sod: number): number {
  const { month, day } = doyToDate(year, doy)
  const { hour, minute, second } = sodToTime(sod)
  return Date.UTC(year, month - 1, day, hour, minute, second)
}

export function timestampToDoyTime(timestampMs: number): {
  year: number
  month: number
  day: number
  doy: number
  sod: number
  hour: number
  minute: number
  second: number
} {
  const { year, month, day, hour, minute, second } = timestampToDateTime(timestampMs)
  const doy = dateToDoy(year, month, day)
  const sod = timeToSod(hour, minute, second)
  return { year, month, day, doy, sod, hour, minute, second }
}

// =============================================================================
// 单系统全格式转换（基于"系统时间戳"）
// =============================================================================

export function getSystemConfig(system: TimeSystem) {
  return SYSTEM_CONFIG[system]
}

export function validateWeekTowInput(week: number, tow: number): string | null {
  if (!Number.isInteger(week) || !Number.isInteger(tow)) return "周数和周内秒必须是整数"
  if (week < 0) return "周数不能小于 0"
  if (tow < 0 || tow >= SECONDS_IN_WEEK) return "周内秒必须在 0～604799 之间"
  return null
}

export function validateDateTimeInput(
  system: TimeSystem,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): string | null {
  const values = [year, month, day, hour, minute, second]
  if (!values.every(Number.isInteger)) return "年月日时分秒必须是整数"
  if (year < 1000) return "请输入四位年份"
  if (month < 1 || month > 12) return "月份必须在 1～12 之间"
  if (day < 1 || day > daysInMonth(year, month)) return "日期超出该月有效范围"
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "时分超出有效范围"
  if (second < 0 || second > 60) return "秒必须在 0～59 之间，UTC 闰日可为 60"
  if (second === 60 && (system !== "UTC" || hour !== 23 || minute !== 59 || !isUtcLeapSecondDate(year, month, day))) {
    return "仅真实 UTC 闰日允许输入 23:59:60"
  }
  const timestampMs = Date.UTC(year, month - 1, day, hour, minute, Math.min(second, 59))
  if (timestampMs < SYSTEM_CONFIG[system].epoch.getTime()) {
    return `${system} 时间不能早于其历元 ${SYSTEM_CONFIG[system].epoch.toISOString().slice(0, 10)}`
  }
  return null
}

export function weekTowToAllFormats(
  system: TimeSystem,
  week: number,
  tow: number
): SystemTimeFormats {
  const validationError = validateWeekTowInput(week, tow)
  if (validationError) throw new Error(validationError)
  const timestampMs = weekTowToTimestamp(system, week, tow)
  const { week: w, tow: t } = timestampToWeekTow(system, timestampMs)
  const { year, month, day, hour, minute, second, doy, sod } = timestampToDoyTime(timestampMs)

  return { system, week: w, tow: t, year, month, day, hour, minute, second, doy, sod }
}

export function dateTimeToAllFormats(
  system: TimeSystem,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): SystemTimeFormats {
  const validationError = validateDateTimeInput(system, year, month, day, hour, minute, second)
  if (validationError) throw new Error(validationError)
  // Date.UTC 会把 23:59:60 归一化到次日；UTC 周秒采用这种 POSIX 式标称值。
  const timestampMs = dateTimeToTimestamp(year, month, day, hour, minute, second)
  const { week, tow } = timestampToWeekTow(system, timestampMs)
  const doy = dateToDoy(year, month, day)
  const sod = timeToSod(hour, minute, second)

  return {
    system,
    week,
    tow,
    year,
    month,
    day,
    hour,
    minute,
    second,
    doy,
    sod,
    isLeapSecond: second === 60 ? true : undefined,
  }
}

export function doyToAllFormats(
  system: TimeSystem,
  year: number,
  doy: number,
  sod: number
): SystemTimeFormats {
  if (![year, doy, sod].every(Number.isInteger) || year < 1000) throw new Error("年份、年积日和日内秒必须是整数，年份须为四位")
  const maxDoy = isLeapYear(year) ? 366 : 365
  if (doy < 1 || doy > maxDoy) throw new Error(`年积日必须在 1～${maxDoy} 之间`)
  if (sod < 0 || sod > SECONDS_IN_DAY) throw new Error("日内秒必须在 0～86399 之间，UTC 闰日可为 86400")

  const { month, day } = doyToDate(year, doy)
  if (sod === SECONDS_IN_DAY) {
    if (system !== "UTC" || !isUtcLeapSecondDate(year, month, day)) {
      throw new Error("仅真实 UTC 闰日允许日内秒 86400（23:59:60）")
    }
    const timestampMs = Date.UTC(year, month - 1, day, 23, 59, 60)
    const { week, tow } = timestampToWeekTow(system, timestampMs)
    return { system, week, tow, year, month, day, hour: 23, minute: 59, second: 60, doy, sod, isLeapSecond: true }
  }

  const validationError = validateDateTimeInput(system, year, month, day, 0, 0, 0)
  if (validationError) throw new Error(validationError)
  const timestampMs = doyToTimestamp(year, doy, sod)
  const { week, tow } = timestampToWeekTow(system, timestampMs)
  const { year: y, month: m, day: d, hour, minute, second } = timestampToDateTime(timestampMs)
  return { system, week, tow, year: y, month: m, day: d, hour, minute, second, doy, sod }
}

// =============================================================================
// 系统间转换（基于"系统时间戳"）
// =============================================================================

/**
 * 将源系统的"时间戳"转换为所有系统的所有格式
 * 逻辑：源系统时间戳 → 物理时刻(UTC) → 各系统时间戳 → 各系统格式
 * 偏差按日期查闰秒表动态确定
 */
export function convertSystemTimestampToAllSystems(
  sourceSystem: TimeSystem,
  sourceTimestampMs: number,
  options?: SystemConversionOptions
): Record<TimeSystem, SystemTimeFormats> {
  if (!Number.isFinite(sourceTimestampMs)) throw new Error("源时间戳无效")
  if (sourceTimestampMs < getMinimumCrossSystemTimestamp(sourceSystem)) {
    throw new Error("源时刻早于该时间系统支持的跨系统换算范围")
  }

  // GPS/BDS 与 TAI 只差固定常数；先进入连续 TAI 时间轴，避免闰秒附近迭代振荡。
  const taiMs = systemTimestampToTaiMs(sourceSystem, sourceTimestampMs, options)
  const utc = taiMsToUtcRepresentation(taiMs)
  const result = {} as Record<TimeSystem, SystemTimeFormats>

  const systems: TimeSystem[] = ["GPS", "BDS", "TAI", "UTC"]
  for (const s of systems) {
    const targetMs = s === "UTC" ? utc.timestampMs : taiMs - (SYSTEM_TAI_OFFSET[s] ?? 0) * MS_IN_SECOND
    const { week, tow } = timestampToWeekTow(s, targetMs)
    const formats = timestampToDoyTime(targetMs)
    if (s === "UTC" && utc.isLeapSecond) {
      formats.second += 1
      formats.sod += 1
    }

    result[s] = {
      system: s,
      week,
      tow,
      ...formats,
      isLeapSecond: s === "UTC" && utc.isLeapSecond ? true : undefined,
      isBeforeEpoch: targetMs < SYSTEM_CONFIG[s].epoch.getTime() ? true : undefined,
    }
  }

  return result
}

/**
 * 兼容旧API：从某系统的周+周内秒（系统时间戳）转换为各系统
 */
export function convertToAllSystems(
  system: TimeSystem,
  week: number,
  tow: number
): Record<TimeSystem, SystemTimeFormats> {
  const sourceTimestampMs = weekTowToTimestamp(system, week, tow)
  return convertSystemTimestampToAllSystems(system, sourceTimestampMs)
}

// =============================================================================
// 系统间时间差
// =============================================================================

/**
 * 两系统时间差（秒），A 比 B 快的秒数
 * @param atMs 在该物理时刻求值（默认当前时刻）；GPS 与 BDS 的差恒为 14 秒
 */
export function getSystemTimeDifference(systemA: TimeSystem, systemB: TimeSystem, atMs: number = Date.now()): number {
  return getSystemUtcOffset(systemA, atMs) - getSystemUtcOffset(systemB, atMs)
}

// =============================================================================
// 格式化输出
// =============================================================================

export function formatWeekTow(week: number, tow: number): string {
  return `第 ${week} 周 + ${tow.toString().padStart(6, "0")} 秒`
}

export function formatDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): string {
  const m = month.toString().padStart(2, "0")
  const d = day.toString().padStart(2, "0")
  const h = hour.toString().padStart(2, "0")
  const min = minute.toString().padStart(2, "0")
  const s = second.toString().padStart(2, "0")
  return `${year}-${m}-${d} ${h}:${min}:${s}`
}

export function formatDoy(year: number, doy: number, sod: number): string {
  const { hour, minute, second } = sod === SECONDS_IN_DAY
    ? { hour: 23, minute: 59, second: 60 }
    : sodToTime(sod)
  const h = hour.toString().padStart(2, "0")
  const m = minute.toString().padStart(2, "0")
  const s = second.toString().padStart(2, "0")
  return `${year}年 第 ${doy.toString().padStart(3, "0")} 日 ${h}:${m}:${s}`
}

export function getSystemDifferenceText(from: TimeSystem, to: TimeSystem, atMs: number = Date.now()): string {
  const diff = getSystemTimeDifference(from, to, atMs)
  if (diff === 0) return "两系统时间一致"
  if (diff > 0) return `${from} 比 ${to} 快 ${diff} 秒`
  return `${from} 比 ${to} 慢 ${Math.abs(diff)} 秒`
}

// =============================================================================
// 向后兼容的旧版 API
// =============================================================================

export function calculateGPSWeekAndTow(date: Date) {
  return timestampToWeekTow("GPS", date.getTime() + getSystemUtcOffset("GPS", date.getTime()) * MS_IN_SECOND)
}

export function calculateBDSWeekAndTow(date: Date) {
  return timestampToWeekTow("BDS", date.getTime() + getSystemUtcOffset("BDS", date.getTime()) * MS_IN_SECOND)
}

export function convertGPSToUTC(week: number, tow: number): Date {
  const gpsTimestamp = weekTowToTimestamp("GPS", week, tow)
  return systemTimestampToPhysical("GPS", gpsTimestamp)
}

export function convertUTCToGPS(date: Date) {
  return timestampToWeekTow("GPS", date.getTime() + getSystemUtcOffset("GPS", date.getTime()) * MS_IN_SECOND)
}

export function convertBDSToUTC(week: number, tow: number): Date {
  const bdsTimestamp = weekTowToTimestamp("BDS", week, tow)
  return systemTimestampToPhysical("BDS", bdsTimestamp)
}

export function convertUTCToBDS(date: Date) {
  return timestampToWeekTow("BDS", date.getTime() + getSystemUtcOffset("BDS", date.getTime()) * MS_IN_SECOND)
}

export function calculateSecondsOfDay(date: Date): number {
  return timestampToDoyTime(date.getTime()).sod
}

export function getDayOfWeekFromTow(tow: number): number {
  return Math.floor(tow / SECONDS_IN_DAY)
}

export function getDayOfWeekName(dow: number): string {
  const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  return dayNames[dow]
}

export function dowToTow(dow: number): number {
  return dow * SECONDS_IN_DAY
}

export function towToDow(tow: number): { dow: number; secondsOfDay: number } {
  const dow = Math.floor(tow / SECONDS_IN_DAY)
  const secondsOfDay = tow % SECONDS_IN_DAY
  return { dow, secondsOfDay }
}
