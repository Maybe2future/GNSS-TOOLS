"use client"

import { useState } from "react"
import { Home, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { convertGPSToUTC, convertUTCToGPS, convertBDSToUTC, convertUTCToBDS } from "@/lib/gnss-utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { TimePickerDemo } from "@/components/time-picker"

export default function ConverterPage() {
  // GPS 时间转换状态
  const [gpsWeek, setGpsWeek] = useState("")
  const [gpsTow, setGpsTow] = useState("")
  const [gpsDate, setGpsDate] = useState<Date | undefined>(new Date())
  const [gpsTime, setGpsTime] = useState<string>("00:00:00")
  const [gpsCalendarMonth, setGpsCalendarMonth] = useState<Date>(new Date())

  // 北斗时间转换状态
  const [bdsWeek, setBdsWeek] = useState("")
  const [bdsTow, setBdsTow] = useState("")
  const [bdsDate, setBdsDate] = useState<Date | undefined>(new Date())
  const [bdsTime, setBdsTime] = useState<string>("00:00:00")
  const [bdsCalendarMonth, setBdsCalendarMonth] = useState<Date>(new Date())

  // 在现有的状态变量下添加两个新的状态变量来控制日期选择器的开关状态
  const [gpsDatePickerOpen, setGpsDatePickerOpen] = useState(false)
  const [bdsDatePickerOpen, setBdsDatePickerOpen] = useState(false)

  // GPS 周内秒转换为日期时间
  const handleGPSToDateTime = () => {
    try {
      const week = Number.parseInt(gpsWeek)
      const tow = Number.parseInt(gpsTow)

      if (isNaN(week) || isNaN(tow) || tow < 0 || tow >= 604800) {
        throw new Error("请输入有效的GPS周和周内秒")
      }

      const date = convertGPSToUTC(week, tow)
      setGpsDate(date)
      setGpsCalendarMonth(date)
      setGpsTime(
        `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
          .getSeconds()
          .toString()
          .padStart(2, "0")}`,
      )
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert("转换出错")
      }
    }
  }

  // 日期时间转换为GPS周内秒
  const handleDateTimeToGPS = () => {
    try {
      if (!gpsDate) {
        throw new Error("请选择有效的日期")
      }

      const [hours, minutes, seconds] = gpsTime.split(":").map(Number)

      const date = new Date(gpsDate)
      date.setHours(hours || 0)
      date.setMinutes(minutes || 0)
      date.setSeconds(seconds || 0)

      if (isNaN(date.getTime())) {
        throw new Error("无效的日期或时间格式")
      }

      const { week, tow } = convertUTCToGPS(date)
      setGpsWeek(week.toString())
      setGpsTow(tow.toString())
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert("转换出错")
      }
    }
  }

  // 北斗周内秒转换为日期时间
  const handleBDSToDateTime = () => {
    try {
      const week = Number.parseInt(bdsWeek)
      const tow = Number.parseInt(bdsTow)

      if (isNaN(week) || isNaN(tow) || tow < 0 || tow >= 604800) {
        throw new Error("请输入有效的北斗周和周内秒")
      }

      const date = convertBDSToUTC(week, tow)
      setBdsDate(date)
      setBdsCalendarMonth(date)
      setBdsTime(
        `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
          .getSeconds()
          .toString()
          .padStart(2, "0")}`,
      )
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert("转换出错")
      }
    }
  }

  // 日期时间转换为北斗周内秒
  const handleDateTimeToBDS = () => {
    try {
      if (!bdsDate) {
        throw new Error("请选择有效的日期")
      }

      const [hours, minutes, seconds] = bdsTime.split(":").map(Number)

      const date = new Date(bdsDate)
      date.setHours(hours || 0)
      date.setMinutes(minutes || 0)
      date.setSeconds(seconds || 0)

      if (isNaN(date.getTime())) {
        throw new Error("无效的日期或时间格式")
      }

      const { week, tow } = convertUTCToBDS(date)
      setBdsWeek(week.toString())
      setBdsTow(tow.toString())
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert("转换出错")
      }
    }
  }

  // 处理GPS时间变化
  const handleGpsTimeChange = (value: string) => {
    setGpsTime(value)
  }

  // 处理北斗时间变化
  const handleBdsTimeChange = (value: string) => {
    setBdsTime(value)
  }

  // 修改handleGpsDateSelect函数，在选择日期后关闭Popover
  const handleGpsDateSelect = (date: Date | undefined) => {
    setGpsDate(date)
    if (date) {
      setGpsCalendarMonth(date)
      setGpsDatePickerOpen(false) // 选择日期后关闭Popover
    }
  }

  // 修改handleBdsDateSelect函数，在选择日期后关闭Popover
  const handleBdsDateSelect = (date: Date | undefined) => {
    setBdsDate(date)
    if (date) {
      setBdsCalendarMonth(date)
      setBdsDatePickerOpen(false) // 选择日期后关闭Popover
    }
  }

  // 处理GPS年份变更
  const handleGpsYearChange = (year: number) => {
    const newDate = new Date(gpsCalendarMonth)
    newDate.setFullYear(year)
    setGpsCalendarMonth(newDate)
  }

  // 处理GPS月份变更
  const handleGpsMonthChange = (month: number) => {
    const newDate = new Date(gpsCalendarMonth)
    newDate.setMonth(month)
    setGpsCalendarMonth(newDate)
  }

  // 处理北斗年份变更
  const handleBdsYearChange = (year: number) => {
    const newDate = new Date(bdsCalendarMonth)
    newDate.setFullYear(year)
    setBdsCalendarMonth(newDate)
  }

  // 处理北斗月份变更
  const handleBdsMonthChange = (month: number) => {
    const newDate = new Date(bdsCalendarMonth)
    newDate.setMonth(month)
    setBdsCalendarMonth(newDate)
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
              GNSS 时间转换器
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4">
        <Tabs defaultValue="gps" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="gps">GPS 时间转换</TabsTrigger>
            <TabsTrigger value="bds">北斗时间转换</TabsTrigger>
          </TabsList>

          <TabsContent value="gps">
            <Card className="converter-card max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center text-2xl">GPS 时间转换</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6 bg-white/50 dark:bg-gray-800/50 p-6 rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <Clock className="h-5 w-5" />
                      GPS周 → 日期时间
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="gps-week">GPS 周</Label>
                        <Input
                          id="gps-week"
                          value={gpsWeek}
                          onChange={(e) => setGpsWeek(e.target.value)}
                          placeholder="例如: 2200"
                          className="bg-white dark:bg-gray-950"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gps-tow">GPS 周内秒</Label>
                        <Input
                          id="gps-tow"
                          value={gpsTow}
                          onChange={(e) => setGpsTow(e.target.value)}
                          placeholder="例如: 172800 (周二开始)"
                          className="bg-white dark:bg-gray-950"
                        />
                      </div>

                      <Button onClick={handleGPSToDateTime} className="w-full">
                        转换为日期时间
                      </Button>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="space-y-2">
                        <Label>转换结果</Label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>{gpsDate ? format(gpsDate, "yyyy-MM-dd", { locale: zhCN }) : "未选择日期"}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>{gpsTime || "00:00:00"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 bg-white/50 dark:bg-gray-800/50 p-6 rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <Calendar className="h-5 w-5" />
                      日期时间 → GPS周
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>选择日期</Label>
                        <Popover open={gpsDatePickerOpen} onOpenChange={setGpsDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal bg-white dark:bg-gray-950",
                                !gpsDate && "text-muted-foreground",
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {gpsDate ? format(gpsDate, "yyyy-MM-dd", { locale: zhCN }) : <span>选择日期</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <div className="p-3 flex gap-2">
                              <select
                                value={gpsCalendarMonth.getFullYear()}
                                onChange={(e) => handleGpsYearChange(Number.parseInt(e.target.value))}
                                className="flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                              >
                                {Array.from({ length: 2051 - 1980 }, (_, i) => 1980 + i).map((year) => (
                                  <option key={year} value={year}>
                                    {year}年
                                  </option>
                                ))}
                              </select>

                              <select
                                value={gpsCalendarMonth.getMonth()}
                                onChange={(e) => handleGpsMonthChange(Number.parseInt(e.target.value))}
                                className="flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                              >
                                {Array.from({ length: 12 }, (_, i) => i).map((month) => (
                                  <option key={month} value={month}>
                                    {month + 1}月
                                  </option>
                                ))}
                              </select>
                            </div>
                            <CalendarComponent
                              mode="single"
                              selected={gpsDate}
                              onSelect={handleGpsDateSelect}
                              month={gpsCalendarMonth}
                              onMonthChange={setGpsCalendarMonth}
                              initialFocus
                              locale={zhCN}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>选择时间</Label>
                        <TimePickerDemo value={gpsTime} onChange={handleGpsTimeChange} />
                      </div>

                      <Button onClick={handleDateTimeToGPS} className="w-full">
                        转换为GPS周和周内秒
                      </Button>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="space-y-2">
                        <Label>转换结果</Label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                            <span className="font-medium">GPS周:</span>
                            <span className="font-bold">{gpsWeek || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                            <span className="font-medium">周内秒:</span>
                            <span className="font-bold">{gpsTow || "-"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                  <h3 className="font-medium mb-2 text-blue-700 dark:text-blue-400">GPS 时间说明:</h3>
                  <p className="text-sm">
                    GPS时间从1980年1月6日00:00:00 UTC开始计算。GPS周从0开始，每7天为一个GPS周。
                    周内秒范围从0到604799，表示一周内的秒数。 GPS时间与UTC时间之间存在闰秒差异，目前差异为18秒。
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bds">
            <Card className="converter-card max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center text-2xl">北斗时间转换</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6 bg-white/50 dark:bg-gray-800/50 p-6 rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                      <Clock className="h-5 w-5" />
                      北斗周 → 日期时间
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="bds-week">北斗 周</Label>
                        <Input
                          id="bds-week"
                          value={bdsWeek}
                          onChange={(e) => setBdsWeek(e.target.value)}
                          placeholder="例如: 900"
                          className="bg-white dark:bg-gray-950"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bds-tow">北斗 周内秒</Label>
                        <Input
                          id="bds-tow"
                          value={bdsTow}
                          onChange={(e) => setBdsTow(e.target.value)}
                          placeholder="例如: 172800 (周二开始)"
                          className="bg-white dark:bg-gray-950"
                        />
                      </div>

                      <Button onClick={handleBDSToDateTime} className="w-full">
                        转换为日期时间
                      </Button>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="space-y-2">
                        <Label>转换结果</Label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-md">
                            <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            <span>{bdsDate ? format(bdsDate, "yyyy-MM-dd", { locale: zhCN }) : "未选择日期"}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-md">
                            <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            <span>{bdsTime || "00:00:00"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 bg-white/50 dark:bg-gray-800/50 p-6 rounded-xl shadow-sm">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                      <Calendar className="h-5 w-5" />
                      日期时间 → 北斗周
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>选择日期</Label>
                        <Popover open={bdsDatePickerOpen} onOpenChange={setBdsDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal bg-white dark:bg-gray-950",
                                !bdsDate && "text-muted-foreground",
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {bdsDate ? format(bdsDate, "yyyy-MM-dd", { locale: zhCN }) : <span>选择日期</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <div className="p-3 flex gap-2">
                              <select
                                value={bdsCalendarMonth.getFullYear()}
                                onChange={(e) => handleBdsYearChange(Number.parseInt(e.target.value))}
                                className="flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                              >
                                {Array.from({ length: 2051 - 2000 }, (_, i) => 2000 + i).map((year) => (
                                  <option key={year} value={year}>
                                    {year}年
                                  </option>
                                ))}
                              </select>

                              <select
                                value={bdsCalendarMonth.getMonth()}
                                onChange={(e) => handleBdsMonthChange(Number.parseInt(e.target.value))}
                                className="flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                              >
                                {Array.from({ length: 12 }, (_, i) => i).map((month) => (
                                  <option key={month} value={month}>
                                    {month + 1}月
                                  </option>
                                ))}
                              </select>
                            </div>
                            <CalendarComponent
                              mode="single"
                              selected={bdsDate}
                              onSelect={handleBdsDateSelect}
                              month={bdsCalendarMonth}
                              onMonthChange={setBdsCalendarMonth}
                              initialFocus
                              locale={zhCN}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>选择时间</Label>
                        <TimePickerDemo value={bdsTime} onChange={handleBdsTimeChange} />
                      </div>

                      <Button onClick={handleDateTimeToBDS} className="w-full">
                        转换为北斗周和周内秒
                      </Button>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="space-y-2">
                        <Label>转换结果</Label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-md">
                            <span className="font-medium">北斗周:</span>
                            <span className="font-bold">{bdsWeek || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-md">
                            <span className="font-medium">周内秒:</span>
                            <span className="font-bold">{bdsTow || "-"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-md">
                  <h3 className="font-medium mb-2 text-indigo-700 dark:text-indigo-400">北斗时间说明:</h3>
                  <p className="text-sm">
                    北斗时间从2006年1月1日00:00:00 UTC开始计算。北斗周从0开始，每7天为一个北斗周。
                    周内秒范围从0到604799，表示一周内的秒数。 北斗时间与UTC时间之间存在闰秒差异，目前差异为4秒。
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
