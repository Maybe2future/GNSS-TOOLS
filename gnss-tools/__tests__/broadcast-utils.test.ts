import { describe, it, expect } from 'vitest'
import {
  parseRINEXNav,
  convertBroadcastToSP3,
  generateSP3Content,
  propagateSatellite,
  calculateGPSWeekAndSeconds,
} from '@/lib/broadcast-utils'

// =============================================================================
// 合成 RINEX 3 混合导航文件
// 包含：G01（含 D 指数与负数无空格拼接字段）、R01（GLONASS，应被跳过）、C01（BDS）
// =============================================================================
const RINEX3_NAV = [
  '     3.04           N: GNSS NAV DATA    M: Mixed            RINEX VERSION / TYPE',
  'test                lom                 20240101 000000 UTC PGM / RUN BY / DATE',
  '    18                                                   LEAP SECONDS',
  '                                                            END OF HEADER',
  // G01 记录（2024-01-01 00:00:00 GPST），af1 与 af0 无空格拼接，OMEGADOT 与 omega 无空格拼接
  'G01 2024 01 01 00 00 00 1.000000000000D-04-9.094947017729D-13 0.000000000000D+00',
  '     1.000000000000D+00 1.000000000000D+02 4.000000000000D-09 5.000000000000D-01',
  '     0.000000000000D+00 1.000000000000D-02 0.000000000000D+00 5.153795000000D+03',
  '     0.000000000000D+00 0.000000000000D+00 1.000000000000D+00 0.000000000000D+00',
  '     9.600000000000D-01 1.500000000000D+02 1.500000000000D+00-8.000000000000D-09',
  '     0.000000000000D+00 1.000000000000D+00 2.295000000000D+03 0.000000000000D+00',
  '     2.000000000000D+00 0.000000000000D+00 1.000000000000D-09 1.000000000000D+02',
  '     0.000000000000D+00 4.000000000000D+00',
  // R01 GLONASS 记录（历元行 + 3 行续行），必须被跳过且不影响后续记录解析
  'R01 2024 01 01 00 15 00-1.000000000000D-04 0.000000000000D+00 0.000000000000D+00',
  '     1.000000000000D+04 2.000000000000D+03 0.000000000000D+00 1.000000000000D+00',
  '     2.000000000000D+04 1.000000000000D+03 0.000000000000D+00 1.000000000000D+00',
  '     1.500000000000D+04 0.000000000000D+00 0.000000000000D+00 0.000000000000D+00',
  // C01 BDS 记录（2024-01-01 00:00:00 BDT）
  'C01 2024 01 01 00 00 00 2.000000000000D-04 0.000000000000D+00 0.000000000000D+00',
  '     1.000000000000D+00 5.000000000000D+01 4.000000000000D-09 1.000000000000D+00',
  '     0.000000000000D+00 2.000000000000D-02 0.000000000000D+00 5.282000000000D+03',
  '     0.000000000000D+00 0.000000000000D+00-1.000000000000D+00 0.000000000000D+00',
  '     9.600000000000D-01 1.000000000000D+02 1.000000000000D+00-8.000000000000D-09',
  '     0.000000000000D+00 0.000000000000D+00 2.295000000000D+03 0.000000000000D+00',
  '     2.000000000000D+00 0.000000000000D+00 1.000000000000D-09 2.000000000000D-09',
  '     0.000000000000D+00 4.000000000000D+00',
].join('\n')

// 轨道半径
function radius(pos: { x: number; y: number; z: number }): number {
  return Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z)
}

// =============================================================================
// 解析测试
// =============================================================================
describe('parseRINEXNav', () => {
  it('正确解析记录数、跳过 GLONASS 并统计', () => {
    const nav = parseRINEXNav(RINEX3_NAV)
    expect(nav.ephemerides).toHaveLength(2)
    expect(nav.ephemerides.map((e) => e.satellite)).toEqual(['G01', 'C01'])
    expect(nav.skippedSatellites).toBe(1)
    expect(nav.droppedRecords).toBe(0)
  })

  it('数据数组无 NaN，且 D 指数与拼接负数解析正确', () => {
    const nav = parseRINEXNav(RINEX3_NAV)
    for (const eph of nav.ephemerides) {
      expect(eph.data.length).toBeGreaterThanOrEqual(27)
      for (const v of eph.data) {
        expect(Number.isFinite(v)).toBe(true)
      }
    }
    const g01 = nav.ephemerides.find((e) => e.satellite === 'G01')!
    // af0 / af1（拼接的负数）/ af2
    expect(g01.data[0]).toBeCloseTo(1e-4, 15)
    expect(g01.data[1]).toBeCloseTo(-9.094947017729e-13, 25)
    expect(g01.data[2]).toBe(0)
    // e / sqrtA / toe / OMEGA0 / omega / OMEGADOT（拼接的负数）/ TGD
    expect(g01.data[8]).toBeCloseTo(0.01, 15)
    expect(g01.data[10]).toBeCloseTo(5153.795, 9)
    expect(g01.data[11]).toBe(0)
    expect(g01.data[13]).toBeCloseTo(1.0, 15)
    expect(g01.data[17]).toBeCloseTo(1.5, 15)
    expect(g01.data[18]).toBeCloseTo(-8e-9, 20)
    expect(g01.data[25]).toBeCloseTo(1e-9, 20)
  })

  it('历元毫秒数正确（Date.UTC 语义）', () => {
    const nav = parseRINEXNav(RINEX3_NAV)
    const g01 = nav.ephemerides.find((e) => e.satellite === 'G01')!
    expect(g01.epochMs).toBe(Date.UTC(2024, 0, 1, 0, 0, 0))
    const c01 = nav.ephemerides.find((e) => e.satellite === 'C01')!
    expect(c01.epochMs).toBe(Date.UTC(2024, 0, 1, 0, 0, 0))
  })
})

// =============================================================================
// 开普勒轨道传播测试
// =============================================================================
describe('propagateSatellite', () => {
  it('在记录自身历元处：G01 半径与钟差在合理范围', () => {
    const nav = parseRINEXNav(RINEX3_NAV)
    const g01 = nav.ephemerides.find((e) => e.satellite === 'G01')!
    const pos = propagateSatellite(g01, g01.epochMs)
    const r = radius(pos)
    expect(r).toBeGreaterThanOrEqual(1.9e7)
    expect(r).toBeLessThanOrEqual(3.0e7)
    expect(Math.abs(pos.clock)).toBeLessThan(1e-2)
  })

  it('在记录自身历元处：C01 半径在合理范围', () => {
    const nav = parseRINEXNav(RINEX3_NAV)
    const c01 = nav.ephemerides.find((e) => e.satellite === 'C01')!
    const pos = propagateSatellite(c01, c01.epochMs)
    const r = radius(pos)
    expect(r).toBeGreaterThanOrEqual(1.9e7)
    expect(r).toBeLessThanOrEqual(4.3e7)
  })

  it('半周回绕：toe ± 400000s 不抛异常且半径保持合理', () => {
    const nav = parseRINEXNav(RINEX3_NAV)
    const g01 = nav.ephemerides.find((e) => e.satellite === 'G01')!
    // G01 的 toe=0，所在周起点 = 记录历元所在 GPS 周的周起点
    const weekStartMs = Date.UTC(1980, 0, 6) + Math.floor((g01.epochMs - Date.UTC(1980, 0, 6)) / 604800000) * 604800000
    const toeMs = weekStartMs + g01.data[11] * 1000
    for (const offsetS of [-400000, 400000]) {
      const pos = propagateSatellite(g01, toeMs + offsetS * 1000)
      const r = radius(pos)
      expect(r).toBeGreaterThanOrEqual(1.9e7)
      expect(r).toBeLessThanOrEqual(3.0e7)
    }
  })
})

// =============================================================================
// SP3 转换与输出测试
// =============================================================================
describe('convertBroadcastToSP3 + generateSP3Content', () => {
  it('卫星列表正确，位置单位为千米且量级合理', () => {
    const nav = parseRINEXNav(RINEX3_NAV)
    const sp3 = convertBroadcastToSP3(nav, 900)
    expect(sp3.header.satellites).toEqual(['G01', 'C01'])
    expect(sp3.records.length).toBeGreaterThanOrEqual(1)
    const rec = sp3.records[0]
    const g01 = rec.satellites.find((s) => s.id === 'G01')!
    const rKm = radius(g01)
    expect(rKm).toBeGreaterThanOrEqual(1.9e4)
    expect(rKm).toBeLessThanOrEqual(3.0e4)
  })

  it('SP3 文本头部与数据行格式正确', () => {
    const nav = parseRINEXNav(RINEX3_NAV)
    const sp3 = convertBroadcastToSP3(nav, 900)
    const content = generateSP3Content(sp3)

    // 起始历元为 2024-01-01 00:00:00 GPST
    expect(content.startsWith('#dP2024')).toBe(true)
    // 卫星位置行
    expect(content).toContain('PG01')
    expect(content).toContain('PC01')
    expect(content.trimEnd().endsWith('EOF')).toBe(true)

    // 第二行：GPS 周与周内秒（独立计算期望值）
    const line2 = content.split('\n')[1]
    const m = line2.match(/^##\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+([\d.]+)/)
    expect(m).not.toBeNull()
    const expectedWeek = Math.floor((Date.UTC(2024, 0, 1) - Date.UTC(1980, 0, 6)) / 604800000)
    expect(Number(m![1])).toBe(expectedWeek)
    const expectedSeconds = new Date(Date.UTC(2024, 0, 1)).getUTCDay() * 86400
    expect(Number(m![2])).toBeCloseTo(expectedSeconds, 6)
    expect(Number(m![3])).toBe(900)
    expect(Number(m![4])).toBe(60310)
    expect(Number(m![5])).toBe(0)
  })

  it('SP3 第二行写入非零天内秒和对应 MJD', () => {
    const nav = parseRINEXNav(RINEX3_NAV)
    const sp3 = convertBroadcastToSP3(nav, 900)
    sp3.header.startEpochMs = Date.UTC(2024, 0, 2, 12, 34, 56, 250)

    const line2 = generateSP3Content(sp3).split('\n')[1]
    const fields = line2.trim().split(/\s+/)
    expect(fields[4]).toBe('60311')
    expect(Number(fields[5])).toBeCloseTo(12 * 3600 + 34 * 60 + 56.25, 8)
  })

  it('历元间隔非法时抛出中文错误', () => {
    const nav = parseRINEXNav(RINEX3_NAV)
    expect(() => convertBroadcastToSP3(nav, 0)).toThrow(/历元间隔/)
    expect(() => convertBroadcastToSP3(nav, -5)).toThrow(/历元间隔/)
    expect(() => convertBroadcastToSP3(nav, Number.NaN)).toThrow(/历元间隔/)
  })

  it('calculateGPSWeekAndSeconds 保留时间部分且无星期偏移', () => {
    // 2024-01-01 12:34:56 GPST
    const t = Date.UTC(2024, 0, 1, 12, 34, 56)
    const { week, seconds } = calculateGPSWeekAndSeconds(t)
    const expectedWeek = Math.floor((t - Date.UTC(1980, 0, 6)) / 604800000)
    expect(week).toBe(expectedWeek)
    // 2024-01-01 为周一（周内第 1 天）
    expect(seconds).toBeCloseTo(86400 + 12 * 3600 + 34 * 60 + 56, 6)
  })
})
