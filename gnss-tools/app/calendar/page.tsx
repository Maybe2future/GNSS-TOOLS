"use client"

import { useState } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  getYear,
  getDayOfYear,
  setMonth,
  setYear,
} from "date-fns"
import { ChevronLeft, ChevronRight, Home, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { calculateGPSWeekAndTow, calculateBDSWeekAndTow, getDayOfWeekFromTow } from "@/lib/gnss-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ThemeToggle } from "@/components/theme-toggle"

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDay = getDay(monthStart)

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
  }

  const currentYear = getYear(currentDate)
  const minYear = 2000
  const maxYear = new Date().getFullYear()

  // 处理年份变更
  const handleYearChange = (year: string) => {
    const newDate = setYear(currentDate, Number.parseInt(year))
    setCurrentDate(newDate)
  }

  // 处理月份变更
  const handleMonthChange = (month: string) => {
    const newDate = setMonth(currentDate, Number.parseInt(month) - 1) // 月份从0开始，所以减1
    setCurrentDate(newDate)
  }

  // 生成年份选项
  const yearOptions = []
  for (let year = maxYear; year >= minYear; year--) {
    yearOptions.push(year)
  }

  // 生成月份选项
  const monthOptions = [
    { value: "1", label: "1月" },
    { value: "2", label: "2月" },
    { value: "3", label: "3月" },
    { value: "4", label: "4月" },
    { value: "5", label: "5月" },
    { value: "6", label: "6月" },
    { value: "7", label: "7月" },
    { value: "8", label: "8月" },
    { value: "9", label: "9月" },
    { value: "10", label: "10月" },
    { value: "11", label: "11月" },
    { value: "12", label: "12月" },
  ]

  // 检查当前月份是否有效（在2000年到当前日期之间）
  const isPrevMonthDisabled = getYear(subMonths(currentDate, 1)) < minYear
  const isNextMonthDisabled = getYear(addMonths(currentDate, 1)) > maxYear

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
              GNSS 日历
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4">
        <Card className="mb-8 gnss-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <div className="flex items-center gap-2">
                <Button onClick={handlePrevMonth} disabled={isPrevMonthDisabled} variant="outline" size="icon">
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* 年月选择器 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[180px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(currentDate, "yyyy年 MM月")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="start">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">选择年份</h4>
                        <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择年份" />
                          </SelectTrigger>
                          <SelectContent>
                            {yearOptions.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}年
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">选择月份</h4>
                        <Select value={(currentDate.getMonth() + 1).toString()} onValueChange={handleMonthChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择月份" />
                          </SelectTrigger>
                          <SelectContent>
                            {monthOptions.map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button onClick={handleNextMonth} disabled={isNextMonthDisabled} variant="outline" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                <div key={day} className="text-center font-medium py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, index) => (
                <div key={`empty-${index}`} className="p-2"></div>
              ))}

              {monthDays.map((day) => {
                const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

                return (
                  <div
                    key={day.toString()}
                    className={`calendar-day ${isSelected ? "selected" : ""} ${
                      isToday && !isSelected ? "border-blue-300 dark:border-blue-700" : ""
                    }`}
                    onClick={() => handleSelectDate(day)}
                  >
                    <div className="text-center font-medium">{format(day, "d")}</div>
                    <div className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400">{getDayOfYear(day)}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {selectedDate && (
          <Card className="gnss-card">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-6 text-center">
                {format(selectedDate, "yyyy年MM月dd日")} 详细信息
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 text-center">日期信息</h4>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                    <span className="font-medium">日期格式:</span>
                    <span>{format(selectedDate, "yyyy-MM-dd")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                    <span className="font-medium">年积日 (DOY):</span>
                    <span className="font-bold">{getDayOfYear(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium">星期:</span>
                    <span>{format(selectedDate, "EEEE")}</span>
                  </div>
                </div>

                <div className="space-y-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-indigo-700 dark:text-indigo-300 text-center">GNSS 时间</h4>
                  <div className="flex justify-between items-center py-2 border-b border-indigo-100 dark:border-indigo-800">
                    <span className="font-medium">GPS 周:</span>
                    <span className="font-bold">{calculateGPSWeekAndTow(selectedDate).week}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-indigo-100 dark:border-indigo-800">
                    <span className="font-medium">GPS 周内秒:</span>
                    <span className="font-bold">{calculateGPSWeekAndTow(selectedDate).tow}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-indigo-100 dark:border-indigo-800">
                    <span className="font-medium">GPS 周内日:</span>
                    <span>{getDayOfWeekFromTow(calculateGPSWeekAndTow(selectedDate).tow)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-indigo-100 dark:border-indigo-800">
                    <span className="font-medium">北斗 周:</span>
                    <span className="font-bold">{calculateBDSWeekAndTow(selectedDate).week}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-indigo-100 dark:border-indigo-800">
                    <span className="font-medium">北斗 周内秒:</span>
                    <span className="font-bold">{calculateBDSWeekAndTow(selectedDate).tow}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium">北斗 周内日:</span>
                    <span>{getDayOfWeekFromTow(calculateBDSWeekAndTow(selectedDate).tow)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
