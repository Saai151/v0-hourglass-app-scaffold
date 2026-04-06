import { cn } from '@/lib/utils'

interface DemoVideoSectionProps {
  heading: string
  description: string
  videoSrc: string
  reversed?: boolean
}

export function DemoVideoSection({
  heading,
  description,
  videoSrc,
  reversed = false,
}: DemoVideoSectionProps) {
  return (
    <section className="py-20 px-6">
      <div
        className={cn(
          'max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16',
          reversed && 'lg:flex-row-reverse',
        )}
      >
        <div className="flex-[3] w-full rounded-2xl border border-border bg-muted/50 overflow-hidden shadow-xl">
          <video
            className="w-full h-auto"
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
        <div className={cn('flex-[1.2] text-center lg:text-left', reversed && 'lg:text-right')}>
          <h2 className="text-3xl font-bold mb-4">{heading}</h2>
          <p className="text-lg text-muted-foreground">{description}</p>
        </div>
      </div>
    </section>
  )
}
