'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface GenerateAuditButtonProps {
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function GenerateAuditButton({
  variant = 'default',
  size = 'sm',
  className,
}: GenerateAuditButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleGenerate() {
    setIsLoading(true)

    try {
      const res = await fetch('/api/audits/generate', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to generate audits', { duration: 8000 })
        return
      }

      if (data.audits_created === 0) {
        toast.info(data.message || 'All meetings already have audits.', { duration: 6000 })
      } else {
        toast.success(`${data.audits_created} meeting${data.audits_created > 1 ? 's' : ''} audited!`, {
          action: {
            label: 'Review in Inbox',
            onClick: () => router.push('/dashboard'),
          },
          duration: 10000,
        })
      }

      router.refresh()
    } catch {
      toast.error('Network error — please try again', { duration: 8000 })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleGenerate}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Analyzing meetings...' : 'Run AI Audit'}
    </Button>
  )
}
