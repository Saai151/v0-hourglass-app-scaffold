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
    <section className="py-32 px-6">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-10 items-center">
        <div className="text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">{heading}</h2>
          <p className="text-lg text-muted-foreground">{description}</p>
        </div>
        <div className="w-full max-w-[1200px] rounded-2xl border border-border bg-muted/50 overflow-hidden shadow-xl">
          <video
            className="w-full h-auto"
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      </div>
    </section>
  )
}
