'use client'

import { Area, AreaChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

interface DayData {
  day: string
  hours: number
}

interface WeeklyTrendProps {
  data: DayData[]
}

const chartConfig = {
  hours: {
    label: 'Hours saved',
    color: '#1C1B17',
  },
} satisfies ChartConfig

export function WeeklyTrend({ data }: WeeklyTrendProps) {
  const hasData = data.some((d) => d.hours > 0)

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly Trend</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
          No data this week
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Weekly Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="fillHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-hours)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-hours)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis hide />
            <ChartTooltip
              content={<ChartTooltipContent />}
            />
            <Area
              dataKey="hours"
              type="monotone"
              fill="url(#fillHours)"
              stroke="var(--color-hours)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
