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
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <HourglassIcon className="h-8 w-8 text-primary" />
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
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Meeting Management
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-6">
            Reclaim your calendar with{' '}
            <span className="text-primary">intelligent meeting ops</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
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
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
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
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Smart recommendations</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hourglass suggests the best action for each meeting based on context and your preferences
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <VerdictCard
              color="green"
              title="Keep"
              description="Meeting is valuable and should proceed as scheduled"
            />
            <VerdictCard
              color="amber"
              title="Shorten"
              description="Meeting could be more efficient with less time"
            />
            <VerdictCard
              color="blue"
              title="Make async"
              description="This discussion could be handled via email or Slack"
            />
            <VerdictCard
              color="purple"
              title="Delegate"
              description="Someone else on your team should attend instead"
            />
            <VerdictCard
              color="red"
              title="Cancel"
              description="Meeting is not necessary and should be cancelled"
            />
            <VerdictCard
              color="gray"
              title="Needs context"
              description="More information needed to make a recommendation"
            />
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
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
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to reclaim your time?</h2>
          <p className="text-muted-foreground mb-8">
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
      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HourglassIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Hourglass &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">Privacy</Link>
            <Link href="#" className="hover:text-foreground">Terms</Link>
            <Link href="#" className="hover:text-foreground">Contact</Link>
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
    <div className="bg-card rounded-xl border p-6">
      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

const colorMap: Record<string, string> = {
  green: 'bg-green-100 text-green-700 border-green-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
}

function VerdictCard({ 
  color, 
  title, 
  description 
}: { 
  color: string
  title: string
  description: string 
}) {
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm opacity-80">{description}</p>
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
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
