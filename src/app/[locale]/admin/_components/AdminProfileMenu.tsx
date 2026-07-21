'use client'

import { ChevronDownIcon, LogOutIcon } from 'lucide-react'
import { useExtracted } from 'next-intl'
import { useParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function AdminProfileMenu({ email, roleLabel }: { email: string, roleLabel: string }) {
  const t = useExtracted()
  const { locale } = useParams() as { locale?: string }
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      try {
        await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' })
      }
      catch {
        // ignore — redirect regardless so the user leaves the admin area
      }
      const prefix = locale ? `/${locale}` : ''
      // Full reload so the server re-reads the (now cleared) session cookies.
      window.location.href = `${prefix}/admin-login`
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="header"
          aria-label="Admin menu"
          className={`
            group flex cursor-pointer items-center gap-2 px-2 transition-colors
            hover:bg-accent/70 hover:text-accent-foreground
            data-[state=open]:bg-accent/70 data-[state=open]:text-accent-foreground
          `}
        >
          <div
            aria-hidden="true"
            className="size-8 shrink-0 rounded-full bg-linear-to-br from-purple-500 to-pink-500"
          />
          <ChevronDownIcon className="size-4 transition-transform duration-150 group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-70 w-64" align="end" sideOffset={0} collisionPadding={16}>
        <div className="flex items-center gap-3 p-3">
          <div
            aria-hidden="true"
            className="size-10 shrink-0 rounded-full bg-linear-to-br from-purple-500 to-pink-500"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{email}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="py-2 text-sm font-semibold">
          <button
            type="button"
            className="flex w-full items-center gap-2 text-destructive"
            onClick={handleLogout}
            disabled={isPending}
          >
            <LogOutIcon className="size-4" />
            {isPending ? t('Logging out...') : t('Logout')}
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
