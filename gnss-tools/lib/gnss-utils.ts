// GNSS 时间工���函数

// GPS 时间常量
const GPS_EPOCH = new Date("1980-01-06T00:00:00Z")
const SECONDS_IN_WEEK = 7 * 24 * 60 * 60
const SECONDS_IN_DAY = 24 * 60 * 60
const GPS_LEAP_SECONDS = 18 // 当前GPS与UTC的闰秒差异

// 北斗时间常量
const BDS_EPOCH = new Date("2006-01-01T00:00:00Z")
const BDS_LEAP_SECONDS = 4 // 当前北斗与UTC的闰秒差异

/**
 * 计算给定日期的GPS周和周内秒
 * @param date 日期对象
 * @returns GPS周和周内秒
 */
export function calculateGPSWeekAndTow(date: Date) {
  // GPS时间起点：1980年1月6日00:00:00 UTC
  // 计算从GPS起始时间到给定时间的毫秒数
  const msFromEpoch = date.getTime() - GPS_EPOCH.getTime() + GPS_LEAP_SECONDS * 1000

  // 计算GPS周：总毫秒数除以一周的毫秒数并向下取整
  const week = Math.floor(msFromEpoch / (SECONDS_IN_WEEK * 1000))

  // 计算周内秒：总秒数对一周的秒数取模
  const totalSeconds = Math.floor(msFromEpoch / 1000)
  const secondsOfWeek = totalSeconds % SECONDS_IN_WEEK

  // 计算周内天数，并转换为对应的秒数
  const dayOfWeek = Math.floor(secondsOfWeek / SECONDS_IN_DAY)
  // 修正差一天的问题
  const adjustedDayOfWeek = (dayOfWeek + 1) % 7
  const tow = adjustedDayOfWeek * SECONDS_IN_DAY

  return { week, tow }
}

/**
 * 计算给定日期的北斗周和周内秒
 * @param date 日期对象
 * @returns 北斗周和周内秒
 */
export function calculateBDSWeekAndTow(date: Date) {
  // 北斗时间起点：2006年1月1日00:00:00 UTC
  // 计算从北斗起始时间到给定时间的毫秒数
  const msFromEpoch = date.getTime() - BDS_EPOCH.getTime() + BDS_LEAP_SECONDS * 1000

  // 计算北斗周：总毫秒数除以一周的毫秒数并向下取整
  const week = Math.floor(msFromEpoch / (SECONDS_IN_WEEK * 1000))

  // 计算周内秒：总秒数对一周的秒数取模
  const totalSeconds = Math.floor(msFromEpoch / 1000)
  const secondsOfWeek = totalSeconds % SECONDS_IN_WEEK

  // 计算周内天数，并转换为对应的秒数
  const dayOfWeek = Math.floor(secondsOfWeek / SECONDS_IN_DAY)
  // 修正差一天的问题
  const adjustedDayOfWeek = (dayOfWeek + 1) % 7
  const tow = adjustedDayOfWeek * SECONDS_IN_DAY

  return { week, tow }
}

/**
 * 将GPS周和周内秒转换为UTC日期时间
 */
export function convertGPSToUTC(week: number, tow: number): Date {
  // 计算从GPS起始时间开始的总毫秒数
  const msFromEpoch = week * SECONDS_IN_WEEK * 1000 + tow * 1000

  // 计算UTC时间（考虑闰秒）
  const utcTime = new Date(GPS_EPOCH.getTime() + msFromEpoch - GPS_LEAP_SECONDS * 1000)

  return utcTime
}

/**
 * 将UTC日期时间转换为GPS周和周内秒
 */
export function convertUTCToGPS(date: Date) {
  return calculateGPSWeekAndTow(date)
}

/**
 * 将北斗周和周内秒转换为UTC日期时间
 */
export function convertBDSToUTC(week: number, tow: number): Date {
  // 计算从北斗起始时间开始的总毫秒数
  const msFromEpoch = week * SECONDS_IN_WEEK * 1000 + tow * 1000

  // 计算UTC时间（考虑闰秒）
  const utcTime = new Date(BDS_EPOCH.getTime() + msFromEpoch - BDS_LEAP_SECONDS * 1000)

  return utcTime
}

/**
 * 将UTC日期时间转换为北斗周和周内秒
 */
export function convertUTCToBDS(date: Date) {
  return calculateBDSWeekAndTow(date)
}

/**
 * 计算给定日期的日内秒
 */
export function calculateSecondsOfDay(date: Date): number {
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const seconds = date.getUTCSeconds()
  const milliseconds = date.getUTCMilliseconds()

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

/**
 * 从周内秒计算周内日
 */
export function getDayOfWeekFromTow(tow: number): number {
  return Math.floor(tow / SECONDS_IN_DAY)
}

/**
 * 获取周内日的名称
 */
export function getDayOfWeekName(dow: number): string {
  const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  return dayNames[dow]
}

/**
 * 将周内日转换为周内秒
 */
export function dowToTow(dow: number): number {
  return dow * SECONDS_IN_DAY
}

/**
 * 将周内秒转换为周内日和日内秒
 */
export function towToDow(tow: number): { dow: number; secondsOfDay: number } {
  const dow = Math.floor(tow / SECONDS_IN_DAY)
  const secondsOfDay = tow % SECONDS_IN_DAY
  return { dow, secondsOfDay }
}
