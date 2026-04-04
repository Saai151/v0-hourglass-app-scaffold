'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'

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
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/audits/generate', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to generate audits')
        return
      }

      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
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
      {error && (
        <span className="text-sm text-destructive">{error}</span>
      )}
    </div>
  )
}
