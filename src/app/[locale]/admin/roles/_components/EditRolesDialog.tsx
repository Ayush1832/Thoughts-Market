'use client'

import type { AdminRole } from '@/lib/db/schema/auth/tables'
import { PencilIcon } from 'lucide-react'
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
import { routing } from '@/i18n/routing'
import { RoleCheckboxList } from './RoleCheckboxList'

function getAdminApiBasePath(locale?: string) {
  if (!locale || locale === routing.defaultLocale) { return '/admin/api' }
  return `/${locale}/admin/api`
}

export function EditRolesDialog({
  userId,
  label,
  onSuccess,
}: {
  userId: string
  label: string
  onSuccess?: () => void
}) {
  const t = useExtracted()
  const { locale } = useParams() as { locale?: string }
  const [open, setOpen] = useState(false)
  const [roles, setRoles] = useState<Set<AdminRole>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
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

  async function loadRoles() {
    setIsLoading(true)
    setError(null)
    try {
      const base = getAdminApiBasePath(locale)
      const res = await fetch(`${base}/admin-users/${userId}/roles`, { credentials: 'same-origin' })
      const data = await res.json()
      if (res.ok) {
        setRoles(new Set((data.data?.roles ?? []) as AdminRole[]))
      }
      else {
        setError(data.error || t('Failed to load roles.'))
      }
    }
    catch {
      setError(t('An unexpected error occurred.'))
    }
    finally {
      setIsLoading(false)
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (val) {
      void loadRoles()
    }
    else {
      setRoles(new Set())
      setError(null)
    }
  }

  function handleSubmit() {
    if (roles.size === 0) {
      setError(t('Select at least one role.'))
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const base = getAdminApiBasePath(locale)
        const res = await fetch(`${base}/admin-users/${userId}/roles`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ roles: Array.from(roles) }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || t('Failed to update roles.'))
          return
        }
        setOpen(false)
        onSuccess?.()
      }
      catch {
        setError(t('An unexpected error occurred.'))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 text-muted-foreground hover:text-foreground"
          aria-label={t('Edit roles')}
        >
          <PencilIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Edit Roles')}</DialogTitle>
          <DialogDescription>
            {t('Update the admin roles for this user.')}
            {' '}
            <span className="font-medium text-foreground">{label}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {isLoading
            ? <p className="text-sm text-muted-foreground">{t('Loading...')}</p>
            : <RoleCheckboxList selected={roles} onToggle={toggleRole} disabled={isPending} />}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || isLoading || roles.size === 0}>
            {isPending ? t('Saving...') : t('Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
