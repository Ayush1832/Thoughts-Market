'use server'

import { revalidatePath } from 'next/cache'
import { UserRepository } from '@/lib/db/queries/user'
import { RolesRepository } from '@/lib/db/queries/roles'
import { ADMIN_ROLES } from '@/lib/db/schema/auth/tables'
import type { AdminRole } from '@/lib/db/schema/auth/tables'

export async function assignRoleAction(userId: string, role: AdminRole): Promise<{ error: string | null }> {
  const currentUser = await UserRepository.getCurrentUser({ minimal: true })
  if (!currentUser || !currentUser.is_admin) {
    return { error: 'Unauthorized.' }
  }

  if (!(ADMIN_ROLES as readonly string[]).includes(role)) {
    return { error: 'Invalid role.' }
  }

  const { error } = await RolesRepository.assignRole(userId, role)
  if (error) return { error: 'Failed to assign role.' }

  revalidatePath('/admin/roles')
  return { error: null }
}

export async function removeRoleAction(userId: string, role: AdminRole): Promise<{ error: string | null }> {
  const currentUser = await UserRepository.getCurrentUser({ minimal: true })
  if (!currentUser || !currentUser.is_admin) {
    return { error: 'Unauthorized.' }
  }

  if (!(ADMIN_ROLES as readonly string[]).includes(role)) {
    return { error: 'Invalid role.' }
  }

  const { error } = await RolesRepository.removeRole(userId, role)
  if (error) return { error: 'Failed to remove role.' }

  revalidatePath('/admin/roles')
  return { error: null }
}
