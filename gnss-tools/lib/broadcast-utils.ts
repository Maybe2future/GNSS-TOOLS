// lib/broadcast-utils.ts

// RINEX 导航文件（广播星历）解析与 SP3 转换工具
// 支持 RINEX 3.x 混合导航文件（G/E/C/J）与 RINEX 2.x GPS 导航文件。
// GLONASS(R) / SBAS(S) 记录只有 3 行续行且需要数值积分，暂不支持，解析时跳过并计数。

// RINEX 数据行中的数值令牌：支持 Fortran D 指数（如 -1.234567890123D-04）
// 以及 19 字符定宽字段负数无空格拼接的情况（如 ...D-04-9.094947017729D-13）
const NUM_TOKEN = /[+-]?\d+\.\d+(?:[DdEe][+-]?\d+)?/g

const WEEK_MS = 604800000 // 一周的毫秒数
const HALF_WEEK_S = 302400 // 半周秒数（用于周内秒回绕）
const GPS_EPOCH_MS = Date.UTC(1980, 0, 6) // GPST 原点：1980-01-06 00:00:00
const BDS_EPOCH_MS = Date.UTC(2006, 0, 1) // BDT 原点：2006-01-01 00:00:00
const BDT_GPST_OFFSET_MS = 14000 // BDT = GPST - 14s

// 各卫星系统的开普勒模型常数（依据 GPS ICD-200 / BDS ICD）
const SYSTEM_PARAMS: Record<string, { mu: number; omegaE: number; epochMs: number }> = {
  G: { mu: 3.986005e14, omegaE: 7.2921151467e-5, epochMs: GPS_EPOCH_MS },
  J: { mu: 3.986005e14, omegaE: 7.2921151467e-5, epochMs: GPS_EPOCH_MS },
  E: { mu: 3.986004418e14, omegaE: 7.2921151467e-5, epochMs: GPS_EPOCH_MS },
  C: { mu: 3.986004418e14, omegaE: 7.292115e-5, epochMs: BDS_EPOCH_MS },
}

// 相对论效应常数 F = -2*sqrt(mu)/c^2 (s/m^0.5)
const F_REL = -4.442807633e-10

export interface RINEXNavigationData {
  header: {
    version: string
    fileType: string
    satelliteSystem: string
    program: string
    agency: string
    date: string
    leapSeconds: number
  }
  ephemerides: Ephemeris[]
  /** 跳过的 GLONASS/SBAS 星历记录数 */
  skippedSatellites: number
  /** 校验失败被丢弃的星历记录数 */
  droppedRecords: number
}

export interface Ephemeris {
  /** 卫星ID，如 G01 / C21 */
  satellite: string
  /** 系统字符：G GPS / E Galileo / C BDS / J QZSS */
  system: string
  /** 记录历元（即 toc），毫秒数，卫星系统自身时间尺度（GPST 或 BDT） */
  epochMs: number
  /** 扁平数据数组：[af0, af1, af2, IODE, Crs, delta_n, M0, Cuc, e, Cus, sqrtA, toe, Cic, OMEGA0, Cis, i0, Crc, omega, OMEGADOT, IDOT, codesL2, week, L2P, acc, health, TGD, IODC, ...] */
  data: number[]
}

// SP3文件数据结构
export interface SP3RecordSatellite {
  id: string
  /** 千米 */
  x: number
  y: number
  z: number
  /** 微秒 */
  clock: number
}

export interface SP3Record {
  /** 历元（GPST 毫秒数） */
  epochMs: number
  /** 供显示用的格式化历元字符串（由毫秒值按 UTC 生成） */
  epoch: string
  satellites: SP3RecordSatellite[]
}

export interface SP3Data {
  header: {
    version?: string
    /** 供显示用的格式化起始历元字符串 */
    startEpoch: string
    /** 起始历元（GPST 毫秒数） */
    startEpochMs: number
    numberOfEpochs: number
    dataUsed?: string
    coordinateSystem?: string
    orbitType?: string
    agency?: string
    timeSystem?: string
    satellites: string[]
  }
  records: SP3Record[]
}

/**
 * 用全局正则对 RINEX 数据行进行分词，避免定宽字段无空格拼接导致 NaN
 * @param text 待分词的文本（数据行或历元行数据部分）
 * @returns 数值数组
 */
function tokenizeNumbers(text: string): number[] {
  const tokens = text.match(NUM_TOKEN) || []
  return tokens.map((t) => Number.parseFloat(t.replace(/[Dd]/, "E")))
}

/**
 * 校验并添加一条星历记录；字段不足或含非法值则丢弃并计数
 */
function addRecord(nav: RINEXNavigationData, satellite: string, system: string, epochMs: number, values: number[]): void {
  // 至少需要到 IODC/TGD2（索引26），即 27 个数值
  if (values.length >= 27 && values.every((v) => Number.isFinite(v))) {
    nav.ephemerides.push({ satellite, system, epochMs, data: values })
  } else {
    nav.droppedRecords++
  }
}

/**
 * 解析 RINEX 导航文件内容
 * @param content RINEX 导航文件内容
 * @returns 解析后的数据（历元以毫秒数存储）
 */
export function parseRINEXNav(content: string): RINEXNavigationData {
  const lines = content.split(/\r?\n/)
  const navigationData: RINEXNavigationData = {
    header: {
      version: "",
      fileType: "",
      satelliteSystem: "",
      program: "",
      agency: "",
      date: "",
      leapSeconds: 0,
    },
    ephemerides: [],
    skippedSatellites: 0,
    droppedRecords: 0,
  }

  let i = 0
  let version = 0

  // ---- 头部解析 ----
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (i === 0) {
      // 版本号位于首行前 9 个字符
      version = Number.parseFloat(line.substring(0, 9)) || 0
      navigationData.header.version = String(Number.parseFloat(line.substring(0, 9)) || "")
    }
    if (line.includes("RINEX VERSION / TYPE")) {
      version = Number.parseFloat(line.substring(0, 9)) || version
      navigationData.header.version = String(Number.parseFloat(line.substring(0, 9)) || "")
      navigationData.header.fileType = line.substring(20, 40).trim()
      navigationData.header.satelliteSystem = line.substring(40, 60).trim()
    } else if (line.includes("PGM / RUN BY / DATE")) {
      navigationData.header.program = line.substring(0, 20).trim()
      navigationData.header.agency = line.substring(20, 40).trim()
      navigationData.header.date = line.substring(40, 60).trim()
    } else if (line.includes("LEAP SECONDS")) {
      // 仅作信息保存，不参与计算
      navigationData.header.leapSeconds = Number.parseInt(line.substring(0, 6).trim(), 10) || 0
    } else if (line.includes("END OF HEADER")) {
      i++
      break
    }
  }

  // RINEX 2 仅支持 GPS 导航文件；GLONASS（type 为 G）直接报错
  if (version > 0 && version < 3) {
    const ft = navigationData.header.fileType.toUpperCase()
    const sys = navigationData.header.satelliteSystem.toUpperCase()
    if (ft.startsWith("G") || ft.includes("GLONASS") || sys.startsWith("R")) {
      throw new Error("暂不支持 RINEX 2 GLONASS 导航文件（广播星历需要数值积分），请改用 RINEX 3 混合导航文件")
    }
  }

  // ---- 数据记录解析 ----
  while (i < lines.length) {
    const line = lines[i]
    i++
    if (line.trim() === "") continue

    if (version >= 3) {
      // RINEX 3：行首为系统字符 + 两位 PRN，如 G01 / C21
      const m = line.match(/^([GECJRS])(\d{2}) /)
      if (!m) continue
      const sys = m[1]
      if (sys === "R" || sys === "S") {
        // GLONASS / SBAS：历元行 + 3 行续行，跳过（需要数值积分，超出本工具范围）
        i += 3
        navigationData.skippedSatellites++
        continue
      }

      // 历元字段：年 月 日 时 分 秒（空格分隔，位于数据字段之前）
      const epochParts = line.substring(4, 23).trim().split(/\s+/)
      if (epochParts.length < 6) {
        navigationData.droppedRecords++
        i += 7
        continue
      }
      const year = Number.parseInt(epochParts[0], 10)
      const month = Number.parseInt(epochParts[1], 10)
      const day = Number.parseInt(epochParts[2], 10)
      const hour = Number.parseInt(epochParts[3], 10)
      const minute = Number.parseInt(epochParts[4], 10)
      const second = Number.parseFloat(epochParts[5])
      // 用 Date.UTC 计算毫秒数，避免时区与 Safari 日期字符串解析问题
      const epochMs = Date.UTC(year, month - 1, day, hour, minute, Math.trunc(second))

      // 历元行数据部分（索引 23 起）：af0 af1 af2
      const values = tokenizeNumbers(line.substring(23))
      // 7 行续行，每行 4 个字段
      for (let k = 0; k < 7 && i < lines.length; k++, i++) {
        values.push(...tokenizeNumbers(lines[i]))
      }
      addRecord(navigationData, line.substring(0, 3), sys, epochMs, values)
    } else {
      // RINEX 2：历元行为 可选空格 + 1-2 位 PRN + 6 个时间字段（两位年）
      const head = line.substring(0, 22).trim().split(/\s+/)
      const isEpochLine =
        head.length === 7 &&
        head.every((t) => /^\d{1,4}(\.\d+)?$/.test(t)) &&
        head[0].length <= 2 &&
        head[1].length <= 2 &&
        /^ {0,2}\d/.test(line)
      if (!isEpochLine) continue

      const prn = Number.parseInt(head[0], 10)
      const yy = Number.parseInt(head[1], 10)
      // 两位年 pivot：>= 80 → 19yy，否则 20yy
      const year = yy >= 80 ? 1900 + yy : 2000 + yy
      const month = Number.parseInt(head[2], 10)
      const day = Number.parseInt(head[3], 10)
      const hour = Number.parseInt(head[4], 10)
      const minute = Number.parseInt(head[5], 10)
      const second = Number.parseFloat(head[6])
      const epochMs = Date.UTC(year, month - 1, day, hour, minute, Math.trunc(second))

      // 历元行数据部分（索引 22 起）：af0 af1 af2
      const values = tokenizeNumbers(line.substring(22))
      for (let k = 0; k < 7 && i < lines.length; k++, i++) {
        values.push(...tokenizeNumbers(lines[i]))
      }
      // RINEX 2 GPS 导航文件，统一按 GPS 处理
      addRecord(navigationData, `G${String(prn).padStart(2, "0")}`, "G", epochMs, values)
    }
  }

  return navigationData
}

/**
 * 按 GPS ICD-200 / BDS ICD 的开普勒轨道模型计算卫星位置和钟差
 * @param eph 星历记录
 * @param tMs 计算时刻，毫秒数，卫星系统自身时间尺度（GPST 或 BDT）
 * @returns ECEF 坐标（米）与钟差（秒）
 */
export function propagateSatellite(eph: Ephemeris, tMs: number): { x: number; y: number; z: number; clock: number } {
  const params = SYSTEM_PARAMS[eph.system] ?? SYSTEM_PARAMS.G
  const d = eph.data

  const af0 = d[0]
  const af1 = d[1]
  const af2 = d[2]
  const Crs = d[4]
  const deltaN = d[5]
  const M0 = d[6]
  const Cuc = d[7]
  const e = d[8]
  const Cus = d[9]
  const sqrtA = d[10]
  const toe = d[11]
  const Cic = d[12]
  const OMEGA0 = d[13]
  const Cis = d[14]
  const i0 = d[15]
  const Crc = d[16]
  const omega = d[17]
  const OMEGADOT = d[18]
  const IDOT = d[19]
  const TGD = d[25] // BDS 为 TGD1

  // toe 对应的毫秒时刻：记录历元所在周的周起点 + toe
  const weekStartMs = params.epochMs + Math.floor((eph.epochMs - params.epochMs) / WEEK_MS) * WEEK_MS
  const toeMs = weekStartMs + toe * 1000

  // 相对 toe 的时间差，并做半周回绕
  let tk = (tMs - toeMs) / 1000
  if (tk > HALF_WEEK_S) tk -= 604800
  else if (tk < -HALF_WEEK_S) tk += 604800

  const A = sqrtA * sqrtA
  const n0 = Math.sqrt(params.mu / (A * A * A))
  const n = n0 + deltaN
  const Mk = M0 + n * tk

  // 迭代解开普勒方程 Ek = Mk + e*sin(Ek)
  let Ek = Mk
  for (let k = 0; k < 10; k++) {
    Ek = Mk + e * Math.sin(Ek)
  }
  const sinE = Math.sin(Ek)
  const cosE = Math.cos(Ek)

  const nuk = Math.atan2(Math.sqrt(1 - e * e) * sinE, cosE - e)
  const phik = nuk + omega
  const sin2p = Math.sin(2 * phik)
  const cos2p = Math.cos(2 * phik)
  const duk = Cus * sin2p + Cuc * cos2p
  const drk = Crs * sin2p + Crc * cos2p
  const dik = Cis * sin2p + Cic * cos2p

  const uk = phik + duk
  const rk = A * (1 - e * cosE) + drk
  const ik = i0 + dik + IDOT * tk
  const xOp = rk * Math.cos(uk)
  const yOp = rk * Math.sin(uk)

  const OMEGAk = OMEGA0 + (OMEGADOT - params.omegaE) * tk - params.omegaE * toe

  // ECEF 坐标（米）
  const x = xOp * Math.cos(OMEGAk) - yOp * Math.cos(ik) * Math.sin(OMEGAk)
  const y = xOp * Math.sin(OMEGAk) + yOp * Math.cos(ik) * Math.cos(OMEGAk)
  const z = yOp * Math.sin(ik)

  // 钟差（秒）：相对 toc 的时间差，同样做半周回绕
  let dt = (tMs - eph.epochMs) / 1000
  if (dt > HALF_WEEK_S) dt -= 604800
  else if (dt < -HALF_WEEK_S) dt += 604800
  const dtr = F_REL * e * sqrtA * sinE
  const clock = af0 + af1 * dt + af2 * dt * dt + dtr - TGD

  return { x, y, z, clock }
}

/**
 * 按卫星分组并将其星历记录按历元排序（用于最近星历查找）
 */
function groupBySatellite(ephemerides: Ephemeris[]): Map<string, Ephemeris[]> {
  const map = new Map<string, Ephemeris[]>()
  for (const eph of ephemerides) {
    const list = map.get(eph.satellite)
    if (list) list.push(eph)
    else map.set(eph.satellite, [eph])
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.epochMs - b.epochMs)
  }
  return map
}

/**
 * 二分查找最接近指定时刻的星历记录
 */
function findClosestEphemeris(sorted: Ephemeris[], tMs: number): Ephemeris | undefined {
  if (sorted.length === 0) return undefined
  let lo = 0
  let hi = sorted.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid].epochMs < tMs) lo = mid + 1
    else hi = mid
  }
  // lo 为第一个 epochMs >= tMs 的位置，比较 lo 与 lo-1
  let best = sorted[lo]
  if (lo > 0 && Math.abs(sorted[lo - 1].epochMs - tMs) <= Math.abs(best.epochMs - tMs)) {
    best = sorted[lo - 1]
  }
  return best
}

/**
 * 将广播星历数据转换为 SP3 格式数据
 * @param rinexData RINEX 导航数据
 * @param interval 历元间隔（秒）
 * @returns SP3 格式数据（位置千米、钟差微秒，时间轴为 GPST）
 */
export function convertBroadcastToSP3(rinexData: RINEXNavigationData, interval: number): SP3Data {
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new Error("历元间隔必须是大于 0 的有限数值")
  }

  const sp3Data: SP3Data = {
    header: {
      version: "d",
      startEpoch: "",
      startEpochMs: 0,
      numberOfEpochs: 0,
      dataUsed: "BROADCAST",
      coordinateSystem: "IGS14",
      orbitType: "FIT",
      agency: "GNSS",
      timeSystem: "GPS",
      satellites: [],
    },
    records: [],
  }

  if (!rinexData || !rinexData.ephemerides || rinexData.ephemerides.length === 0) {
    console.warn("No ephemeris data found in RINEX data.")
    return sp3Data
  }

  const satellites = [...new Set(rinexData.ephemerides.map((eph) => eph.satellite))]
  sp3Data.header.satellites = satellites
  const bySatellite = groupBySatellite(rinexData.ephemerides)

  // 输出时间轴使用 GPST 毫秒：BDS 记录的历元（BDT）需加 14 秒换算到 GPST
  const toGpstMs = (eph: Ephemeris) => (eph.system === "C" ? eph.epochMs + BDT_GPST_OFFSET_MS : eph.epochMs)
  let startMs = Number.POSITIVE_INFINITY
  let endMs = Number.NEGATIVE_INFINITY
  for (const eph of rinexData.ephemerides) {
    const g = toGpstMs(eph)
    if (g < startMs) startMs = g
    if (g > endMs) endMs = g
  }

  const stepMs = interval * 1000
  const numberOfEpochs = Math.floor((endMs - startMs) / stepMs) + 1
  // 限制历元总数，防止浏览器卡死
  if (numberOfEpochs > 100000) {
    throw new Error(`历元总数 ${numberOfEpochs} 超过上限 100000，请增大历元间隔`)
  }
  sp3Data.header.numberOfEpochs = numberOfEpochs
  sp3Data.header.startEpochMs = startMs
  sp3Data.header.startEpoch = formatEpochMs(startMs)

  // 最近星历允许的最大时间差：4 小时
  const MAX_EPH_DIFF_MS = 4 * 3600 * 1000

  for (let k = 0; k < numberOfEpochs; k++) {
    const tGpst = startMs + k * stepMs
    const record: SP3Record = {
      epochMs: tGpst,
      epoch: formatEpochMs(tGpst),
      satellites: [],
    }

    for (const satId of satellites) {
      const list = bySatellite.get(satId)
      if (!list) continue
      // 换算到卫星系统自身时间尺度：BDS 卫星用 BDT = GPST - 14s
      const system = satId.charAt(0)
      const tSys = system === "C" ? tGpst - BDT_GPST_OFFSET_MS : tGpst

      const closest = findClosestEphemeris(list, tSys)
      if (!closest) continue
      if (Math.abs(closest.epochMs - tSys) > MAX_EPH_DIFF_MS) continue

      const { x, y, z, clock } = propagateSatellite(closest, tSys)
      record.satellites.push({
        id: satId,
        // SP3 位置单位为千米，钟差单位为微秒
        x: x / 1000,
        y: y / 1000,
        z: z / 1000,
        clock: clock * 1e6,
      })
    }

    sp3Data.records.push(record)
  }

  return sp3Data
}

/**
 * 由毫秒数生成格式化历元字符串（使用 UTC getter，不做时区转换）
 */
function formatEpochMs(ms: number): string {
  const d = new Date(ms)
  const sec = d.getUTCSeconds() + d.getUTCMilliseconds() / 1000
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${sec.toFixed(2).padStart(5, "0")}`
}

/**
 * 计算给定 GPST 毫秒时刻的 GPS 周和周内秒（保留小数秒）
 * @param tMs GPST 毫秒数
 * @returns GPS 周和周内秒
 */
export function calculateGPSWeekAndSeconds(tMs: number): { week: number; seconds: number } {
  const diffMs = tMs - GPS_EPOCH_MS
  const week = Math.floor(diffMs / WEEK_MS)
  const seconds = diffMs / 1000 - week * 604800
  return { week, seconds }
}

/**
 * 生成SP3文件内容
 * @param sp3Data SP3数据
 * @returns SP3文件内容字符串
 */
export function generateSP3Content(sp3Data: SP3Data): string {
  let content = ""

  // 起始历元毫秒数（优先使用存储的毫秒值，缺失时退化为当前时间）
  const startEpochMs =
    sp3Data.header.startEpochMs ||
    (sp3Data.records.length > 0 ? sp3Data.records[0].epochMs : Date.now())
  const startEpochDate = new Date(startEpochMs)

  // 计算GPS周和周内秒
  const { week: gpsWeek, seconds: gpsSecond } = calculateGPSWeekAndSeconds(startEpochMs)

  const year = startEpochDate.getUTCFullYear().toString()
  const month = (startEpochDate.getUTCMonth() + 1).toString().padStart(2, "0")
  const day = startEpochDate.getUTCDate().toString().padStart(2, "0")
  const hour = startEpochDate.getUTCHours().toString().padStart(2, "0")
  const minute = startEpochDate.getUTCMinutes().toString().padStart(2, "0")
  const second = (startEpochDate.getUTCSeconds() + startEpochDate.getUTCMilliseconds() / 1000).toFixed(8)

  // 计算历元间隔（秒）：直接由相邻历元的毫秒数相减
  let interval = 900 // 默认15分钟
  if (sp3Data.records.length > 1) {
    const diff = (sp3Data.records[1].epochMs - sp3Data.records[0].epochMs) / 1000
    if (Number.isFinite(diff) && diff > 0) {
      interval = diff
    }
  }

  // 第一行 - 版本、历元、卫星数
  let line1 = "#d"
  line1 += "P"
  line1 += year.padStart(4, " ") + " "
  line1 += month.padStart(2, " ") + " "
  line1 += day.padStart(2, " ") + " "
  line1 += hour.padStart(2, " ") + " "
  line1 += minute.padStart(2, " ") + " " // 注意这里只有一个空格
  line1 += second.padStart(11, " ") // 确保秒是11位，包括小数点后8位

  // 确保numberOfEpochs在第37列
  while (line1.length < 36) {
    line1 += " "
  }
  line1 += sp3Data.header.numberOfEpochs.toString()

  // 确保"d+D"在第43列，前面有两个空格
  while (line1.length < 41) {
    line1 += " "
  }
  line1 += " d+D IGS14 FIT GNSS"
  content += line1.substring(0, 60).padEnd(60, " ") + "\n"

  // 第二行 - GPS周、周内秒、历元间隔、约化儒略日及天内秒
  const dayMs = 86400000
  const modifiedJulianDay = Math.floor(startEpochMs / dayMs) + 40587
  const secondsOfDay = ((startEpochMs % dayMs) + dayMs) % dayMs / 1000
  let line2 = "## "
  line2 += gpsWeek.toString().padStart(4, " ") + " "
  line2 += gpsSecond.toFixed(8).padStart(15, " ")

  // 确保interval在第27列开始，保留8位小数
  while (line2.length < 26) {
    line2 += " "
  }
  line2 += interval.toFixed(8).padStart(9, " ") + " "
  line2 += modifiedJulianDay.toString().padStart(5, " ") + " "
  line2 += secondsOfDay.toFixed(13).padStart(15, " ")
  content += line2.substring(0, 60).padEnd(60, " ") + "\n"

  // 卫星列表 - 每行最多17颗卫星，"+ "和"++"行总共限制在10行
  const satellites = sp3Data.header.satellites
  const maxSatsPerLine = 17
  const totalSatellites = satellites.length
  const requiredPlusLines = Math.ceil(totalSatellites / maxSatsPerLine)
  const availablePlusPlusLines = Math.max(0, 10 - requiredPlusLines)

  // 第一行卫星列表
  let satLine = `+  ${satellites.length.toString().padStart(3, " ")}   `
  const firstLineCount = Math.min(satellites.length, maxSatsPerLine)

  // 添加实际的卫星
  for (let i = 0; i < firstLineCount; i++) {
    satLine += satellites[i].padStart(3, " ")
  }

  // 用"  0"填充不足17颗的部分
  const remainingFirstLine = maxSatsPerLine - firstLineCount
  for (let i = 0; i < remainingFirstLine; i++) {
    satLine += "  0"
  }

  content += satLine.substring(0, 60).padEnd(60, " ") + "\n"

  // 填充剩余卫星行
  for (let line = 1; line < requiredPlusLines; line++) {
    satLine = "+        "
    const startIdx = line * maxSatsPerLine
    const endIdx = Math.min((line + 1) * maxSatsPerLine, satellites.length)

    // 添加实际的卫星
    for (let i = startIdx; i < endIdx; i++) {
      satLine += satellites[i].padStart(3, " ")
    }

    // 用"  0"填充不足17颗的部分
    const remainingSats = maxSatsPerLine - (endIdx - startIdx)
    for (let i = 0; i < remainingSats; i++) {
      satLine += "  0"
    }

    content += satLine.substring(0, 60).padEnd(60, " ") + "\n"
  }

  // 添加"++"行，表示卫星精度，限制在可用的行数内
  for (let line = 0; line < availablePlusPlusLines; line++) {
    let accLine = "++       "
    const startIdx = line * maxSatsPerLine
    const endIdx = Math.min((line + 1) * maxSatsPerLine, satellites.length)

    // 添加实际的卫星精度
    for (let i = startIdx; i < endIdx; i++) {
      accLine += "  5" // 默认精度为5
    }

    // 用"  0"填充不足17颗的部分
    const remainingSats = maxSatsPerLine - (endIdx - startIdx)
    for (let i = 0; i < remainingSats; i++) {
      accLine += "  0"
    }

    content += accLine.substring(0, 60).padEnd(60, " ") + "\n"
  }

  // 添加标准头部行
  content += "%c M  cc GPS ccc cccc cccc cccc cccc ccccc ccccc ccccc ccccc".substring(0, 60).padEnd(60, " ") + "\n"
  content += "%c cc cc ccc ccc cccc cccc cccc cccc ccccc ccccc ccccc ccccc".substring(0, 60).padEnd(60, " ") + "\n"
  content += "%f  1.2500000  1.025000000  0.00000000000  0.000000000000000".substring(0, 60).padEnd(60, " ") + "\n"
  content += "%f  0.0000000  0.000000000  0.00000000000  0.000000000000000".substring(0, 60).padEnd(60, " ") + "\n"
  content += "%i    0    0    0    0      0      0      0      0         0".substring(0, 60).padEnd(60, " ") + "\n"
  content += "%i    0    0    0    0      0      0      0      0         0".substring(0, 60).padEnd(60, " ") + "\n"

  // 添加注释行，限制在5行
  content += "/* CONVERTED FROM BROADCAST EPHEMERIS                       ".substring(0, 60).padEnd(60, " ") + "\n"
  content += "/* BROADCAST EPHEMERIS USED AS SOURCE FOR ORBIT/CLOCK DATA  ".substring(0, 60).padEnd(60, " ") + "\n"
  content += "/* GENERATED USING GNSS TOOLS                               ".substring(0, 60).padEnd(60, " ") + "\n"
  content += "/* ACCURACY OF ORBIT/CLOCK DATA IS LIMITED BY BROADCAST DATA".substring(0, 60).padEnd(60, " ") + "\n"
  content += "/* ORBIT INTERPOLATION IS NOT RECOMMENDED                   ".substring(0, 60).padEnd(60, " ") + "\n"

  // 添加历元和卫星位置数据
  sp3Data.records.forEach((record) => {
    // 历元行：由毫秒值按 UTC 格式化
    const d = new Date(record.epochMs)
    const eYear = d.getUTCFullYear().toString().padStart(4, " ")
    const eMonth = (d.getUTCMonth() + 1).toString().padStart(2, " ")
    const eDay = d.getUTCDate().toString().padStart(2, " ")
    const eHour = d.getUTCHours().toString().padStart(2, " ")
    const eMinute = d.getUTCMinutes().toString().padStart(2, " ")

    // 确保秒是11位，包括小数点后8位
    const sec = d.getUTCSeconds() + d.getUTCMilliseconds() / 1000
    const formattedSecond = sec.toFixed(8).padStart(11, " ")
    content += `*  ${eYear} ${eMonth} ${eDay} ${eHour} ${eMinute} ${formattedSecond}\n`

    // 卫星位置行
    record.satellites.forEach((sat) => {
      const xStr = sat.x.toFixed(6).padStart(14, " ")
      const yStr = sat.y.toFixed(6).padStart(14, " ")
      const zStr = sat.z.toFixed(6).padStart(14, " ")
      const clockStr = sat.clock.toFixed(6).padStart(14, " ")

      content += `P${sat.id.padStart(3, " ")}${xStr}${yStr}${zStr}${clockStr}\n`
    })
  })

  // 添加文件结束标记
  content += "EOF\n"

  return content
}
