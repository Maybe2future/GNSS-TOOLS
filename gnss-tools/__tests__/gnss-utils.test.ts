import { describe, it, expect } from 'vitest'
import {
  isLeapYear,
  daysInYear,
  dateToDoy,
  doyToDate,
  timeToSod,
  sodToTime,
  timestampToWeekTow,
  weekTowToTimestamp,
  timestampToDateTime,
  timestampToDoyTime,
  dateTimeToTimestamp,
  doyToTimestamp,
  weekTowToAllFormats,
  dateTimeToAllFormats,
  doyToAllFormats,
  convertSystemTimestampToAllSystems,
  getSystemTimeDifference,
  getSystemDifferenceText,
  formatWeekTow,
  formatDateTime,
  formatDoy,
  type TimeSystem,
} from '@/lib/gnss-utils'

// =============================================================================
// 基础工具函数测试
// =============================================================================
describe('基础工具函数', () => {
  it('isLeapYear - 正确判断闰年', () => {
    expect(isLeapYear(2000)).toBe(true)
    expect(isLeapYear(2020)).toBe(true)
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2023)).toBe(false)
    expect(isLeapYear(2025)).toBe(false)
  })

  it('daysInYear - 返回正确天数', () => {
    expect(daysInYear(2024)).toBe(366)
    expect(daysInYear(2023)).toBe(365)
  })

  it('dateToDoy - 正确转换年月日到DOY', () => {
    expect(dateToDoy(2024, 1, 1)).toBe(1)
    expect(dateToDoy(2024, 12, 31)).toBe(366)
    expect(dateToDoy(2023, 12, 31)).toBe(365)
    expect(dateToDoy(2024, 3, 1)).toBe(61)
    expect(dateToDoy(2023, 3, 1)).toBe(60)
  })

  it('doyToDate - 正确转换DOY到年月日', () => {
    expect(doyToDate(2024, 1)).toEqual({ month: 1, day: 1 })
    expect(doyToDate(2024, 366)).toEqual({ month: 12, day: 31 })
    expect(doyToDate(2023, 365)).toEqual({ month: 12, day: 31 })
    expect(doyToDate(2024, 61)).toEqual({ month: 3, day: 1 })
    expect(doyToDate(2023, 60)).toEqual({ month: 3, day: 1 })
  })

  it('timeToSod - 正确转换时分秒到SOD', () => {
    expect(timeToSod(0, 0, 0)).toBe(0)
    expect(timeToSod(23, 59, 59)).toBe(86399)
    expect(timeToSod(12, 30, 45)).toBe(12 * 3600 + 30 * 60 + 45)
  })

  it('sodToTime - 正确转换SOD到时分秒', () => {
    expect(sodToTime(0)).toEqual({ hour: 0, minute: 0, second: 0 })
    expect(sodToTime(86399)).toEqual({ hour: 23, minute: 59, second: 59 })
    expect(sodToTime(12 * 3600 + 30 * 60 + 45)).toEqual({ hour: 12, minute: 30, second: 45 })
  })
})

// =============================================================================
// 系统时间戳 ↔ 周秒 测试
// =============================================================================
describe('系统时间戳 ↔ 周秒', () => {
  it('timestampToWeekTow - GPS 2026-01-01 00:00:00 -> W2399 TOW=345600', () => {
    const ts = Date.UTC(2026, 0, 1, 0, 0, 0)
    const { week, tow } = timestampToWeekTow('GPS', ts)
    expect(week).toBe(2399)
    expect(tow).toBe(345600)
  })

  it('timestampToWeekTow - GPS 2026-04-24 00:00:00 -> W2415 TOW=432000', () => {
    const ts = Date.UTC(2026, 3, 24, 0, 0, 0)
    const { week, tow } = timestampToWeekTow('GPS', ts)
    expect(week).toBe(2415)
    expect(tow).toBe(432000)
  })

  it('weekTowToTimestamp -> timestampToWeekTow 自洽', () => {
    const week = 2300
    const tow = 43200
    const ts = weekTowToTimestamp('GPS', week, tow)
    const result = timestampToWeekTow('GPS', ts)
    expect(result.week).toBe(week)
    expect(result.tow).toBe(tow)
  })

  it('timestampToWeekTow - BDS 2026-01-01 00:00:00', () => {
    const ts = Date.UTC(2026, 0, 1, 0, 0, 0)
    const { week, tow } = timestampToWeekTow('BDS', ts)
    expect(week).toBe(1043)
    expect(tow).toBe(345600)
  })
})

// =============================================================================
// GPS 时间系统内部转换测试
// =============================================================================
describe('GPS 时间系统内部转换', () => {
  it('weekTowToAllFormats - GPS W2415 TOW=43200', () => {
    const result = weekTowToAllFormats('GPS', 2415, 43200)
    expect(result.system).toBe('GPS')
    expect(result.week).toBe(2415)
    expect(result.tow).toBe(43200)
    expect(result.year).toBe(2026)
    expect(result.month).toBe(4)
    expect(result.day).toBe(19)  // GPS时间戳 2026-04-19 12:00:00
    expect(result.hour).toBe(12)
    expect(result.minute).toBe(0)
    expect(result.second).toBe(0)
  })

  it('dateTimeToAllFormats - 日历转全格式', () => {
    const result = dateTimeToAllFormats('GPS', 2026, 1, 1, 0, 0, 0)
    expect(result.week).toBe(2399)
    expect(result.tow).toBe(345600)
  })

  it('doyToAllFormats - DOY转全格式', () => {
    const result = doyToAllFormats('GPS', 2026, 1, 0)
    expect(result.week).toBe(2399)
    expect(result.tow).toBe(345600)
    expect(result.month).toBe(1)
    expect(result.day).toBe(1)
  })
})

// =============================================================================
// BDS 时间系统内部转换测试
// =============================================================================
describe('BDS 时间系统内部转换', () => {
  it('dateTimeToAllFormats - BDS 2026-01-01 00:00:00', () => {
    const result = dateTimeToAllFormats('BDS', 2026, 1, 1, 0, 0, 0)
    expect(result.week).toBe(1043)
    expect(result.tow).toBe(345600)
  })

  it('weekTowToAllFormats - BDS全格式', () => {
    const result = weekTowToAllFormats('BDS', 900, 0)
    expect(result.system).toBe('BDS')
    expect(result.week).toBe(900)
    expect(result.tow).toBe(0)
  })
})

// =============================================================================
// UTC 时间系统内部转换测试
// =============================================================================
describe('UTC 时间系统内部转换', () => {
  it('dateTimeToAllFormats - 2024-01-01 -> UTC W2817 TOW=345600', () => {
    const result = dateTimeToAllFormats('UTC', 2024, 1, 1, 0, 0, 0)
    expect(result.week).toBe(2817)
    expect(result.tow).toBe(345600)
  })
})

// =============================================================================
// 系统间转换测试（基于系统时间戳）
// =============================================================================
describe('系统间转换（基于系统时间戳）', () => {
  it('GPS 2026-01-01 00:00:00 -> 各系统', () => {
    const gpsTs = Date.UTC(2026, 0, 1, 0, 0, 0)
    const results = convertSystemTimestampToAllSystems('GPS', gpsTs)

    // GPS：输入值直接返回
    expect(results.GPS.week).toBe(2399)
    expect(results.GPS.tow).toBe(345600)
    expect(results.GPS.year).toBe(2026)
    expect(results.GPS.month).toBe(1)
    expect(results.GPS.day).toBe(1)
    expect(results.GPS.hour).toBe(0)
    expect(results.GPS.minute).toBe(0)
    expect(results.GPS.second).toBe(0)

    // BDS：GPS时间戳 - 18秒 + 4秒 = GPS时间戳 - 14秒
    expect(results.BDS.week).toBe(1043)
    expect(results.BDS.tow).toBe(345586)
    expect(results.BDS.year).toBe(2025)
    expect(results.BDS.month).toBe(12)
    expect(results.BDS.day).toBe(31)
    expect(results.BDS.hour).toBe(23)
    expect(results.BDS.minute).toBe(59)
    expect(results.BDS.second).toBe(46)

    // UTC：GPS时间戳 - 18秒
    expect(results.UTC.year).toBe(2025)
    expect(results.UTC.month).toBe(12)
    expect(results.UTC.day).toBe(31)
    expect(results.UTC.hour).toBe(23)
    expect(results.UTC.minute).toBe(59)
    expect(results.UTC.second).toBe(42)

    // TAI：GPS时间戳 - 18秒 + 37秒 = GPS时间戳 + 19秒
    expect(results.TAI.year).toBe(2026)
    expect(results.TAI.month).toBe(1)
    expect(results.TAI.day).toBe(1)
    expect(results.TAI.hour).toBe(0)
    expect(results.TAI.minute).toBe(0)
    expect(results.TAI.second).toBe(19)
  })

  it('GPS 2026-04-24 00:00:00 -> 各系统', () => {
    const gpsTs = Date.UTC(2026, 3, 24, 0, 0, 0)
    const results = convertSystemTimestampToAllSystems('GPS', gpsTs)

    expect(results.GPS.week).toBe(2415)
    expect(results.GPS.tow).toBe(432000)

    // BDS = GPS - 14秒
    expect(results.BDS.week).toBe(1059)
    expect(results.BDS.tow).toBe(431986)

    // UTC = GPS - 18秒
    expect(results.UTC.year).toBe(2026)
    expect(results.UTC.month).toBe(4)
    expect(results.UTC.day).toBe(23)
    expect(results.UTC.hour).toBe(23)
    expect(results.UTC.minute).toBe(59)
    expect(results.UTC.second).toBe(42)
  })

  it('GPS W2399 TOW=345600 -> 各系统', () => {
    // GPS周秒 W2399 TOW=345600 = GPS时间戳 2026-01-01 00:00:00
    const gpsEpoch = new Date('1980-01-06T00:00:00Z').getTime()
    const gpsTs = gpsEpoch + 2399 * 604800 * 1000 + 345600 * 1000
    const results = convertSystemTimestampToAllSystems('GPS', gpsTs)

    expect(results.GPS.year).toBe(2026)
    expect(results.GPS.month).toBe(1)
    expect(results.GPS.day).toBe(1)
    expect(results.GPS.hour).toBe(0)
    expect(results.GPS.minute).toBe(0)
    expect(results.GPS.second).toBe(0)

    expect(results.BDS.year).toBe(2025)
    expect(results.BDS.month).toBe(12)
    expect(results.BDS.day).toBe(31)
    expect(results.BDS.hour).toBe(23)
    expect(results.BDS.minute).toBe(59)
    expect(results.BDS.second).toBe(46)
  })

  it('闰秒差验证', () => {
    expect(getSystemTimeDifference('GPS', 'UTC')).toBe(18)
    expect(getSystemTimeDifference('BDS', 'UTC')).toBe(4)
    expect(getSystemTimeDifference('TAI', 'UTC')).toBe(37)
    expect(getSystemTimeDifference('GPS', 'BDS')).toBe(14)
    expect(getSystemTimeDifference('TAI', 'GPS')).toBe(19)
  })
})

// =============================================================================
// 历史日期闰秒表测试（系统与UTC的偏差按日期动态确定）
// =============================================================================
describe('历史日期闰秒修正', () => {
  it('GPS历元 1980-01-06 00:00:00 -> UTC 同一时刻（当时偏差为0）', () => {
    const gpsTs = Date.UTC(1980, 0, 6, 0, 0, 0)
    const results = convertSystemTimestampToAllSystems('GPS', gpsTs)

    expect(results.GPS.week).toBe(0)
    expect(results.GPS.tow).toBe(0)
    expect(results.UTC.year).toBe(1980)
    expect(results.UTC.month).toBe(1)
    expect(results.UTC.day).toBe(6)
    expect(results.UTC.hour).toBe(0)
    expect(results.UTC.minute).toBe(0)
    expect(results.UTC.second).toBe(0)
    // TAI 当时比 UTC 快 19 秒
    expect(results.TAI.second).toBe(19)
  })

  it('GPS 2015-01-01 00:00:00 -> UTC 2014-12-31 23:59:44（当时 GPS-UTC=16）', () => {
    const gpsTs = Date.UTC(2015, 0, 1, 0, 0, 0)
    const results = convertSystemTimestampToAllSystems('GPS', gpsTs)

    expect(results.UTC.year).toBe(2014)
    expect(results.UTC.month).toBe(12)
    expect(results.UTC.day).toBe(31)
    expect(results.UTC.hour).toBe(23)
    expect(results.UTC.minute).toBe(59)
    expect(results.UTC.second).toBe(44)
  })

  it('GPS 2017-01-01 00:00:00 -> UTC 2016-12-31 23:59:43（闰秒生效瞬间前偏差仍为17）', () => {
    const gpsTs = Date.UTC(2017, 0, 1, 0, 0, 0)
    const results = convertSystemTimestampToAllSystems('GPS', gpsTs)

    expect(results.UTC.year).toBe(2016)
    expect(results.UTC.month).toBe(12)
    expect(results.UTC.day).toBe(31)
    expect(results.UTC.hour).toBe(23)
    expect(results.UTC.minute).toBe(59)
    expect(results.UTC.second).toBe(43)
  })

  it('BDS 2007-06-15 12:00:00 -> UTC 同一时刻（当时 BDT-UTC=0）', () => {
    const bdsTs = Date.UTC(2007, 5, 15, 12, 0, 0)
    const results = convertSystemTimestampToAllSystems('BDS', bdsTs)

    expect(results.UTC.year).toBe(2007)
    expect(results.UTC.month).toBe(6)
    expect(results.UTC.day).toBe(15)
    expect(results.UTC.hour).toBe(12)
    expect(results.UTC.minute).toBe(0)
    expect(results.UTC.second).toBe(0)
    // TAI 当时比 UTC 快 33 秒
    expect(results.TAI.hour).toBe(12)
    expect(results.TAI.minute).toBe(0)
    expect(results.TAI.second).toBe(33)
  })

  it('GPS 2010-06-01 -> BDS 恒为 -14 秒（两系统都锚定 TAI）', () => {
    const gpsTs = Date.UTC(2010, 5, 1, 0, 0, 0)
    const results = convertSystemTimestampToAllSystems('GPS', gpsTs)

    expect(results.BDS.year).toBe(2010)
    expect(results.BDS.month).toBe(5)
    expect(results.BDS.day).toBe(31)
    expect(results.BDS.hour).toBe(23)
    expect(results.BDS.minute).toBe(59)
    expect(results.BDS.second).toBe(46)
    // UTC 当时比 GPS 慢 15 秒
    expect(results.UTC.second).toBe(45)
  })

  it('UTC 2000-01-01 00:00:00 -> GPS 00:00:13（当时 GPS-UTC=13）', () => {
    const utcTs = Date.UTC(2000, 0, 1, 0, 0, 0)
    const results = convertSystemTimestampToAllSystems('UTC', utcTs)

    expect(results.GPS.year).toBe(2000)
    expect(results.GPS.month).toBe(1)
    expect(results.GPS.day).toBe(1)
    expect(results.GPS.hour).toBe(0)
    expect(results.GPS.minute).toBe(0)
    expect(results.GPS.second).toBe(13)
    expect(results.TAI.second).toBe(32)
  })

  it('历史时刻的系统间时间差', () => {
    expect(getSystemTimeDifference('GPS', 'UTC', Date.UTC(2010, 0, 1))).toBe(15)
    expect(getSystemTimeDifference('BDS', 'UTC', Date.UTC(2007, 0, 1))).toBe(0)
    expect(getSystemTimeDifference('TAI', 'UTC', Date.UTC(1990, 0, 1))).toBe(25)
    // GPS 与 BDS 的差恒定 14 秒，与日期无关
    expect(getSystemTimeDifference('GPS', 'BDS', Date.UTC(2010, 0, 1))).toBe(14)
    expect(getSystemTimeDifference('GPS', 'BDS', Date.UTC(2026, 0, 1))).toBe(14)
  })
})

// =============================================================================
// 边界值测试
// =============================================================================
describe('边界值测试', () => {
  it('周内秒边界: 0', () => {
    const result = weekTowToAllFormats('GPS', 2300, 0)
    expect(result.tow).toBe(0)
    expect(result.hour).toBe(0)
    expect(result.minute).toBe(0)
    expect(result.second).toBe(0)
    expect(result.sod).toBe(0)
  })

  it('周内秒边界: 604799', () => {
    const result = weekTowToAllFormats('GPS', 2300, 604799)
    expect(result.tow).toBe(604799)
    expect(result.hour).toBe(23)
    expect(result.minute).toBe(59)
    expect(result.second).toBe(59)
    expect(result.sod).toBe(86399)
  })

  it('闰年 DOY 边界: 366', () => {
    const result = doyToAllFormats('GPS', 2024, 366, 0)
    expect(result.month).toBe(12)
    expect(result.day).toBe(31)
    expect(result.doy).toBe(366)
  })

  it('平年 DOY 边界: 365', () => {
    const result = doyToAllFormats('GPS', 2023, 365, 0)
    expect(result.month).toBe(12)
    expect(result.day).toBe(31)
    expect(result.doy).toBe(365)
  })

  it('日内秒边界: 86399', () => {
    const result = weekTowToAllFormats('GPS', 2300, 604799)
    expect(result.sod).toBe(86399)
  })
})

// =============================================================================
// 格式化函数测试
// =============================================================================
describe('格式化函数', () => {
  it('formatWeekTow', () => {
    expect(formatWeekTow(2300, 43200)).toBe('第 2300 周 + 043200 秒')
    expect(formatWeekTow(0, 0)).toBe('第 0 周 + 000000 秒')
  })

  it('formatDateTime', () => {
    expect(formatDateTime(2024, 1, 21, 12, 30, 45)).toBe('2024-01-21 12:30:45')
    expect(formatDateTime(2024, 12, 31, 0, 0, 0)).toBe('2024-12-31 00:00:00')
  })

  it('formatDoy', () => {
    expect(formatDoy(2024, 21, 43200)).toBe('2024年 第 021 日 12:00:00')
    expect(formatDoy(2024, 1, 0)).toBe('2024年 第 001 日 00:00:00')
  })

  it('getSystemDifferenceText', () => {
    expect(getSystemDifferenceText('GPS', 'UTC')).toBe('GPS 比 UTC 快 18 秒')
    expect(getSystemDifferenceText('UTC', 'GPS')).toBe('UTC 比 GPS 慢 18 秒')
    expect(getSystemDifferenceText('UTC', 'UTC')).toBe('两系统时间一致')
  })
})

// =============================================================================
// DOY ↔ Date 往返一致性测试
// =============================================================================
describe('DOY ↔ Date 往返一致性', () => {
  it('全年随机日期往返正确', () => {
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= 28; day++) {
        const doy = dateToDoy(2024, month, day)
        const back = doyToDate(2024, doy)
        expect(back.month).toBe(month)
        expect(back.day).toBe(day)
      }
    }
  })

  it('timestamp ↔ DOY 往返一致性', () => {
    const testCases = [
      { year: 2024, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
      { year: 2024, month: 12, day: 31, hour: 23, minute: 59, second: 59 },
      { year: 2023, month: 6, day: 15, hour: 12, minute: 30, second: 45 },
      { year: 2000, month: 2, day: 29, hour: 0, minute: 0, second: 0 },
    ]

    for (const tc of testCases) {
      const ts = Date.UTC(tc.year, tc.month - 1, tc.day, tc.hour, tc.minute, tc.second)
      const doyTime = timestampToDoyTime(ts)
      const backTs = doyToTimestamp(doyTime.year, doyTime.doy, doyTime.sod)
      expect(backTs).toBe(ts)
    }
  })
})

// =============================================================================
// 全格式转换一致性测试
// =============================================================================
describe('全格式转换一致性', () => {
  const systems: TimeSystem[] = ['GPS', 'BDS', 'TAI', 'UTC']

  for (const sys of systems) {
    it(`${sys}: weekTow -> all -> 各格式自洽`, () => {
      const result = weekTowToAllFormats(sys, 2300, 3600)

      const fromDateTime = dateTimeToAllFormats(
        sys,
        result.year,
        result.month,
        result.day,
        result.hour,
        result.minute,
        result.second
      )
      expect(fromDateTime.week).toBe(result.week)
      expect(fromDateTime.tow).toBe(result.tow)

      const fromDoy = doyToAllFormats(sys, result.year, result.doy, result.sod)
      expect(fromDoy.week).toBe(result.week)
      expect(fromDoy.tow).toBe(result.tow)
    })
  }
})
