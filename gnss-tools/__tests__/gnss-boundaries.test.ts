import { describe, expect, it } from 'vitest'
import {
  convertSystemTimestampToAllSystems,
  dateTimeToAllFormats,
  doyToAllFormats,
  getSystemDifferenceText,
  systemTimestampToPhysical,
  weekTowToAllFormats,
  type SystemConversionOptions,
} from '@/lib/gnss-utils'

const utcLeap2016: SystemConversionOptions = {
  utcLeapSecond: { year: 2016, month: 12, day: 31, hour: 23, minute: 59 },
}

describe('UTC 闰秒秒点', () => {
  it('GPS 00:00:17 对应真实 UTC 23:59:60，而不是次日 00:00:00', () => {
    const result = convertSystemTimestampToAllSystems('GPS', Date.UTC(2017, 0, 1, 0, 0, 17))
    expect(result.UTC).toMatchObject({
      year: 2016,
      month: 12,
      day: 31,
      hour: 23,
      minute: 59,
      second: 60,
      sod: 86400,
      isLeapSecond: true,
    })
    expect(result.TAI).toMatchObject({ year: 2017, month: 1, day: 1, second: 36 })
  })

  it('GPS 00:00:18 对应 UTC 次日 00:00:00，与闰秒秒点不再重复', () => {
    const result = convertSystemTimestampToAllSystems('GPS', Date.UTC(2017, 0, 1, 0, 0, 18))
    expect(result.UTC).toMatchObject({ year: 2017, month: 1, day: 1, hour: 0, minute: 0, second: 0 })
    expect(result.UTC.isLeapSecond).toBeUndefined()
  })

  it('UTC 23:59:60 可以转回 GPS 00:00:17', () => {
    const result = convertSystemTimestampToAllSystems(
      'UTC',
      Date.UTC(2016, 11, 31, 23, 59, 60),
      utcLeap2016,
    )
    expect(result.GPS).toMatchObject({ year: 2017, month: 1, day: 1, hour: 0, minute: 0, second: 17 })
    expect(result.UTC.second).toBe(60)
  })

  it('单系统 UTC 日历与年积日均支持真实闰秒标签', () => {
    const calendar = dateTimeToAllFormats('UTC', 2016, 12, 31, 23, 59, 60)
    const doy = doyToAllFormats('UTC', 2016, 366, 86400)
    expect(calendar).toMatchObject({ second: 60, sod: 86400, isLeapSecond: true })
    expect(doy).toMatchObject({ second: 60, sod: 86400, isLeapSecond: true })
  })

  it('旧 Date API 遇到无法表达的闰秒会明确报错', () => {
    expect(() => systemTimestampToPhysical('GPS', Date.UTC(2017, 0, 1, 0, 0, 17))).toThrow(/23:59:60/)
  })

  it('拒绝伪造的闰秒日期', () => {
    expect(() => dateTimeToAllFormats('UTC', 2024, 1, 1, 23, 59, 60)).toThrow(/真实 UTC 闰日/)
    expect(() => dateTimeToAllFormats('GPS', 2016, 12, 31, 23, 59, 60)).toThrow(/真实 UTC 闰日/)
  })
})

describe('历元与输入边界', () => {
  it('目标系统尚未启用时给出明确标记', () => {
    const result = convertSystemTimestampToAllSystems('GPS', Date.UTC(1980, 0, 6))
    expect(result.BDS.isBeforeEpoch).toBe(true)
  })

  it('拒绝负周数和小数周秒', () => {
    expect(() => weekTowToAllFormats('GPS', -1, 0)).toThrow(/周数/)
    expect(() => weekTowToAllFormats('GPS', 2300, 1.5)).toThrow(/整数/)
  })

  it('拒绝非四位年份和历元前日期', () => {
    expect(() => dateTimeToAllFormats('GPS', 99, 1, 1, 0, 0, 0)).toThrow(/四位年份/)
    expect(() => dateTimeToAllFormats('BDS', 2005, 12, 31, 0, 0, 0)).toThrow(/历元/)
  })

  it('历史差异文案使用输入时刻而非当前时刻', () => {
    expect(getSystemDifferenceText('GPS', 'UTC', Date.UTC(2015, 0, 1))).toBe('GPS 比 UTC 快 16 秒')
    expect(getSystemDifferenceText('UTC', 'GPS', Date.UTC(2015, 0, 1))).toBe('UTC 比 GPS 慢 16 秒')
  })
})

describe('普通时刻批量往返', () => {
  it('全年逐日 GPS → UTC → GPS 保持一致（跳过闰秒秒点）', () => {
    const start = Date.UTC(2024, 0, 1)
    for (let day = 0; day < 366; day++) {
      const gpsMs = start + day * 86400000 + 43200000
      const forward = convertSystemTimestampToAllSystems('GPS', gpsMs)
      const utc = forward.UTC
      const utcMs = Date.UTC(utc.year, utc.month - 1, utc.day, utc.hour, utc.minute, utc.second)
      const back = convertSystemTimestampToAllSystems('UTC', utcMs)
      expect(back.GPS).toMatchObject({ week: forward.GPS.week, tow: forward.GPS.tow })
    }
  })
})
