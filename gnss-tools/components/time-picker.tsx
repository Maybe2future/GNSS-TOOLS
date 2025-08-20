"use client"

import type * as React from "react"
import { Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TimePickerDemo({ value, onChange, className }: TimePickerProps) {
  const [hours, minutes, seconds] = value.split(":").map(Number)

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: inputValue } = e.target
    let newValue = inputValue

    // 限制输入范围
    if (name === "hours") {
      newValue = Math.min(Math.max(0, Number(inputValue)), 23)
        .toString()
        .padStart(2, "0")
    } else {
      newValue = Math.min(Math.max(0, Number(inputValue)), 59)
        .toString()
        .padStart(2, "0")
    }

    // 更新时间字符串
    const newTimeArray = value.split(":")
    if (name === "hours") newTimeArray[0] = newValue
    if (name === "minutes") newTimeArray[1] = newValue
    if (name === "seconds") newTimeArray[2] = newValue

    onChange(newTimeArray.join(":"))
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="grid grid-cols-3 gap-2">
        <div className="relative">
          <Input
            name="hours"
            value={hours?.toString().padStart(2, "0") || "00"}
            onChange={handleTimeChange}
            className="bg-white dark:bg-gray-950 text-center"
            maxLength={2}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">时</span>
        </div>
        <div className="relative">
          <Input
            name="minutes"
            value={minutes?.toString().padStart(2, "0") || "00"}
            onChange={handleTimeChange}
            className="bg-white dark:bg-gray-950 text-center"
            maxLength={2}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">分</span>
        </div>
        <div className="relative">
          <Input
            name="seconds"
            value={seconds?.toString().padStart(2, "0") || "00"}
            onChange={handleTimeChange}
            className="bg-white dark:bg-gray-950 text-center"
            maxLength={2}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">秒</span>
        </div>
      </div>
      <Clock className="h-4 w-4 text-gray-400" />
    </div>
  )
}
