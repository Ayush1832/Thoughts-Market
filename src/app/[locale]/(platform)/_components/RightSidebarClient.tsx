'use client'

interface RightSidebarClientProps {
  children: React.ReactNode
}

// Always-expanded right sidebar (Atlas). No collapse/minimize toggle — it stays
// visible on every page.
export default function RightSidebarClient({ children }: RightSidebarClientProps) {
  return (
    <aside className="
      sticky top-14 hidden h-[calc(100vh-3.5rem)] w-80 shrink-0 flex-col border-l border-border/50 bg-card
      xl:flex 2xl:w-96
    "
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  )
}
