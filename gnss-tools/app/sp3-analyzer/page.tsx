"use client"

import type React from "react"

import { useState, useRef } from "react"
import Link from "next/link"
import { Home, FileUp, AlertCircle, Download, FileCheck, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { parseSP3File, calculateRMS, compareSP3Files, calculateDiffRMS } from "@/lib/sp3-utils"
import { SP3Chart } from "@/components/sp3-chart"

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

// Update the SP3Data interface to match the one in sp3-utils.ts
interface SP3Data {
  header: {
    version: string
    startEpoch: string
    endEpoch: string
    numberOfEpochs: number
    coordinateSystem: string
    gpsWeek: string
    agency: string
    satellites: string[]
    rawFirstLine: string
    satelliteCount: string // Changed from number to string
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

export default function SP3AnalyzerPage() {
  // 测试文件状态
  const [testFile, setTestFile] = useState<File | null>(null)
  const [testSP3Data, setTestSP3Data] = useState<SP3Data | null>(null)

  // 参考文件状态
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [referenceSP3Data, setReferenceSP3Data] = useState<SP3Data | null>(null)

  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  // 结果状态
  const [rmsData, setRmsData] = useState<RMSData[]>([])
  const [diffData, setDiffData] = useState<DiffData[]>([])
  const [diffRmsData, setDiffRmsData] = useState<RMSData[]>([])

  // 文件输入引用
  const testFileInputRef = useRef<HTMLInputElement>(null)
  const referenceFileInputRef = useRef<HTMLInputElement>(null)

  // 处理测试文件选择
  const handleTestFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // 检查文件扩展名
      if (!selectedFile.name.toLowerCase().endsWith(".sp3") && !selectedFile.name.toLowerCase().endsWith(".sp3.gz")) {
        setError("请上传有效的SP3文件 (.sp3 或 .sp3.gz)")
        setTestFile(null)
        return
      }

      setTestFile(selectedFile)
      setError(null)
    }
  }

  // 处理参考文件选择
  const handleReferenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // 检查文件扩展名
      if (!selectedFile.name.toLowerCase().endsWith(".sp3") && !selectedFile.name.toLowerCase().endsWith(".sp3.gz")) {
        setError("请上传有效的SP3文件 (.sp3 或 .sp3.gz)")
        setReferenceFile(null)
        return
      }

      setReferenceFile(selectedFile)
      setError(null)
    }
  }

  // 处理文件
  const processFiles = async () => {
    if (!testFile) {
      setError("请上传测试SP3文件")
      return
    }

    try {
      setIsProcessing(true)
      setProgress(10)
      setError(null)

      // 读取测试文件内容
      const testContent = await readFileAsText(testFile)
      setProgress(30)

      // 解析测试SP3文件
      const parsedTestData = parseSP3File(testContent)
      console.log("Test SP3 Header:", parsedTestData.header) // Debug log
      setTestSP3Data(parsedTestData)
      debugSP3Data(parsedTestData, "Test SP3 Data")
      setProgress(50)

      // 如果有参考文件，则进行比较
      if (referenceFile) {
        // 读取参考文件内容
        const referenceContent = await readFileAsText(referenceFile)
        setProgress(60)

        // 解析参考SP3文件
        const parsedReferenceData = parseSP3File(referenceContent)
        console.log("Reference SP3 Header:", parsedReferenceData.header) // Debug log
        setReferenceSP3Data(parsedReferenceData)
        debugSP3Data(parsedReferenceData, "Reference SP3 Data")
        setProgress(70)

        // 比较两个文件并计算差异
        const diff = compareSP3Files(parsedTestData, parsedReferenceData)
        setDiffData(diff)
        setProgress(80)

        // 计算差异的RMS
        const diffRms = calculateDiffRMS(diff)
        setDiffRmsData(diffRms)
        setProgress(90)
      } else {
        // 如果没有参考文件，只计算测试文件的RMS
        const rms = calculateRMS(parsedTestData)
        setRmsData(rms)
        setProgress(90)
      }

      setProgress(100)
      setActiveTab("overview")
    } catch (err) {
      console.error("处理SP3文件时出错:", err)
      setError(`处理文件时出错: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result
        if (typeof content === "string") {
          resolve(content)
        } else {
          reject(new Error("无法读取文件内容"))
        }
      }
      reader.onerror = () => reject(new Error("读取文件时出错"))
      reader.readAsText(file)
    })
  }

  const handleTestDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleTestDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      if (!droppedFile.name.toLowerCase().endsWith(".sp3") && !droppedFile.name.toLowerCase().endsWith(".sp3.gz")) {
        setError("请上传有效的SP3文件 (.sp3 或 .sp3.gz)")
        return
      }
      setTestFile(droppedFile)
      setError(null)
    }
  }

  const handleReferenceDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleReferenceDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      if (!droppedFile.name.toLowerCase().endsWith(".sp3") && !droppedFile.name.toLowerCase().endsWith(".sp3.gz")) {
        setError("请上传有效的SP3文件 (.sp3 或 .sp3.gz)")
        return
      }
      setReferenceFile(droppedFile)
      setError(null)
    }
  }

  const triggerTestFileInput = () => {
    testFileInputRef.current?.click()
  }

  const triggerReferenceFileInput = () => {
    referenceFileInputRef.current?.click()
  }

  const downloadRMSData = () => {
    if (referenceFile && diffRmsData.length > 0) {
      // 下载差分RMS数据
      let csvContent = "Satellite,System,RMS 3D (m),RMS X (m),RMS Y (m),RMS Z (m),RMS Clock (ns)\n"

      diffRmsData.forEach((sat) => {
        csvContent += `${sat.satellite},${sat.system},${sat.rms3D.toFixed(6)},${sat.rmsX.toFixed(6)},${sat.rmsY.toFixed(6)},${sat.rmsZ.toFixed(6)},${sat.rmsClock.toFixed(6)}\n`
      })

      // 创建Blob并下载
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `sp3_diff_rms_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else if (rmsData.length > 0) {
      // 下载单文件RMS数据
      let csvContent = "Satellite,System,RMS 3D (m),RMS X (m),RMS Y (m),RMS Z (m),RMS Clock (ns)\n"

      rmsData.forEach((sat) => {
        csvContent += `${sat.satellite},${sat.system},${sat.rms3D.toFixed(6)},${sat.rmsX.toFixed(6)},${sat.rmsY.toFixed(6)},${sat.rmsZ.toFixed(6)},${sat.rmsClock.toFixed(6)}\n`
      })

      // 创建Blob并下载
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `sp3_rms_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // 按系统对卫星进行分组
  const groupSatellitesBySystem = (data: RMSData[]) => {
    const systems = [...new Set(data.map((item) => item.system))]
    return systems.map((system) => ({
      system,
      satellites: data.filter((item) => item.system === system),
    }))
  }

  // 从第一行提取分析中心
  const extractAgency = (firstLine: string): string => {
    if (firstLine && firstLine.length >= 4) {
      return firstLine.slice(-4)
    }
    return ""
  }

  // Add this debug function
  const debugSP3Data = (data: SP3Data | null, label: string) => {
    if (data) {
      console.log(`${label} - DEBUGGING INFO:`)
      console.log(`  Satellite Count:`, data.header.satelliteCount)
      console.log(`  Start Epoch:`, data.header.startEpoch)
      console.log(`  End Epoch:`, data.header.endEpoch)
      console.log(`  GPS Week:`, data.header.gpsWeek)
      console.log(`  Number of Epochs:`, data.epochs.length)
      console.log(`  Number of Satellites:`, data.header.satellites.length)
      console.log(`  Raw First Line:`, data.header.rawFirstLine)
    } else {
      console.log(`${label} - No data available`)
    }
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm mb-8">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="mr-2 h-4 w-4" />
                首页
              </Button>
            </Link>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              SP3 文件比较分析器
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>SP3 精密星历比较分析</CardTitle>
              <CardDescription>上传两个SP3文件，分析坐标差异并生成RMS精度图</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* 测试文件上传区域 */}
                <div>
                  <h3 className="text-lg font-medium mb-3">测试文件</h3>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center"
                    onDragOver={handleTestDragOver}
                    onDrop={handleTestDrop}
                  >
                    <input
                      type="file"
                      ref={testFileInputRef}
                      onChange={handleTestFileChange}
                      className="hidden"
                      accept=".sp3,.sp3.gz"
                    />
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                        <FileCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-base font-medium mb-1">上传测试SP3文件</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">支持 .sp3 和 .sp3.gz 格式</p>
                        <Button onClick={triggerTestFileInput} size="sm">
                          <FileUp className="mr-2 h-4 w-4" />
                          选择文件
                        </Button>
                      </div>
                    </div>
                  </div>
                  {testFile && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{testFile.name}</Badge>
                        <span className="text-xs text-gray-500">{(testFile.size / 1024).toFixed(2)} KB</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 参考文件上传区域 */}
                <div>
                  <h3 className="text-lg font-medium mb-3">参考文件 (可选)</h3>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center"
                    onDragOver={handleReferenceDragOver}
                    onDrop={handleReferenceDrop}
                  >
                    <input
                      type="file"
                      ref={referenceFileInputRef}
                      onChange={handleReferenceFileChange}
                      className="hidden"
                      accept=".sp3,.sp3.gz"
                    />
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-full">
                        <FileSpreadsheet className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-base font-medium mb-1">上传参考SP3文件</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">用于与测试文件进行比较</p>
                        <Button onClick={triggerReferenceFileInput} size="sm">
                          <FileUp className="mr-2 h-4 w-4" />
                          选择文件
                        </Button>
                      </div>
                    </div>
                  </div>
                  {referenceFile && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{referenceFile.name}</Badge>
                        <span className="text-xs text-gray-500">{(referenceFile.size / 1024).toFixed(2)} KB</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {testFile && <Badge variant="secondary">测试文件已选择</Badge>}
                    {referenceFile && <Badge variant="secondary">参考文件已选择</Badge>}
                  </div>
                  <Button onClick={processFiles} disabled={isProcessing || !testFile}>
                    {isProcessing ? "处理中..." : referenceFile ? "比较文件" : "分析文件"}
                  </Button>
                </div>
                {isProcessing && <Progress value={progress} className="h-2" />}
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>错误</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {(testSP3Data || referenceSP3Data) && (
                <div>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-3 mb-6">
                      <TabsTrigger value="overview">文件概览</TabsTrigger>
                      <TabsTrigger value="rms">RMS精度分析</TabsTrigger>
                      <TabsTrigger value="charts">精度图表</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                      <Card>
                        <CardHeader>
                          <CardTitle>SP3文件信息</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {testSP3Data && (
                            <div className="mb-6">
                              <h3 className="text-lg font-medium mb-3">测试文件信息</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="font-medium">版本:</span>
                                    <span>1.1</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">开始历元:</span>
                                    <span>{testSP3Data.header.startEpoch || "未指定"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">结束历元:</span>
                                    <span>{testSP3Data.header.endEpoch || "未指定"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">历元数:</span>
                                    <span>{testSP3Data.epochs.length || "未指定"}</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="font-medium">GPS周:</span>
                                    <span>{testSP3Data.header.gpsWeek || "未指定"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">分析中心:</span>
                                    <span>{extractAgency(testSP3Data.header.rawFirstLine) || "未指定"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">卫星数:</span>
                                    <span>{testSP3Data.header.satelliteCount || "未指定"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {referenceSP3Data && (
                            <div>
                              <h3 className="text-lg font-medium mb-3">参考文件信息</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="font-medium">版本:</span>
                                    <span>1.1</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">开始历元:</span>
                                    <span>{referenceSP3Data.header.startEpoch || "未指定"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">结束历元:</span>
                                    <span>{referenceSP3Data.header.endEpoch || "未指定"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">历元数:</span>
                                    <span>{referenceSP3Data.epochs.length || "未指定"}</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="font-medium">GPS周:</span>
                                    <span>{referenceSP3Data.header.gpsWeek || "未指定"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">分析中心:</span>
                                    <span>{extractAgency(referenceSP3Data.header.rawFirstLine) || "未指定"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">卫星数:</span>
                                    <span>{referenceSP3Data.header.satelliteCount || "未指定"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {diffData.length > 0 && (
                            <div className="mt-6">
                              <h3 className="text-lg font-medium mb-3">比较结果概览</h3>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="font-medium">共同历元数:</span>
                                  <span>{[...new Set(diffData.map((d) => d.epoch))].length}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-medium">共同卫星数:</span>
                                  <span>{[...new Set(diffData.map((d) => d.satellite))].length}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-medium">总比较点数:</span>
                                  <span>{diffData.length}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="rms">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle>RMS精度分析</CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadRMSData}
                            disabled={!diffRmsData.length && !rmsData.length}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            导出CSV
                          </Button>
                        </CardHeader>
                        <CardContent>
                          {diffRmsData.length > 0 ? (
                            <div className="overflow-x-auto">
                              <h3 className="text-lg font-medium mb-3">坐标差异RMS分析</h3>
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2 px-2">卫星</th>
                                    <th className="text-left py-2 px-2">系统</th>
                                    <th className="text-right py-2 px-2">3D RMS (m)</th>
                                    <th className="text-right py-2 px-2">X RMS (m)</th>
                                    <th className="text-right py-2 px-2">Y RMS (m)</th>
                                    <th className="text-right py-2 px-2">Z RMS (m)</th>
                                    <th className="text-right py-2 px-2">钟差 RMS (ns)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {diffRmsData.map((sat, index) => (
                                    <tr key={index} className="border-b">
                                      <td className="py-2 px-2">{sat.satellite}</td>
                                      <td className="py-2 px-2">{sat.system}</td>
                                      <td className="text-right py-2 px-2">{sat.rms3D.toFixed(6)}</td>
                                      <td className="text-right py-2 px-2">{sat.rmsX.toFixed(6)}</td>
                                      <td className="text-right py-2 px-2">{sat.rmsY.toFixed(6)}</td>
                                      <td className="text-right py-2 px-2">{sat.rmsZ.toFixed(6)}</td>
                                      <td className="text-right py-2 px-2">{sat.rmsClock.toFixed(6)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : rmsData.length > 0 ? (
                            <div className="overflow-x-auto">
                              <h3 className="text-lg font-medium mb-3">单文件RMS分析</h3>
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2 px-2">卫星</th>
                                    <th className="text-left py-2 px-2">系统</th>
                                    <th className="text-right py-2 px-2">3D RMS (m)</th>
                                    <th className="text-right py-2 px-2">X RMS (m)</th>
                                    <th className="text-right py-2 px-2">Y RMS (m)</th>
                                    <th className="text-right py-2 px-2">Z RMS (m)</th>
                                    <th className="text-right py-2 px-2">钟差 RMS (ns)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rmsData.map((sat, index) => (
                                    <tr key={index} className="border-b">
                                      <td className="py-2 px-2">{sat.satellite}</td>
                                      <td className="py-2 px-2">{sat.system}</td>
                                      <td className="text-right py-2 px-2">{sat.rms3D.toFixed(6)}</td>
                                      <td className="text-right py-2 px-2">{sat.rmsX.toFixed(6)}</td>
                                      <td className="text-right py-2 px-2">{sat.rmsY.toFixed(6)}</td>
                                      <td className="text-right py-2 px-2">{sat.rmsZ.toFixed(6)}</td>
                                      <td className="text-right py-2 px-2">{sat.rmsClock.toFixed(6)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">无RMS数据可用</div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="charts">
                      <Card>
                        <CardHeader>
                          <CardTitle>精度图表</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {diffRmsData.length > 0 ? (
                            <div className="space-y-12">
                              {/* 按系统分组显示差异RMS图表 */}
                              {groupSatellitesBySystem(diffRmsData).map((group, groupIndex) => (
                                <div key={groupIndex} className="space-y-8 pt-4">
                                  <h3 className="text-xl font-semibold text-center">{group.system} 系统卫星差异</h3>

                                  <div>
                                    <h4 className="text-lg font-medium mb-4">3D RMS精度 (米)</h4>
                                    <div className="h-80">
                                      <SP3Chart
                                        data={group.satellites}
                                        dataKey="rms3D"
                                        yAxisLabel="RMS (m)"
                                        barColor="#3b82f6"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-lg font-medium mb-4">XYZ坐标分量RMS (米)</h4>
                                    <div className="h-80">
                                      <SP3Chart
                                        data={group.satellites}
                                        dataKey={["rmsX", "rmsY", "rmsZ"]}
                                        yAxisLabel="RMS (m)"
                                        barColor={["#ef4444", "#22c55e", "#f59e0b"]}
                                        showLegend={true}
                                        legendLabels={["X", "Y", "Z"]}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-lg font-medium mb-4">钟差RMS (纳秒)</h4>
                                    <div className="h-80">
                                      <SP3Chart
                                        data={group.satellites}
                                        dataKey="rmsClock"
                                        yAxisLabel="RMS (ns)"
                                        barColor="#8b5cf6"
                                      />
                                    </div>
                                  </div>

                                  {groupIndex < groupSatellitesBySystem(diffRmsData).length - 1 && (
                                    <Separator className="my-8" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : rmsData.length > 0 ? (
                            <div className="space-y-12">
                              {/* 按系统分组显示单文件RMS图表 */}
                              {groupSatellitesBySystem(rmsData).map((group, groupIndex) => (
                                <div key={groupIndex} className="space-y-8 pt-4">
                                  <h3 className="text-xl font-semibold text-center">{group.system} 系统卫星</h3>

                                  <div>
                                    <h4 className="text-lg font-medium mb-4">3D RMS精度 (米)</h4>
                                    <div className="h-80">
                                      <SP3Chart
                                        data={group.satellites}
                                        dataKey="rms3D"
                                        yAxisLabel="RMS (m)"
                                        barColor="#3b82f6"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-lg font-medium mb-4">XYZ坐标分量RMS (米)</h4>
                                    <div className="h-80">
                                      <SP3Chart
                                        data={group.satellites}
                                        dataKey={["rmsX", "rmsY", "rmsZ"]}
                                        yAxisLabel="RMS (m)"
                                        barColor={["#ef4444", "#22c55e", "#f59e0b"]}
                                        showLegend={true}
                                        legendLabels={["X", "Y", "Z"]}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-lg font-medium mb-4">钟差RMS (纳秒)</h4>
                                    <div className="h-80">
                                      <SP3Chart
                                        data={group.satellites}
                                        dataKey="rmsClock"
                                        yAxisLabel="RMS (ns)"
                                        barColor="#8b5cf6"
                                      />
                                    </div>
                                  </div>

                                  {groupIndex < groupSatellitesBySystem(rmsData).length - 1 && (
                                    <Separator className="my-8" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">无图表数据可用</div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>关于SP3文件比较</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                SP3文件是一种标准格式，用于表示GNSS卫星的精密轨道和钟差信息。通过比较两个SP3文件，可以评估不同分析中心产品的精度差异，或者评估预报轨道与最终轨道的差异。
              </p>
              <p>本工具支持两种模式：</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>单文件分析：仅上传测试文件，计算文件内部的RMS精度</li>
                <li>双文件比较：同时上传测试文件和参考文件，计算两个文件之间相同历元相同卫星的坐标差异RMS</li>
              </ul>
              <p>
                比较分析时，工具会自动寻找两个文件中相同历元的相同卫星，计算坐标差值（测试值减去参考值），然后计算差值的RMS。这对于评估轨道和钟差产品的精度非常有用。
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
