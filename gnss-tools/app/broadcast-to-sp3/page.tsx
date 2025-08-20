"use client"

import type React from "react"

import { useState, useRef } from "react"
import Link from "next/link"
import { Home, FileUp, AlertCircle, Download, FileText, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseRINEXNav, convertBroadcastToSP3, generateSP3Content } from "@/lib/broadcast-utils"

export default function BroadcastToSP3Page() {
  // 文件状态
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null)
  const [sp3Content, setSP3Content] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("converted.sp3")

  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // 转换设置
  const [interval, setInterval] = useState<number>(900) // 默认15分钟间隔

  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // 检查文件扩展名，支持更多格式
      const fileName = selectedFile.name.toLowerCase()
      if (
        !fileName.endsWith(".n") &&
        !fileName.endsWith(".nav") &&
        !fileName.endsWith(".rnx") &&
        !fileName.endsWith("p") &&
        !fileName.endsWith(".23p") &&
        !/\.\d+p$/.test(fileName) // 支持 .数字p 格式
      ) {
        setError("请上传有效的RINEX导航文件 (.n, .nav, .rnx, .p, .数字p)")
        setBroadcastFile(null)
        return
      }

      setBroadcastFile(selectedFile)
      // 设置默认输出文件名
      const baseName = selectedFile.name.split(".")[0]
      setFileName(`${baseName}.sp3`)
      setError(null)
      setSP3Content(null)
    }
  }

  // 处理文件
  const processFile = async () => {
    if (!broadcastFile) {
      setError("请上传广播星历文件")
      return
    }

    try {
      setIsProcessing(true)
      setProgress(10)
      setError(null)

      // 读取文件内容
      const fileContent = await readFileAsText(broadcastFile)
      setProgress(30)

      // 解析广播星历文件
      const broadcastData = parseRINEXNav(fileContent)
      setProgress(50)

      // 检查是否成功解析
      if (broadcastData.ephemerides.length === 0) {
        throw new Error("未能从文件中解析出有效的广播星历数据")
      }

      // 转换为SP3格式，传递用户设置的间隔值
      const sp3Data = convertBroadcastToSP3(broadcastData, interval)
      setProgress(80)

      // 生成SP3文件内容
      const content = generateSP3Content(sp3Data)
      setSP3Content(content)
      setProgress(100)
    } catch (err) {
      console.error("处理广播星历文件时出错:", err)
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // 同样修改拖放处理函数
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const fileName = droppedFile.name.toLowerCase()
      if (
        !fileName.endsWith(".n") &&
        !fileName.endsWith(".nav") &&
        !fileName.endsWith(".rnx") &&
        !fileName.endsWith("p") &&
        !fileName.endsWith(".23p") &&
        !/\.\d+p$/.test(fileName) // 支持 .数字p 格式
      ) {
        setError("请上传有效的RINEX导航文件 (.n, .nav, .rnx, .p, .数字p)")
        return
      }
      setBroadcastFile(droppedFile)
      const baseName = droppedFile.name.split(".")[0]
      setFileName(`${baseName}.sp3`)
      setError(null)
      setSP3Content(null)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const downloadSP3 = () => {
    if (!sp3Content) return

    // 创建Blob并下载
    const blob = new Blob([sp3Content], { type: "text/plain;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400">
              广播星历转SP3
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>广播星历转SP3工具</CardTitle>
              <CardDescription>上传RINEX格式的广播星历文件，转换为SP3精密星历格式</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* 文件上传区域 */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium mb-3">上传广播星历文件</h3>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".n,.nav,.rnx,.p,.23p,.*p"
                    />
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full">
                        <FileText className="h-8 w-8 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h4 className="text-base font-medium mb-1">上传RINEX导航文件</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          支持 .n, .nav, .rnx, .p, .数字p 格式
                        </p>
                        <Button onClick={triggerFileInput} size="sm">
                          <FileUp className="mr-2 h-4 w-4" />
                          选择文件
                        </Button>
                      </div>
                    </div>
                  </div>
                  {broadcastFile && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{broadcastFile.name}</Badge>
                        <span className="text-xs text-gray-500">{(broadcastFile.size / 1024).toFixed(2)} KB</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 转换设置 */}
                <div>
                  <h3 className="text-lg font-medium mb-3">转换设置</h3>
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="interval">历元间隔 (秒)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="interval"
                          type="number"
                          min="60"
                          max="3600"
                          step="60"
                          value={interval}
                          onChange={(e) => setInterval(Number(e.target.value))}
                          className="bg-white dark:bg-gray-950"
                        />
                        <Settings className="h-4 w-4 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500">推荐值: 900秒 (15分钟)</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="filename">输出文件名</Label>
                      <Input
                        id="filename"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {broadcastFile && <Badge variant="secondary">文件已选择</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={processFile} disabled={isProcessing || !broadcastFile}>
                      {isProcessing ? "处理中..." : "转换文件"}
                    </Button>
                    <Button variant="outline" onClick={downloadSP3} disabled={!sp3Content}>
                      <Download className="mr-2 h-4 w-4" />
                      下载SP3
                    </Button>
                  </div>
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

              {sp3Content && (
                <div>
                  <h3 className="text-lg font-medium mb-3">转换结果预览</h3>
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto max-h-60">{sp3Content.slice(0, 1000)}...</pre>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">注: 仅显示前1000个字符。点击"下载SP3"按钮获取完整文件。</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>关于广播星历转SP3</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                广播星历(Broadcast Ephemeris)是卫星导航系统广播的卫星轨道和钟差参数，通常以RINEX格式存储。 SP3是一种标准格式，用于表示GNSS卫星的精密轨道和钟差信息。
              </p>
              <p>
                本工具可以将RINEX格式的广播星历文件转换为SP3格式，方便在需要精密星历格式的软件中使用广播星历数据。
                转换过程使用开普勒轨道模型，根据广播星历参数计算卫星在指定时间点的位置和钟差。
              </p>
              <p>转换后的SP3文件包含以下信息:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>卫星位置坐标 (X, Y, Z)，单位为米</li>
                <li>卫星钟差，单位为纳秒</li>
                <li>按指定时间间隔采样的历元</li>
              </ul>
              <p>请注意，广播星历的精度通常低于精密星历，转换后的SP3文件精度取决于原始广播星历的精度。</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
