'use client'

import { createContext, useContext, useState } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

const SidebarCollapsedContext = createContext(false)
export const useSidebarCollapsed = () => useContext(SidebarCollapsedContext)

interface DashboardPanelsProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function DashboardPanels({ sidebar, children }: DashboardPanelsProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarCollapsedContext.Provider value={collapsed}>
        <ResizablePanelGroup direction="horizontal" autoSaveId="dashboard-sidebar">
          <ResizablePanel
            defaultSize={18}
            minSize={12}
            maxSize={30}
            collapsible
            collapsedSize={4}
            onCollapse={() => setCollapsed(true)}
            onExpand={() => setCollapsed(false)}
          >
            {sidebar}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={82}>
            <main className="h-full overflow-y-auto bg-background">
              {children}
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarCollapsedContext.Provider>
    </div>
  )
}
