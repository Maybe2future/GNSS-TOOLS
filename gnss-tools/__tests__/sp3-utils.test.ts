import { describe, it, expect } from 'vitest'
import { parseSP3File, compareSP3Files, calculateDiffRMS } from '@/lib/sp3-utils'

// 构造P记录行（坐标单位km，钟差单位μs，数值字段宽14字符）
const pLine = (id: string, x: number, y: number, z: number, clock: number) =>
  `P${id}${x.toFixed(6).padStart(14)}${y.toFixed(6).padStart(14)}${z.toFixed(6).padStart(14)}${clock.toFixed(6).padStart(14)}`

// =============================================================================
// 头部解析测试
// =============================================================================
describe('SP3头部解析', () => {
  // 20颗卫星，需要两行 + 行才能放下（每行最多17颗）
  const headerContent = [
    '#cP2024  1  1  0  0  0.00000000    96 ORBIT   ITRF HLM  IGS',
    '## 2294 518400.00000000   900   24  59609',
    '+   20   G01G02G03G04G05G06G07G08G09G10G11G12G13G14G15G16G17  0',
    '+        G18G19G20  0',
    '++        10 15 20 25 30 35 40 45 50 55 60 65 70 75 80 85 90  0',
    '* 2024  1  1  0  0  0.00000000',
    pLine('G01', 11000, 22000, 33000, 123.456),
  ].join('\n')

  it('解析版本字符', () => {
    const data = parseSP3File(headerContent)
    expect(data.header.version).toBe('c')
  })

  it('支持SP3-d版本行', () => {
    const data = parseSP3File(headerContent.replace('#cP2024', '#dP2024'))
    expect(data.header.version).toBe('d')
  })

  it('开始历元年份为4位（bug #2 回归）', () => {
    const data = parseSP3File(headerContent)
    expect(data.header.startEpoch).toBe('2024-01-01 00:00:00.00000000')
  })

  it('从所有 + 行解析卫星列表（bug #1 回归）', () => {
    const data = parseSP3File(headerContent)
    expect(data.header.satellites).toHaveLength(20)
    expect(data.header.satellites[0]).toBe('G01')
    expect(data.header.satellites[16]).toBe('G17')
    expect(data.header.satellites[17]).toBe('G18')
    expect(data.header.satellites[19]).toBe('G20')
  })

  it('从第1行解析历元数和坐标系', () => {
    const data = parseSP3File(headerContent)
    expect(data.header.numberOfEpochs).toBe(96)
    expect(data.header.coordinateSystem).toBe('ITRF')
  })

  it('兼容真实 IGS 文件首行（d+D / IGS14 布局）', () => {
    const igsContent = headerContent.replace(
      '#cP2024  1  1  0  0  0.00000000    96 ORBIT   ITRF HLM  IGS',
      '#cP2024  1  1  0  0  0.00000000    96 d+D IGS14 FIT  IAC',
    )
    const data = parseSP3File(igsContent)
    expect(data.header.numberOfEpochs).toBe(96)
    expect(data.header.coordinateSystem).toBe('IGS14')
  })

  it('解析GPS周', () => {
    const data = parseSP3File(headerContent)
    expect(data.header.gpsWeek).toBe('2294')
  })
})

// =============================================================================
// 高频历元回归测试
// =============================================================================
describe('高频历元', () => {
  it('保留毫秒差异，不把 0.001 秒和 0.002 秒合并', () => {
    const content = [
      '#dP2024  1  1  0  0  0.00100000     2 ORBIT   ITRF HLM  IGS',
      '## 2294 518400.00100000   0.00100000 60310 0.0010000000000',
      '+    1   G01  0',
      '++         5  0',
      '* 2024  1  1  0  0  0.00100000',
      pLine('G01', 11000, 22000, 33000, 123.456),
      '* 2024  1  1  0  0  0.00200000',
      pLine('G01', 11001, 22001, 33001, 123.457),
    ].join('\n')

    const data = parseSP3File(content)
    expect(data.header.startEpoch).toBe('2024-01-01 00:00:00.00100000')
    expect(data.epochs).toEqual([
      '2024-01-01 00:00:00.00100000',
      '2024-01-01 00:00:00.00200000',
    ])
    expect(data.records.map((record) => record.epoch)).toEqual(data.epochs)
  })
})

// =============================================================================
// 坏值标记过滤测试
// =============================================================================
describe('坏值标记过滤', () => {
  const sentinelContent = [
    '#cP2024  1  1  0  0  0.00000000     2 ORBIT   ITRF HLM  IGS',
    '## 2294 518400.00000000   900   24  59609',
    '+    3   G01G02G03  0',
    '++         5  6  7  0',
    '* 2024  1  1  0  0  0.00000000',
    pLine('G01', 11000, 22000, 33000, 123.456),
    pLine('G02', 11000, 22000, 33000, 999999.999999),
    pLine('G03', 0, 0, 0, 123.456),
  ].join('\n')

  it('钟差为999999.999999的记录被跳过', () => {
    const data = parseSP3File(sentinelContent)
    expect(data.records.some((r) => r.id === 'G02')).toBe(false)
  })

  it('坐标全为0.000000的记录被跳过', () => {
    const data = parseSP3File(sentinelContent)
    expect(data.records.some((r) => r.id === 'G03')).toBe(false)
  })

  it('正常记录保留且单位换算正确', () => {
    const data = parseSP3File(sentinelContent)
    expect(data.records).toHaveLength(1)
    // 坐标 km -> m，钟差 μs -> ns
    expect(data.records[0].x).toBeCloseTo(11000000, 6)
    expect(data.records[0].clock).toBeCloseTo(123456, 6)
  })
})

// =============================================================================
// 双文件比较与差异RMS测试
// =============================================================================
describe('双文件比较与差异RMS', () => {
  // 2个历元 × 1颗卫星的小文件
  const makeTinyFile = (x: number, y: number, z: number, clock: number) =>
    [
      '#cP2024  1  1  0  0  0.00000000     2 ORBIT   ITRF HLM  IGS',
      '## 2294 518400.00000000   900   24  59609',
      '+    1   G01  0',
      '++         5  0',
      '* 2024  1  1  0  0  0.00000000',
      pLine('G01', x, y, z, clock),
      '* 2024  1  1  0 15  0.00000000',
      pLine('G01', x, y, z, clock),
    ].join('\n')

  const testData = parseSP3File(makeTinyFile(11000, 22000, 33000, 500.0))
  const refData = parseSP3File(makeTinyFile(10999.997, 21999.996, 32999.988, 499.995))

  it('compareSP3Files 计算每个共同历元的差异', () => {
    const diff = compareSP3Files(testData, refData)
    expect(diff).toHaveLength(2)
    // 测试值 - 参考值，坐标单位m，钟差单位ns
    expect(diff[0].dx).toBeCloseTo(3, 6)
    expect(diff[0].dy).toBeCloseTo(4, 6)
    expect(diff[0].dz).toBeCloseTo(12, 6)
    expect(diff[0].dclock).toBeCloseTo(5, 6)
  })

  it('calculateDiffRMS 对常量差异给出正确的RMS', () => {
    const diff = compareSP3Files(testData, refData)
    const rms = calculateDiffRMS(diff)
    expect(rms).toHaveLength(1)
    expect(rms[0].satellite).toBe('G01')
    expect(rms[0].system).toBe('GPS')
    expect(rms[0].rmsX).toBeCloseTo(3, 6)
    expect(rms[0].rmsY).toBeCloseTo(4, 6)
    expect(rms[0].rmsZ).toBeCloseTo(12, 6)
    // 3-4-12 直角关系，3D RMS = 13
    expect(rms[0].rms3D).toBeCloseTo(13, 6)
    expect(rms[0].rmsClock).toBeCloseTo(5, 6)
  })
})
