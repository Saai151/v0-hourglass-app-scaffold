'use client'

import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { AuditVerdict } from '@/lib/types'

interface VerdictBreakdownProps {
  counts: Record<AuditVerdict, number>
}

const verdictConfig = {
  cancel: { label: 'Cancel', color: 'oklch(0.577 0.245 27.325)' },
  asyncify: { label: 'Make Async', color: 'oklch(0.623 0.214 259.815)' },
  shorten: { label: 'Shorten', color: 'oklch(0.666 0.179 58.318)' },
  delegate: { label: 'Delegate', color: 'oklch(0.627 0.265 303.9)' },
  keep: { label: 'Keep', color: 'oklch(0.627 0.194 149.214)' },
  needs_context: { label: 'Needs Context', color: 'oklch(0.551 0.027 264.364)' },
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
