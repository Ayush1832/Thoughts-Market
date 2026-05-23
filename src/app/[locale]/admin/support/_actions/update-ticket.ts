'use server'

import { revalidatePath } from 'next/cache'
import { UserRepository } from '@/lib/db/queries/user'
import { SupportRepository } from '@/lib/db/queries/support'
import type { TicketPriority, TicketStatus } from '@/lib/db/schema/support/tables'

export async function updateTicketAction(
  id: string,
  input: {
    status?: TicketStatus
    priority?: TicketPriority
    assigned_to?: string | null
    resolution_notes?: string | null
  },
): Promise<{ error: string | null }> {
  const currentUser = await UserRepository.getCurrentUser({ minimal: true })
  if (!currentUser || !currentUser.is_admin) {
    return { error: 'Unauthorized.' }
  }

  const { error } = await SupportRepository.updateTicket(id, input)
  if (error) return { error }

  revalidatePath('/admin/support')
  return { error: null }
}

export async function createTicketAction(input: {
  category: string
  subject: string
  description: string
  priority?: TicketPriority
  user_id?: string
}): Promise<{ error: string | null }> {
  const currentUser = await UserRepository.getCurrentUser({ minimal: true })
  if (!currentUser || !currentUser.is_admin) {
    return { error: 'Unauthorized.' }
  }

  const { error } = await SupportRepository.createTicket(input as any)
  if (error) return { error }

  revalidatePath('/admin/support')
  return { error: null }
}
