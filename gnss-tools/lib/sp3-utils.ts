// SP3文件解析和处理工具

// 定义SP3数据结构
interface SP3Satellite {
  id: string
  system: string
  prn: string
  epoch: string
  x: number
  y: number
  z: number
  clock: number
}

// Update the SP3Data interface to make satelliteCount a string
interface SP3Data {
  header: {
    version: string
    startEpoch: string
    endEpoch: string
    numberOfEpochs: number
    coordinateSystem: string
    gpsWeek: string // 改为GPS周
    agency: string
    satellites: string[]
    rawFirstLine: string // 添加原始第一行
    satelliteCount: string // Changed from number to string
    // 保存第三行内容
    rawThirdLine: string
  }
  epochs: string[]
  records: SP3Satellite[]
}

interface RMSData {
  satellite: string
  system: string
  rms3D: number
  rmsX: number
  rmsY: number
  rmsZ: number
  rmsClock: number
}

interface DiffData {
  satellite: string
  system: string
  epoch: string
  dx: number
  dy: number
  dz: number
  dclock: number
}

/** SP3 历元秒采用定点格式，保留亚毫秒历元以避免记录键碰撞。 */
function formatSp3Seconds(value: string): string {
  const seconds = Number.parseFloat(value)
  return (Number.isFinite(seconds) ? seconds : 0).toFixed(8).padStart(11, "0")
}

// 解析SP3文件
export function parseSP3File(content: string): SP3Data {
  const lines = content.split("\n")

  // 初始化数据结构
  const sp3Data: SP3Data = {
    header: {
      version: "",
      startEpoch: "",
      endEpoch: "",
      numberOfEpochs: 0,
      coordinateSystem: "",
      gpsWeek: "", // 改为GPS周
      agency: "",
      satellites: [],
      rawFirstLine: lines[0] || "",
      satelliteCount: "", // Initialize the new field
      rawThirdLine: lines.length > 2 ? lines[2] : ""
    },
    epochs: [],
    records: [],
  }

  // 解析头部信息
  let lineIndex = 0
  let isHeader = true
  let currentEpoch = ""

  // 卫星系统映射
  const systemMap: { [key: string]: string } = {
    G: "GPS",
    R: "GLONASS",
    E: "Galileo",
    C: "BeiDou",
    J: "QZSS",
    I: "IRNSS",
    S: "SBAS",
  }

  // 提前提取第三行的卫星数量
  if (lines.length > 2 && lines[2].startsWith("+")) {
    // 第三行第3位到第6位是卫星数量
    sp3Data.header.satelliteCount = lines[2].substring(2, 6).trim()
  }

  while (lineIndex < lines.length) {
    const line = lines[lineIndex]

    if (line.length === 0) {
      lineIndex++
      continue
    }

    // 处理头部
    if (isHeader) {
      // GPS周、周内秒
      if (line.startsWith("##")) {
        const parts = line.substring(2).trim().split(/\s+/)

        // 提取GPS周
        if (parts.length >= 1) {
          sp3Data.header.gpsWeek = parts[0].trim()
        }
      } else if (/^#[a-z]/.test(line)) {
        // 版本行（SP3-c/SP3-d 等）
        sp3Data.header.version = line.charAt(1)

        // 提取开始历元
        const startEpochParts = line.substring(3).trim().split(/\s+/)

        if (startEpochParts.length >= 6) {
          try {
            // Ensure proper formatting with leading zeros
            const year = startEpochParts[0].padStart(4, "0")
            const month = startEpochParts[1].padStart(2, "0")
            const day = startEpochParts[2].padStart(2, "0")
            const hour = startEpochParts[3].padStart(2, "0")
            const minute = startEpochParts[4].padStart(2, "0")

            // Handle the second value carefully
            let second = "00.00"
            try {
              second = formatSp3Seconds(startEpochParts[5])
            } catch {
              // 秒解析失败时保留默认值
            }

            sp3Data.header.startEpoch = `${year}-${month}-${day} ${hour}:${minute}:${second}`
          } catch {
            // 开始历元格式化失败时保留为空，后续用首个数据历元兜底
          }
        }

        // 历元数、数据类型、坐标系、轨道类型、机构：对第1行尾部按空白分词解析
        // （不同机构文件的固定列对齐并不一致，分词比固定列截取更健壮）
        const tailParts = line.substring(32).trim().split(/\s+/)
        const parsedEpochs = Number.parseInt(tailParts[0] ?? "", 10)
        if (!Number.isNaN(parsedEpochs)) {
          sp3Data.header.numberOfEpochs = parsedEpochs
        }
        if (tailParts.length >= 3) {
          sp3Data.header.coordinateSystem = tailParts[2]
        }
      } else if (line.startsWith("++")) {
        // ++ 行为卫星精度信息行，不参与解析，直接跳过
      } else if (line.startsWith("+")) {
        // 卫星列表行（最多5行续行，每行最多17颗卫星）
        // 确保已提取卫星数量
        if (!sp3Data.header.satelliteCount) {
          // Extract satellite count from characters 3-6 (positions 2-5 in 0-indexed string)
          sp3Data.header.satelliteCount = line.substring(2, 6).trim()
        }

        // 达到声明的卫星数量后停止解析
        const numSats = Number.parseInt(sp3Data.header.satelliteCount, 10)
        const remainingSats = numSats > 0 ? numSats - sp3Data.header.satellites.length : 17
        const satsInLine = Math.min(17, Math.max(0, remainingSats))

        // 提取卫星编号（第10列起，每颗占3个字符）
        for (let i = 0; i < satsInLine; i++) {
          const satId = line.substring(9 + i * 3, 12 + i * 3).trim()
          if (satId) {
            sp3Data.header.satellites.push(satId)
          }
        }
      } else if (line.startsWith("*")) {
        // 结束头部，开始数据部分
        isHeader = false

        // 提取历元信息
        const epochParts = line.substring(1).trim().split(/\s+/)
        if (epochParts.length >= 6) {
          try {
            // 确保格式一致性
            const year = epochParts[0].padStart(4, "0")
            const month = epochParts[1].padStart(2, "0")
            const day = epochParts[2].padStart(2, "0")
            const hour = epochParts[3].padStart(2, "0")
            const minute = epochParts[4].padStart(2, "0")
            let second = "00.00"
            try {
              second = formatSp3Seconds(epochParts[5])
            } catch {
              // 秒解析失败时保留默认值
            }

            currentEpoch = `${year}-${month}-${day} ${hour}:${minute}:${second}`
            sp3Data.epochs.push(currentEpoch)

            // 如果还没有设置开始历元，则设置它
            if (!sp3Data.header.startEpoch) {
              sp3Data.header.startEpoch = currentEpoch
            }
          } catch {
            // 如果出错，仍然尝试使用原始格式
            currentEpoch = `${epochParts[0]}-${epochParts[1]}-${epochParts[2]} ${epochParts[3]}:${epochParts[4]}:${epochParts[5]}`
            sp3Data.epochs.push(currentEpoch)
          }
        }
      }
    } else {
      // 处理数据部分
      if (line.startsWith("*")) {
        // 新的历元
        const epochParts = line.substring(1).trim().split(/\s+/)
        if (epochParts.length >= 6) {
          try {
            // 确保格式一致性
            const year = epochParts[0].padStart(4, "0")
            const month = epochParts[1].padStart(2, "0")
            const day = epochParts[2].padStart(2, "0")
            const hour = epochParts[3].padStart(2, "0")
            const minute = epochParts[4].padStart(2, "0")
            let second = "00.00"
            try {
              second = formatSp3Seconds(epochParts[5])
            } catch {
              // 秒解析失败时保留默认值
            }

            currentEpoch = `${year}-${month}-${day} ${hour}:${minute}:${second}`
            sp3Data.epochs.push(currentEpoch)

            // 如果是第一个历元，而且之前没有设置开始历元，则设置它
            if (sp3Data.epochs.length === 1 && !sp3Data.header.startEpoch) {
              sp3Data.header.startEpoch = currentEpoch
            }

            // 更新结束历元
            sp3Data.header.endEpoch = currentEpoch
          } catch {
            // 如果出错，仍然尝试使用原始格式
            currentEpoch = `${epochParts[0]}-${epochParts[1]}-${epochParts[2]} ${epochParts[3]}:${epochParts[4]}:${epochParts[5]}`
            sp3Data.epochs.push(currentEpoch)
          }
        }
      } else if (line.startsWith("P")) {
        // 卫星位置和钟差记录
        const satId = line.substring(1, 4).trim()
        if (satId) {
          const system = satId.charAt(0)
          const prn = satId.substring(1)

          // 先按原始单位解析（坐标km，钟差μs），便于识别坏值标记
          const rawX = Number.parseFloat(line.substring(4, 18).trim())
          const rawY = Number.parseFloat(line.substring(18, 32).trim())
          const rawZ = Number.parseFloat(line.substring(32, 46).trim())
          const rawClock = Number.parseFloat(line.substring(46, 60).trim())

          // 跳过坏值记录：钟差为999999.999999μs，或坐标全为0.000000km
          if (Math.abs(rawClock) >= 999999 || (rawX === 0 && rawY === 0 && rawZ === 0)) {
            lineIndex++
            continue
          }

          // SP3文件中坐标单位是km，转换为m
          const x = rawX * 1000
          const y = rawY * 1000
          const z = rawZ * 1000
          // 钟差单位是微秒(μs)，转换为纳秒(ns)
          const clock = rawClock * 1000

          sp3Data.records.push({
            id: satId,
            system: systemMap[system] || system,
            prn: prn,
            epoch: currentEpoch,
            x: x,
            y: y,
            z: z,
            clock: clock,
          })
        }
      }
    }

    lineIndex++
  }

  // 确保startEpoch始终有值
  if (!sp3Data.header.startEpoch && sp3Data.epochs.length > 0) {
    // 如果未能从头部解析开始历元，但有数据历元，则使用第一个数据历元作为开始历元
    sp3Data.header.startEpoch = sp3Data.epochs[0];
  }

  return sp3Data
}

// 比较两个SP3文件并计算差异
export function compareSP3Files(testData: SP3Data, referenceData: SP3Data): DiffData[] {
  const diffResults: DiffData[] = []

  // 创建参考数据的索引，以便快速查找
  const referenceIndex: { [key: string]: SP3Satellite } = {}

  referenceData.records.forEach((record) => {
    const key = `${record.id}_${record.epoch}`
    referenceIndex[key] = record
  })

  // 对每个测试数据记录，查找对应的参考数据记录并计算差异
  testData.records.forEach((testRecord) => {
    const key = `${testRecord.id}_${testRecord.epoch}`

    if (referenceIndex[key]) {
      const refRecord = referenceIndex[key]

      // 计算坐标差异（测试值 - 参考值）
      diffResults.push({
        satellite: testRecord.id,
        system: testRecord.system,
        epoch: testRecord.epoch,
        dx: testRecord.x - refRecord.x,
        dy: testRecord.y - refRecord.y,
        dz: testRecord.z - refRecord.z,
        dclock: testRecord.clock - refRecord.clock,
      })
    }
  })

  return diffResults
}

// 根据差异数据计算RMS
export function calculateDiffRMS(diffData: DiffData[]): RMSData[] {
  // 按卫星ID分组
  const satelliteGroups: { [key: string]: DiffData[] } = {}

  diffData.forEach((record) => {
    if (!satelliteGroups[record.satellite]) {
      satelliteGroups[record.satellite] = []
    }
    satelliteGroups[record.satellite].push(record)
  })

  // 计算每颗卫星的RMS
  const rmsResults: RMSData[] = []

  Object.keys(satelliteGroups).forEach((satId) => {
    const records = satelliteGroups[satId]

    if (records.length < 1) return // 至少需要1个点才能计算RMS

    // 计算平方和
    let sumSqX = 0,
      sumSqY = 0,
      sumSqZ = 0,
      sumSqClock = 0

    records.forEach((record) => {
      sumSqX += Math.pow(record.dx, 2)
      sumSqY += Math.pow(record.dy, 2)
      sumSqZ += Math.pow(record.dz, 2)
      sumSqClock += Math.pow(record.dclock, 2)
    })

    // 计算RMS
    const rmsX = Math.sqrt(sumSqX / records.length)
    const rmsY = Math.sqrt(sumSqY / records.length)
    const rmsZ = Math.sqrt(sumSqZ / records.length)
    const rmsClock = Math.sqrt(sumSqClock / records.length)

    // 计算3D RMS
    const rms3D = Math.sqrt(rmsX * rmsX + rmsY * rmsY + rmsZ * rmsZ)

    rmsResults.push({
      satellite: satId,
      system: records[0].system,
      rms3D: rms3D,
      rmsX: rmsX,
      rmsY: rmsY,
      rmsZ: rmsZ,
      rmsClock: rmsClock,
    })
  })

  // 按系统和PRN排序
  rmsResults.sort((a, b) => {
    if (a.system !== b.system) {
      return a.system.localeCompare(b.system)
    }
    return a.satellite.localeCompare(b.satellite)
  })

  return rmsResults
}

// 计算单个SP3文件的RMS (保留原有功能)
export function calculateRMS(sp3Data: SP3Data): RMSData[] {
  // 按卫星ID分组
  const satelliteGroups: { [key: string]: SP3Satellite[] } = {}

  sp3Data.records.forEach((record) => {
    if (!satelliteGroups[record.id]) {
      satelliteGroups[record.id] = []
    }
    satelliteGroups[record.id].push(record)
  })

  // 计算每颗卫星的RMS
  const rmsResults: RMSData[] = []

  Object.keys(satelliteGroups).forEach((satId) => {
    const records = satelliteGroups[satId]

    if (records.length < 2) return // 至少需要2个点才能计算RMS

    // 计算平均值
    let sumX = 0,
      sumY = 0,
      sumZ = 0,
      sumClock = 0
    records.forEach((record) => {
      sumX += record.x
      sumY += record.y
      sumZ += record.z
      sumClock += record.clock
    })

    const avgX = sumX / records.length
    const avgY = sumY / records.length
    const avgZ = sumZ / records.length
    const avgClock = sumClock / records.length

    // 计算方差和RMS
    let sumSqX = 0,
      sumSqY = 0,
      sumSqZ = 0,
      sumSqClock = 0
    records.forEach((record) => {
      sumSqX += Math.pow(record.x - avgX, 2)
      sumSqY += Math.pow(record.y - avgY, 2)
      sumSqZ += Math.pow(record.z - avgZ, 2)
      sumSqClock += Math.pow(record.clock - avgClock, 2)
    })

    const rmsX = Math.sqrt(sumSqX / records.length)
    const rmsY = Math.sqrt(sumSqY / records.length)
    const rmsZ = Math.sqrt(sumSqZ / records.length)
    const rmsClock = Math.sqrt(sumSqClock / records.length)

    // 计算3D RMS
    const rms3D = Math.sqrt(rmsX * rmsX + rmsY * rmsY + rmsZ * rmsZ)

    rmsResults.push({
      satellite: satId,
      system: records[0].system,
      rms3D: rms3D,
      rmsX: rmsX,
      rmsY: rmsY,
      rmsZ: rmsZ,
      rmsClock: rmsClock,
    })
  })

  // 按系统和PRN排序
  rmsResults.sort((a, b) => {
    if (a.system !== b.system) {
      return a.system.localeCompare(b.system)
    }
    return a.satellite.localeCompare(b.satellite)
  })

  return rmsResults
}
