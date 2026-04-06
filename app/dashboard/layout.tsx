import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardPanels } from '@/components/dashboard-panels'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch profile and pending audit count in parallel
  const [{ data: profile }, { count: pendingCount }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single(),
    supabase
      .from('meeting_audits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending'),
  ])

  return (
    <DashboardPanels
      sidebar={
        <AppSidebar
          user={{
            email: user.email,
            full_name: profile?.full_name || undefined,
          }}
          pendingAuditCount={pendingCount || 0}
        />
      }
    >
      {children}
    </DashboardPanels>
  )
}
