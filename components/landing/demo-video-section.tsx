import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DemoVideoSectionProps {
  heading: string
  description: string
  videoPlaceholderLabel: string
  reversed?: boolean
}

export function DemoVideoSection({
  heading,
  description,
  videoPlaceholderLabel,
  reversed = false,
}: DemoVideoSectionProps) {
  return (
    <section className="py-24 px-6">
      <div className="max-w-[1100px] mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div className={cn(reversed && 'md:order-last')}>
          <h2 className="text-3xl font-bold mb-4">{heading}</h2>
          <p className="text-lg text-muted-foreground">{description}</p>
        </div>
        <div className="w-full h-[400px] rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center">
          <div className="text-center">
            <Play className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{videoPlaceholderLabel}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
