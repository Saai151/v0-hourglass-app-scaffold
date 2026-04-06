'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size={collapsed ? 'icon-sm' : 'sm'}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="w-full text-muted-foreground hover:text-foreground hover:bg-hover-bg"
      title={collapsed ? 'Toggle theme' : undefined}
    >
      <span className="relative h-4 w-4 flex-shrink-0">
        <Sun className="absolute inset-0 h-4 w-4 rotate-0 scale-100 transition-transform dark:rotate-90 dark:scale-0" />
        <Moon className="absolute inset-0 h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      </span>
      {!collapsed && <span className="text-sm">Toggle theme</span>}
    </Button>
  )
}
