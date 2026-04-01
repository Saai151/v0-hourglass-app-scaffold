'use client'

import { useState } from 'react'
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
  ExternalLink 
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [isConnecting, setIsConnecting] = useState(false)
  const Icon = iconMap[integration.icon] || Calendar
  const status = integration.connection?.status as ConnectionStatus | undefined
  const isConnected = status === 'connected'
  const hasError = status === 'error'

  async function handleConnect() {
    setIsConnecting(true)
    // In a real app, this would initiate OAuth flow
    // For now, we'll simulate a connection attempt
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsConnecting(false)
    // The OAuth redirect would happen here
    alert(`OAuth flow for ${integration.name} would start here. This requires setting up OAuth credentials.`)
  }

  async function handleDisconnect() {
    // In a real app, this would revoke tokens and remove the connection
    alert(`Disconnecting ${integration.name} would happen here.`)
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
              <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                Disconnect
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
