"use client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from "recharts"

interface SP3ChartProps {
  data: any[]
  dataKey: string | string[]
  yAxisLabel: string
  barColor: string | string[]
  showLegend?: boolean
  legendLabels?: string[]
}

export function SP3Chart({ data, dataKey, yAxisLabel, barColor, showLegend = false, legendLabels }: SP3ChartProps) {
  // 处理卫星ID太多的情况，只显示部分卫星
  const processedData = data.length > 20 ? data.filter((_, index) => index % Math.ceil(data.length / 20) === 0) : data

  const renderBar = (color: string | string[], index?: number) => {
    if (typeof dataKey === "string") {
      return <Bar dataKey={dataKey} fill={color as string} key={dataKey} name={dataKey} />
    } else if (Array.isArray(dataKey) && Array.isArray(color) && index !== undefined) {
      const name = legendLabels && legendLabels[index] ? legendLabels[index] : dataKey[index]
      return <Bar dataKey={dataKey[index]} fill={color[index]} key={dataKey[index]} name={name} />
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={processedData} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="satellite" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 12 }}>
          <Label value="卫星" position="insideBottom" offset={-10} />
        </XAxis>
        <YAxis
          label={{
            value: yAxisLabel,
            angle: -90,
            position: "insideLeft",
            offset: -25,
            style: { textAnchor: "middle" },
          }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip formatter={(value: number) => value.toFixed(6)} labelFormatter={(label) => `卫星: ${label}`} />
        {showLegend && <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 10 }} />}
        {Array.isArray(dataKey) ? dataKey.map((_, index) => renderBar(barColor, index)) : renderBar(barColor)}
      </BarChart>
    </ResponsiveContainer>
  )
}
