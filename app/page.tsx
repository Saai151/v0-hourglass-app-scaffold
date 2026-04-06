import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { HourglassIcon } from '@/components/icons'
import { AppShowcase } from '@/components/landing/app-showcase'
import { DemoVideoSection } from '@/components/landing/demo-video-section'
import {
  ArrowRight,
  Calendar,
  MessageSquare,
  Sparkles,
  CheckCircle
} from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-[1100px] mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <HourglassIcon className="h-8 w-8 text-foreground" />
              <span className="font-semibold text-xl">Hourglass</span>
            </Link>
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/sign-up">Get started</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-28 px-6 animate-slide-up">
        <div className="max-w-[800px] mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-8">
            Reclaim your calendar with{' '}
            <span className="relative">
              intelligent meeting ops
              <span className="absolute bottom-1 left-0 w-full h-3 bg-primary/30 -z-10" />
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
            Hourglass is the context layer on top of all your meetings — analyzing, optimizing, executing, reminding, and answering questions so you spend less time in unnecessary meetings.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/auth/sign-up">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Interactive App Demo */}
      <section className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <AppShowcase />
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hourglass connects to your calendar and communication tools to intelligently audit your meetings
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={Calendar}
              title="Connect your calendar"
              description="Sync with Google Calendar to let Hourglass analyze your upcoming meetings and their context."
            />
            <FeatureCard
              icon={Sparkles}
              title="AI-powered analysis"
              description="Our AI reviews each meeting, gathering context from emails and Slack to make smart recommendations."
            />
            <FeatureCard
              icon={CheckCircle}
              title="Approve and execute"
              description="Review suggestions in your inbox, approve with one click, and let Hourglass handle the rest."
            />
            <FeatureCard
              icon={MessageSquare}
              title="Ask about your meetings"
              description="Query your meeting notes, transcripts, and summaries. Get instant answers grounded in your actual meeting data."
            />
          </div>
        </div>
      </section>

      {/* Demo Videos */}
      <DemoVideoSection
        heading="Audit your calendar in seconds"
        description="Hourglass reviews each meeting, gathers context from emails and Slack, and delivers smart recommendations straight to your inbox."
        videoSrc="/Demo1.mp4"
      />
      <DemoVideoSection
        heading="Ask anything about your meetings"
        description="Upload transcripts or notes and ask questions across all your meetings. Get grounded answers with citations back to the source material."
        videoSrc="/Demo2.mp4"
        reversed
      />

      {/* CTA */}
      <section className="py-28 px-6">
        <div className="max-w-[700px] mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to reclaim your time?</h2>
          <p className="text-muted-foreground mb-10">
            Join thousands of professionals who are saving hours every week with Hourglass.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/auth/sign-up">
              Get started for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HourglassIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Hourglass &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#" className="cursor-pointer hover:text-foreground transition-colors duration-200">Privacy</Link>
            <Link href="#" className="cursor-pointer hover:text-foreground transition-colors duration-200">Terms</Link>
            <Link href="#" className="cursor-pointer hover:text-foreground transition-colors duration-200">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: typeof Calendar
  title: string
  description: string 
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-8 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm">
      <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center mb-6">
        <Icon className="h-6 w-6 text-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

