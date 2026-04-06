'use client'

import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { AuditVerdict } from '@/lib/types'

interface VerdictBreakdownProps {
  counts: Record<AuditVerdict, number>
}

const verdictConfig = {
  cancel: { label: 'Cancel', color: '#1C1B17' },
  asyncify: { label: 'Make Async', color: '#6B6B6B' },
  shorten: { label: 'Shorten', color: '#E4F222' },
  delegate: { label: 'Delegate', color: '#A3A3A3' },
  keep: { label: 'Keep', color: '#D4D4D4' },
  needs_context: { label: 'Needs Context', color: '#E5E5E5' },
} satisfies ChartConfig

const verdictOrder: AuditVerdict[] = ['cancel', 'asyncify', 'shorten', 'delegate', 'keep', 'needs_context']

export function VerdictBreakdown({ counts }: VerdictBreakdownProps) {
  const data = verdictOrder
    .map((verdict) => ({
      verdict,
      count: counts[verdict] || 0,
      fill: `var(--color-${verdict})`,
    }))
    .filter((d) => d.count > 0)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Verdict Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
          No audits yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Verdict Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={verdictConfig} className="h-[180px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
            <YAxis
              dataKey="verdict"
              type="category"
              tickLine={false}
              axisLine={false}
              width={90}
              tickFormatter={(value: string) =>
                verdictConfig[value as AuditVerdict]?.label ?? value
              }
            />
            <XAxis type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
