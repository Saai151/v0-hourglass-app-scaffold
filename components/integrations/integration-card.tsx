'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GoogleIcon, SlackIcon, WhatsAppIcon } from '@/components/icons'
import {
  Calendar,
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending'

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  required: boolean
  connection?: {
    status: string
    email?: string
  }
}

interface IntegrationCardProps {
  integration: Integration
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  calendar: ({ className }) => <Calendar className={className} />,
  mail: ({ className }) => <Mail className={className} />,
  slack: SlackIcon,
  whatsapp: WhatsAppIcon,
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const Icon = iconMap[integration.icon] || Calendar
  const status = integration.connection?.status as ConnectionStatus | undefined
  const isConnected = status === 'connected'
  const hasError = status === 'error'

  // Show toast for successful connection (from OAuth callback redirect)
  useEffect(() => {
    const justConnected = searchParams.get('connected') === integration.id
    if (justConnected) {
      toast.success(`${integration.name} connected successfully!`)
      const url = new URL(window.location.href)
      url.searchParams.delete('connected')
      window.history.replaceState({}, '', url.toString())
    }

    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        missing_calendar_scope: 'Calendar permission was not granted. Please connect again and make sure to check the "Google Calendar" checkbox on the consent screen.',
        access_denied: 'Access was denied. Please try connecting again.',
        invalid_state: 'Session expired. Please try connecting again.',
        auth_mismatch: 'Authentication mismatch. Please log in and try again.',
        token_exchange_failed: 'Failed to complete connection. Please try again.',
      }
      toast.error(errorMessages[errorParam] || `Connection failed: ${errorParam}`, { duration: 10000 })
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, integration.id, integration.name, isConnected])

  async function handleConnect() {
    if (integration.id === 'google_calendar') {
      setIsConnecting(true)
      // Redirect to our OAuth connect endpoint (which redirects to Google)
      window.location.href = '/api/integrations/google-calendar/connect'
      return
    }
    // Other integrations not yet implemented
    toast.info(`${integration.name} integration coming soon.`)
  }

  async function handleDisconnect() {
    if (integration.id === 'google_calendar') {
      setIsDisconnecting(true)
      try {
        const res = await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' })
        if (res.ok) {
          toast.success('Google Calendar disconnected.')
          router.refresh()
        } else {
          toast.error('Failed to disconnect.')
        }
      } catch {
        toast.error('Failed to disconnect.')
      } finally {
        setIsDisconnecting(false)
      }
      return
    }
    toast.info(`${integration.name} integration coming soon.`)
  }

  async function handleSync() {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/integrations/google-calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Synced ${data.synced} events from Google Calendar.`, {
          action: {
            label: 'View Meetings',
            onClick: () => router.push('/dashboard/meetings'),
          },
          duration: 8000,
        })
        router.refresh()
      } else if (data.code === 'missing_scope') {
        toast.error(
          'Calendar permission not granted. Please disconnect and reconnect, making sure to check the "Google Calendar" checkbox on the consent screen.',
          { duration: 12000 },
        )
      } else {
        toast.error(data.error || 'Sync failed.', { duration: 8000 })
      }
    } catch {
      toast.error('Sync failed.', { duration: 8000 })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Card className={cn(
      'transition-colors',
      isConnected && 'border-green-200 bg-green-50/30',
      hasError && 'border-red-200 bg-red-50/30'
    )}>
      <CardHeader className="flex flex-row items-start gap-4">
        <div className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
          isConnected ? 'bg-green-100' : 'bg-muted'
        )}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{integration.name}</CardTitle>
            {integration.required && (
              <Badge variant="secondary" className="text-xs">Required</Badge>
            )}
          </div>
          <CardDescription className="mt-1">
            {integration.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Connected</span>
                {integration.connection?.email && (
                  <span className="text-sm text-muted-foreground">
                    as {integration.connection.email}
                  </span>
                )}
              </>
            ) : hasError ? (
              <>
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600 font-medium">Connection error</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Not connected</span>
            )}
          </div>

          {isConnected ? (
            <div className="flex items-center gap-2">
              {integration.id === 'google_calendar' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="gap-2"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isSyncing ? 'Syncing...' : 'Sync Calendar'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Connect
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
