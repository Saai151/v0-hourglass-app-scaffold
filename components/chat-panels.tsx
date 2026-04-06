'use client'

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

interface ChatPanelsProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function ChatPanels({ sidebar, children }: ChatPanelsProps) {
  return (
    <div className="flex h-full min-h-0">
      <ResizablePanelGroup direction="horizontal" autoSaveId="chat-sidebar">
        <ResizablePanel defaultSize={28} minSize={20} maxSize={40} className="hidden lg:block">
          {sidebar}
        </ResizablePanel>
        <ResizableHandle className="hidden lg:flex" />
        <ResizablePanel defaultSize={72}>
          <div className="flex-1 flex flex-col min-h-0 min-w-0 h-full">{children}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
