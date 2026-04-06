import { createClient } from '@/lib/supabase/server'
import { IntegrationsHeader } from '@/components/integrations/integrations-header'
import { IntegrationCard } from '@/components/integrations/integration-card'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch connected accounts
  const { data: accounts } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', user.id)

  // Build integration status map
  const connectionMap: Record<string, { status: string; email?: string }> = {}
  accounts?.forEach(account => {
    connectionMap[account.provider] = {
      status: account.status,
      email: account.account_email || undefined,
    }
  })

  const integrations = [
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      description: 'Sync your calendar events and let Hourglass analyze your meetings.',
      icon: 'calendar',
      required: true,
      connection: connectionMap['google_calendar'],
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Gather email context around meeting topics and attendees.',
      icon: 'mail',
      required: false,
      connection: connectionMap['gmail'],
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Analyze relevant Slack conversations and send meeting updates.',
      icon: 'slack',
      required: false,
      connection: connectionMap['slack'],
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      description: 'Receive approval requests and notifications via WhatsApp.',
      icon: 'whatsapp',
      required: false,
      connection: connectionMap['whatsapp'],
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <IntegrationsHeader />
      
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {integrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
