'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface Preferences {
  id: string
  user_id: string
  never_touch_external_meetings: boolean
  never_touch_investor_meetings: boolean
  only_suggest_never_execute: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
}

interface PreferencesSettingsProps {
  preferences: Preferences | null
}

export function PreferencesSettings({ preferences }: PreferencesSettingsProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    never_touch_external_meetings: preferences?.never_touch_external_meetings ?? false,
    never_touch_investor_meetings: preferences?.never_touch_investor_meetings ?? false,
    only_suggest_never_execute: preferences?.only_suggest_never_execute ?? true,
    quiet_hours_start: preferences?.quiet_hours_start || '',
    quiet_hours_end: preferences?.quiet_hours_end || '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('user_preferences')
      .update({
        ...formData,
        quiet_hours_start: formData.quiet_hours_start || null,
        quiet_hours_end: formData.quiet_hours_end || null,
      })
      .eq('id', preferences?.id)

    if (!error) {
      router.refresh()
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meeting Rules</CardTitle>
          <CardDescription>
            Set rules for which meetings Hourglass should never touch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Never touch external meetings</Label>
                  <p className="text-sm text-muted-foreground">
                    Skip analysis for meetings with external attendees
                  </p>
                </div>
                <Switch
                  checked={formData.never_touch_external_meetings}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, never_touch_external_meetings: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Never touch investor meetings</Label>
                  <p className="text-sm text-muted-foreground">
                    Skip analysis for meetings tagged as investor-related
                  </p>
                </div>
                <Switch
                  checked={formData.never_touch_investor_meetings}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, never_touch_investor_meetings: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Suggest only, never auto-execute</Label>
                  <p className="text-sm text-muted-foreground">
                    Always require manual approval before taking any action
                  </p>
                </div>
                <Switch
                  checked={formData.only_suggest_never_execute}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, only_suggest_never_execute: checked })
                  }
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-4">Quiet Hours</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {"Don't"} send notifications or approval requests during these hours
              </p>
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet_start">Start time</Label>
                  <Input
                    id="quiet_start"
                    type="time"
                    value={formData.quiet_hours_start}
                    onChange={(e) => setFormData({ ...formData, quiet_hours_start: e.target.value })}
                    className="w-32"
                  />
                </div>
                <span className="text-muted-foreground mt-6">to</span>
                <div className="space-y-2">
                  <Label htmlFor="quiet_end">End time</Label>
                  <Input
                    id="quiet_end"
                    type="time"
                    value={formData.quiet_hours_end}
                    onChange={(e) => setFormData({ ...formData, quiet_hours_end: e.target.value })}
                    className="w-32"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save preferences
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
