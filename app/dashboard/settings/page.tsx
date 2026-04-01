import { createClient } from '@/lib/supabase/server'
import { SettingsHeader } from '@/components/settings/settings-header'
import { ProfileSettings } from '@/components/settings/profile-settings'
import { PreferencesSettings } from '@/components/settings/preferences-settings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch profile and preferences
  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single(),
  ])

  return (
    <div className="flex flex-col h-full">
      <SettingsHeader />
      
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <Tabs defaultValue="profile">
            <TabsList className="mb-6">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <ProfileSettings 
                profile={profile}
                email={user.email || ''}
              />
            </TabsContent>
            
            <TabsContent value="preferences">
              <PreferencesSettings preferences={preferences} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
