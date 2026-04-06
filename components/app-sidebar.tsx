'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { HourglassIcon } from '@/components/icons'
import {
  Inbox,
  Calendar,
  MessageSquare,
  Link2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { signOut } from '@/app/auth/actions'

const navItems = [
  {
    label: 'Inbox',
    href: '/dashboard',
    icon: Inbox,
    description: 'Pending audit recommendations',
  },
  {
    label: 'Meetings',
    href: '/dashboard/meetings',
    icon: Calendar,
    description: 'Your calendar events',
  },
  {
    label: 'Chat',
    href: '/dashboard/chat',
    icon: MessageSquare,
    description: 'Ask across meeting notes',
  },
  {
    label: 'Integrations',
    href: '/dashboard/integrations',
    icon: Link2,
    description: 'Connected accounts',
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Preferences & rules',
  },
]

interface AppSidebarProps {
  user: {
    email?: string
    full_name?: string
  }
  pendingAuditCount?: number
}

export function AppSidebar({ user, pendingAuditCount = 0 }: AppSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-border transition-all duration-200 ease-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <HourglassIcon className="h-8 w-8 text-foreground flex-shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-lg text-foreground">Hourglass</span>
          )}
        </Link>
      </div>

      <nav className="flex-1 py-4 px-2">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all duration-200 ease-out',
                    isActive
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-hover-bg hover:text-foreground'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="relative flex-shrink-0">
                    <item.icon className={cn('h-5 w-5', isActive ? 'text-foreground' : 'text-muted-foreground')} />
                    {item.label === 'Inbox' && pendingAuditCount > 0 && collapsed && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {pendingAuditCount > 9 ? '9+' : pendingAuditCount}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                  )}
                  {!collapsed && item.label === 'Inbox' && pendingAuditCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-bold text-background">
                      {pendingAuditCount > 99 ? '99+' : pendingAuditCount}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-2">
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium truncate text-foreground">
              {user.full_name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-muted-foreground hover:bg-hover-bg hover:text-foreground transition-all duration-200 ease-out',
              collapsed && 'justify-center'
            )}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sign out</span>}
          </button>
        </form>
      </div>

      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full text-muted-foreground hover:text-foreground hover:bg-hover-bg',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
