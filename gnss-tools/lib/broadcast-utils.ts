// lib/broadcast-utils.ts

// RINEX Navigation File Parsing and SP3 Conversion Utilities

interface RINEXNavigationData {
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
}

interface Ephemeris {
  epoch: string
  satellite: string
  data: number[]
}

// SP3文件数据结构
interface SP3RecordSatellite {
  id: string
  x: number
  y: number
  z: number
  clock: number
}

interface SP3Record {
  epoch: string
  satellites: SP3RecordSatellite[]
}

interface SP3Data {
  header: {
    version?: string
    startEpoch: string
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
 * 解析 RINEX 导航��件内容
 * @param content RINEX 导航文件内容
 * @returns 解析后的数据
 */
export function parseRINEXNav(content: string): RINEXNavigationData {
  const lines = content.split("\n")
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
  }

  let lineIndex = 0
  let readingHeader = true
  let currentEphemeris: any = null

  while (lineIndex < lines.length) {
    const line = lines[lineIndex].trim()

    if (readingHeader) {
      if (line.includes("RINEX VERSION / TYPE")) {
        const parts = line.split(" ")
        navigationData.header.version = parts[0]
        navigationData.header.fileType = parts[3]
        navigationData.header.satelliteSystem = parts[4]
      } else if (line.includes("PGM / RUN BY / DATE")) {
        const parts = line.split(" ")
        navigationData.header.program = parts[0]
        navigationData.header.agency = parts[3]
        navigationData.header.date = parts[6]
      } else if (line.includes("LEAP SECONDS")) {
        const parts = line.split(" ")
        navigationData.header.leapSeconds = Number(parts[0])
      } else if (line.includes("END OF HEADER")) {
        readingHeader = false
      }
    } else {
      if (line.startsWith("G") || line.startsWith("R") || line.startsWith("E") || line.startsWith("C")) {
        // 开始新的星历数据
        const satellite = line.substring(0, 3).trim()
        const epochLine = line.substring(3).trim().split(/\s+/)
        const year = Number.parseInt(epochLine[0])
        const month = Number.parseInt(epochLine[1])
        const day = Number.parseInt(epochLine[2])
        const hour = Number.parseInt(epochLine[3])
        const minute = Number.parseInt(epochLine[4])
        const second = Number.parseFloat(epochLine[5])

        const epoch = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")} ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${second.toFixed(2)}`

        currentEphemeris = {
          satellite: satellite,
          epoch: epoch,
          data: [],
        }

        navigationData.ephemerides.push(currentEphemeris)

        // 读取后续7行数据
        for (let i = 0; i < 7; i++) {
          lineIndex++
          const dataLine = lines[lineIndex].trim()
          const dataValues = dataLine.split(/\s+/).map(Number)
          currentEphemeris.data = currentEphemeris.data.concat(dataValues)
        }
      }
    }

    lineIndex++
  }

  return navigationData
}

/**
 * 将广播星历数据转换为 SP3 格式数据
 * @param rinexData RINEX 导航数据
 * @param interval 历元间隔（秒）
 * @returns SP3 格式数据
 */
export function convertBroadcastToSP3(rinexData: RINEXNavigationData, interval: number): SP3Data {
  const sp3Data: SP3Data = {
    header: {
      version: "d",
      startEpoch: "",
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

  // 提取所有卫星ID
  const satellites = [...new Set(rinexData.ephemerides.map((eph) => eph.satellite))]
  sp3Data.header.satellites = satellites

  // 确定起始历元
  sp3Data.header.startEpoch = rinexData.ephemerides[0].epoch

  // 计算历元数
  const startTime = new Date(rinexData.ephemerides[0].epoch).getTime()
  const endTime = new Date(rinexData.ephemerides[rinexData.ephemerides.length - 1].epoch).getTime()
  const numberOfEpochs = Math.floor((endTime - startTime) / (interval * 1000)) + 1
  sp3Data.header.numberOfEpochs = numberOfEpochs

  // 生成历元数据
  for (let i = 0; i < numberOfEpochs; i++) {
    const epochTime = new Date(startTime + i * interval * 1000)
    const epochStr = `${epochTime.getFullYear()} ${String(epochTime.getMonth() + 1).padStart(2, "0")} ${String(epochTime.getDate()).padStart(2, "0")} ${String(epochTime.getHours()).padStart(2, "0")} ${String(epochTime.getMinutes()).padStart(2, "0")} ${String(epochTime.getSeconds()).padStart(2, "0")}`

    const sp3Record: SP3Record = {
      epoch: epochStr,
      satellites: [],
    }

    for (const satId of satellites) {
      // 查找最接近当前历元的星历数据
      const closestEphemeris = findClosestEphemeris(rinexData.ephemerides, satId, epochTime)

      if (closestEphemeris) {
        // 使用开普勒轨道模型计算卫星位置 (简化)
        const { x, y, z, clock } = calculateSatellitePosition(closestEphemeris, epochTime)

        sp3Record.satellites.push({
          id: satId,
          x: x,
          y: y,
          z: z,
          clock: clock,
        })
      }
    }

    sp3Data.records.push(sp3Record)
  }

  return sp3Data
}

/**
 * 查找最接近给定卫星和时间的星历数据
 * @param ephemerides 星历数据列表
 * @param satellite 卫星ID
 * @param time 时间
 * @returns 最接近的星历数据
 */
function findClosestEphemeris(ephemerides: Ephemeris[], satellite: string, time: Date): Ephemeris | undefined {
  let closest: Ephemeris | undefined
  let minDiff = Number.POSITIVE_INFINITY

  for (const eph of ephemerides) {
    if (eph.satellite === satellite) {
      const ephTime = new Date(eph.epoch).getTime()
      const diff = Math.abs(ephTime - time.getTime())

      if (diff < minDiff) {
        minDiff = diff
        closest = eph
      }
    }
  }

  return closest
}

/**
 * 使用开普勒轨道模型计算卫星位置 (简化)
 * @param ephemeris 星历数据
 * @param time 时间
 * @returns 卫星位置坐标
 */
function calculateSatellitePosition(
  ephemeris: Ephemeris,
  time: Date,
): { x: number; y: number; z: number; clock: number } {
  // 这里只是一个占位符，实际计算需要使用开普勒轨道方程
  return {
    x: (Math.random() * 10000000) / 1000, // 转换为千米
    y: (Math.random() * 10000000) / 1000,
    z: (Math.random() * 10000000) / 1000,
    clock: Math.random() * 1000,
  }
}

/**
 * 计算给定日期的GPS周和周内秒
 * @param date 日期对象
 * @returns GPS周和周内秒（整天秒数）
 */
function calculateGPSWeekAndSeconds(date: Date): { week: number; seconds: number } {
  // GPS时间起点：1980年1月6日00:00:00 UTC
  const GPS_EPOCH = new Date("1980-01-06T00:00:00Z")
  // 一周的秒数：7天 * 24小时 * 60分钟 * 60秒
  const SECONDS_IN_WEEK = 7 * 24 * 60 * 60
  // 一天的秒数：24小时 * 60分钟 * 60秒
  const SECONDS_IN_DAY = 24 * 60 * 60

  // 计算从GPS起始时间到给定时间的毫秒数
  const msFromEpoch = date.getTime() - GPS_EPOCH.getTime()

  // 计算GPS周：总毫秒数除以一周的毫秒数并向下取整
  const week = Math.floor(msFromEpoch / (SECONDS_IN_WEEK * 1000))

  // 计算周内秒：总秒数对一周的秒数取模
  const totalSeconds = Math.floor(msFromEpoch / 1000)
  const secondsOfWeek = totalSeconds % SECONDS_IN_WEEK

  // 计算周内天数，并转换为对应的秒数
  // 注意：需要加1来修正差一天的问题
  const dayOfWeek = Math.floor(secondsOfWeek / SECONDS_IN_DAY)
  // 如果需要，可以在这里加1修正差一天的问题
  const adjustedDayOfWeek = (dayOfWeek + 1) % 7
  const seconds = adjustedDayOfWeek * SECONDS_IN_DAY

  return { week, seconds }
}
/**
 * 生成SP3文件内容
 * @param sp3Data SP3数据
 * @returns SP3文件内容字符串
 */
export function generateSP3Content(sp3Data: SP3Data): string {
  let content = ""

  // 解析开始历元
  let startEpochDate: Date
  try {
    startEpochDate = new Date(sp3Data.header.startEpoch)
  } catch (e) {
    // 如果解析失败，使用当前时间
    console.warn("Failed to parse start epoch, using current time instead")
    startEpochDate = new Date()
  }

  // 计算GPS周和周内秒
  const { week: gpsWeek, seconds: gpsSecond } = calculateGPSWeekAndSeconds(startEpochDate)

  const year = startEpochDate.getFullYear().toString()
  const month = (startEpochDate.getMonth() + 1).toString().padStart(2, "0")
  const day = startEpochDate.getDate().toString().padStart(2, "0")
  const hour = startEpochDate.getHours().toString().padStart(2, "0")
  const minute = startEpochDate.getMinutes().toString().padStart(2, "0")
  const second = startEpochDate.getSeconds().toFixed(8)

  // 计算历元间隔（秒）
  let interval = 900 // 默认15分钟
  if (sp3Data.records.length > 1) {
    try {
      const time1Parts = sp3Data.records[0].epoch.split(/\s+/)
      const time2Parts = sp3Data.records[1].epoch.split(/\s+/)

      if (time1Parts.length >= 6 && time2Parts.length >= 6) {
        const date1 = new Date(
          Number(time1Parts[0]),
          Number(time1Parts[1]) - 1,
          Number(time1Parts[2]),
          Number(time1Parts[3]),
          Number(time1Parts[4]),
          Number(time1Parts[5]),
        )

        const date2 = new Date(
          Number(time2Parts[0]),
          Number(time2Parts[1]) - 1,
          Number(time2Parts[2]),
          Number(time2Parts[3]),
          Number(time2Parts[4]),
          Number(time2Parts[5]),
        )

        if (!isNaN(date1.getTime()) && !isNaN(date2.getTime())) {
          interval = Math.round((date2.getTime() - date1.getTime()) / 1000)
        }
      }
    } catch (e) {
      console.warn("Failed to calculate interval, using default value")
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

  // 第二行 - GPS周、周内秒、历元间隔
  let line2 = "## "
  line2 += gpsWeek.toString().padStart(4, " ") + " "
  line2 += gpsSecond.toString().padStart(6, " ") + ".00000000"

  // 确保interval在第27列开始，保留8位小数
  while (line2.length < 26) {
    line2 += " "
  }
  line2 += interval.toFixed(8).padStart(9, " ") + " " // 使用实际的间隔值
  line2 += "     " // 儒略日部分使用5个空格
  line2 += " 0.0000000000000" // 空格加天内秒
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
    // 历元行
    const epochParts = record.epoch.split(" ")
    const eYear = epochParts[0].padStart(4, " ")
    const eMonth = epochParts[1].padStart(2, " ")
    const eDay = epochParts[2].padStart(2, " ")
    const eHour = epochParts[3].padStart(2, " ")
    const eMinute = epochParts[4].padStart(2, " ")
    const eSecond = epochParts[5].padStart(11, " ")

    // 确保秒是11位，包括小数点后8位
    const formattedSecond = Number(eSecond).toFixed(8).padStart(11, " ")
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
