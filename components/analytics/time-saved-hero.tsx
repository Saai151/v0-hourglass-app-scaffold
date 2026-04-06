'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Clock, TrendingUp } from 'lucide-react'

interface TimeSavedHeroProps {
  hoursSaved: number
  meetingsActioned: number
  meetingsAudited: number
}

export function TimeSavedHero({ hoursSaved, meetingsActioned, meetingsAudited }: TimeSavedHeroProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Time saved this week
            </p>
            <p className="text-4xl font-bold tracking-tight tabular-nums">
              {hoursSaved.toFixed(1)}{' '}
              <span className="text-lg font-normal text-muted-foreground">hours</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {meetingsActioned} meeting{meetingsActioned !== 1 ? 's' : ''} actioned
              {' '}&middot;{' '}
              {meetingsAudited} audited
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            {hoursSaved > 0 ? (
              <TrendingUp className="h-6 w-6 text-foreground" />
            ) : (
              <Clock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
