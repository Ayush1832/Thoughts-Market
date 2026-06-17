'use client'

import type { AdminRole } from '@/lib/db/schema/auth/tables'
import { PlusIcon } from 'lucide-react'
import { useExtracted } from 'next-intl'
import { useParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { routing } from '@/i18n/routing'
import { RoleCheckboxList } from './RoleCheckboxList'

function getAdminApiBasePath(locale?: string) {
  if (!locale || locale === routing.defaultLocale) { return '/admin/api' }
  return `/${locale}/admin/api`
}

export function AssignRoleDialog({ onSuccess }: { onSuccess?: () => void }) {
  const t = useExtracted()
  const { locale } = useParams() as { locale?: string }
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roles, setRoles] = useState<Set<AdminRole>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleRole(role: AdminRole, checked: boolean) {
    setRoles((prev) => {
      const next = new Set(prev)
      if (checked) { next.add(role) }
      else { next.delete(role) }
      return next
    })
  }

  function reset() {
    setEmail('')
    setPassword('')
    setRoles(new Set())
    setError(null)
  }

  function handleSubmit() {
    if (!email.trim() || !password.trim() || roles.size === 0) {
      setError(t('Please fill in all fields and select at least one role.'))
      return
    }

    if (!email.includes('@')) {
      setError(t('Please enter a valid email address.'))
      return
    }

    if (password.length < 8) {
      setError(t('Password must be at least 8 characters.'))
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const base = getAdminApiBasePath(locale)
        const res = await fetch(`${base}/admin-users/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email, password, roles: Array.from(roles) }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || t('Failed to create admin user.'))
          return
        }

        setOpen(false)
        reset()
        onSuccess?.()
      }
      catch {
        setError(t('An unexpected error occurred.'))
      }
    })
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) { reset() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="mr-2 size-4" />
          {t('Create a Role')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Create Admin User')}</DialogTitle>
          <DialogDescription>
            {t('Create a new admin user and grant one or more roles. They can log in with this email and password.')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="email">{t('Email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isPending}
              autoComplete="email"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">{t('Password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isPending}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">{t('Minimum 8 characters')}</p>
          </div>

          <div className="grid gap-2">
            <Label>{t('Roles')}</Label>
            <RoleCheckboxList selected={roles} onToggle={toggleRole} disabled={isPending} />
            <p className="text-xs text-muted-foreground">
              {t('They will only see admin sections for their selected roles.')}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !email.trim() || !password.trim() || roles.size === 0}>
            {isPending ? t('Creating...') : t('Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
