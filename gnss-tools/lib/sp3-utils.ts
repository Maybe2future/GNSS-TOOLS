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
    console.log("预解析第三行卫星数:", sp3Data.header.satelliteCount)
  }

  while (lineIndex < lines.length) {
    const line = lines[lineIndex]

    if (line.length === 0) {
      lineIndex++
      continue
    }

    // 处理头部
    if (isHeader) {
      if (line.startsWith("#")) {
        // 版本行
        if (line.startsWith("#c")) {
          sp3Data.header.version = line.substring(2, 5).trim()
          console.log("Processing #c line:", line)

          // 提取开始历元
          const startEpochParts = line.substring(5).trim().split(/\s+/)
          console.log("Start epoch parts:", startEpochParts)

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
                second = Number.parseFloat(startEpochParts[5]).toFixed(2).padStart(5, "0")
              } catch (e) {
                console.error("Error parsing seconds:", e)
              }

              sp3Data.header.startEpoch = `${year}-${month}-${day} ${hour}:${minute}:${second}`
              console.log("Formatted start epoch:", sp3Data.header.startEpoch)
              // Log the formatted start epoch for debugging
              console.log("IMPORTANT - Formatted start epoch:", sp3Data.header.startEpoch)
            } catch (e) {
              console.error("Error formatting start epoch:", e)
            }
          } else {
            console.warn("Not enough parts to parse start epoch")
          }
        }

        // 历元数和坐标系
        if (line.startsWith("#h")) {
          const parts = line.substring(2).trim().split(/\s+/)
          if (parts.length >= 2) {
            sp3Data.header.numberOfEpochs = Number.parseInt(parts[0], 10)
            sp3Data.header.coordinateSystem = parts[1]
          }
        }

        // GPS周、周内秒
        if (line.startsWith("##")) {
          const parts = line.substring(2).trim().split(/\s+/)

          // 提取GPS周
          if (parts.length >= 1) {
            sp3Data.header.gpsWeek = parts[0].trim()
          }

          // 提取分析中心（如果有）
          if (parts.length >= 6) {
            sp3Data.header.agency = parts[5].trim()
          }
        }

        // 卫星列表
        if (line.startsWith("+")) {
          // 确保已提取卫星数量
          if (!sp3Data.header.satelliteCount) {
            // Extract satellite count from characters 3-6 (positions 2-5 in 0-indexed string)
            sp3Data.header.satelliteCount = line.substring(2, 6).trim()
            console.log("Extracted satellite count from line:", line)
            console.log("Extracted satellite count value:", sp3Data.header.satelliteCount)
            // Log the extracted satellite count for debugging
            console.log("IMPORTANT - Extracted satellite count:", sp3Data.header.satelliteCount)
          }

          // Try to parse the satellite count as a number
          let numSats = 0
          try {
            numSats = Number.parseInt(sp3Data.header.satelliteCount, 10)
            console.log("Parsed satellite count as number:", numSats)
          } catch (e) {
            console.error("Failed to parse satellite count:", e)
            // Keep the string value even if parsing fails
          }

          // If parsing succeeded, use the number, otherwise default to 17
          const satsInLine = numSats > 0 ? Math.min(17, numSats) : 17

          // Extract satellite IDs
          for (let i = 0; i < satsInLine; i++) {
            const satId = line.substring(9 + i * 3, 12 + i * 3).trim()
            if (satId) {
              sp3Data.header.satellites.push(satId)
            }
          }
        }

        // 继续读取更多卫星（如果有）
        if (line.startsWith("++") && sp3Data.header.satellites.length < sp3Data.header.numberOfEpochs) {
          const remainingSats = sp3Data.header.numberOfEpochs - sp3Data.header.satellites.length
          const satsInLine = Math.min(17, remainingSats)

          for (let i = 0; i < satsInLine; i++) {
            const satId = line.substring(9 + i * 3, 12 + i * 3).trim()
            if (satId) {
              sp3Data.header.satellites.push(satId)
            }
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
              second = Number.parseFloat(epochParts[5]).toFixed(2).padStart(5, "0")
            } catch (e) {
              console.error("Error parsing seconds in first epoch:", e)
            }
            
            currentEpoch = `${year}-${month}-${day} ${hour}:${minute}:${second}`
            sp3Data.epochs.push(currentEpoch)
            
            // 如果还没有设置开始历元，则设置它
            if (!sp3Data.header.startEpoch) {
              sp3Data.header.startEpoch = currentEpoch
              console.log("Setting start epoch from first epoch line:", sp3Data.header.startEpoch)
            }
          } catch (e) {
            console.error("Error formatting first epoch:", e)
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
              second = Number.parseFloat(epochParts[5]).toFixed(2).padStart(5, "0")
            } catch (e) {
              console.error("Error parsing seconds in data section:", e)
            }
            
            currentEpoch = `${year}-${month}-${day} ${hour}:${minute}:${second}`
            sp3Data.epochs.push(currentEpoch)

            // 如果是第一个历元，而且之前没有设置开始历元，则设置它
            if (sp3Data.epochs.length === 1 && !sp3Data.header.startEpoch) {
              sp3Data.header.startEpoch = currentEpoch
              console.log("Setting start epoch from first data epoch:", sp3Data.header.startEpoch)
            }

            // 更新结束历元
            sp3Data.header.endEpoch = currentEpoch
          } catch (e) {
            console.error("Error formatting epoch in data section:", e)
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

          // SP3文件中坐标单位是km，转换为m
          const x = Number.parseFloat(line.substring(4, 18).trim()) * 1000
          const y = Number.parseFloat(line.substring(18, 32).trim()) * 1000
          const z = Number.parseFloat(line.substring(32, 46).trim()) * 1000
          // 钟差单位是微秒(μs)，转换为纳秒(ns)
          const clock = Number.parseFloat(line.substring(46, 60).trim()) * 1000

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

  // Debug log key values before returning
  console.log("Final SP3 Data - Satellite Count:", sp3Data.header.satelliteCount)
  console.log("Final SP3 Data - Start Epoch:", sp3Data.header.startEpoch)
  console.log("Final SP3 Data - Satellites Array Length:", sp3Data.header.satellites.length)

  // Final debug log for critical values
  console.log("FINAL VALUES - File parsing complete")
  console.log("FINAL VALUES - Satellite Count:", sp3Data.header.satelliteCount)
  console.log("FINAL VALUES - Start Epoch:", sp3Data.header.startEpoch)

  // 确保startEpoch始终有值
  if (!sp3Data.header.startEpoch && sp3Data.epochs.length > 0) {
    // 如果未能从头部解析开始历元，但有数据历元，则使用第一个数据历元作为开始历元
    sp3Data.header.startEpoch = sp3Data.epochs[0];
    console.log("Using first data epoch as start epoch:", sp3Data.header.startEpoch);
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
