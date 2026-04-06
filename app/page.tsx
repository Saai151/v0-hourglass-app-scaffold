import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { HourglassIcon } from '@/components/icons'
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  Mail, 
  MessageSquare, 
  Sparkles,
  Shield,
  Zap,
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
          <div className="inline-flex items-center gap-2 bg-primary/15 text-foreground rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4" />
            AI-Powered Meeting Management
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-8">
            Reclaim your calendar with{' '}
            <span className="relative">
              intelligent meeting ops
              <span className="absolute bottom-1 left-0 w-full h-3 bg-primary/30 -z-10" />
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
            Hourglass analyzes your meetings, suggests optimizations, and executes actions with your approval. Spend less time in unnecessary meetings.
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

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hourglass connects to your calendar and communication tools to intelligently audit your meetings
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
          </div>
        </div>
      </section>

      {/* Verdict Types */}
      <section className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Smart recommendations</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hourglass suggests the best action for each meeting based on context and your preferences
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <VerdictCard title="Keep" description="Meeting is valuable and should proceed as scheduled" />
            <VerdictCard title="Shorten" description="Meeting could be more efficient with less time" />
            <VerdictCard title="Make async" description="This discussion could be handled via email or Slack" />
            <VerdictCard title="Delegate" description="Someone else on your team should attend instead" />
            <VerdictCard title="Cancel" description="Meeting is not necessary and should be cancelled" />
            <VerdictCard title="Needs context" description="More information needed to make a recommendation" />
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-24 px-6">
        <div className="max-w-[800px] mx-auto text-center">
          <div className="grid sm:grid-cols-3 gap-8">
            <TrustCard
              icon={Shield}
              title="Secure"
              description="Your data is encrypted and never shared"
            />
            <TrustCard
              icon={Zap}
              title="Fast"
              description="Get recommendations within minutes"
            />
            <TrustCard
              icon={MessageSquare}
              title="Transparent"
              description="Full visibility into every decision"
            />
          </div>
        </div>
      </section>

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
            <Link href="#" className="hover:text-foreground transition-colors duration-200">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors duration-200">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors duration-200">Contact</Link>
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

function VerdictCard({ 
  title, 
  description 
}: { 
  title: string
  description: string 
}) {
  return (
    <div className="rounded-xl border border-border p-6 bg-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-2 h-2 rounded-full bg-foreground" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground pl-5">{description}</p>
    </div>
  )
}

function TrustCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: typeof Shield
  title: string
  description: string 
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
