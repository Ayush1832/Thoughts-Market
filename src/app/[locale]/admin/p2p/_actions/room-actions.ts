'use server'

import { getExtracted } from 'next-intl/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RoomsRepository } from '@/lib/db/queries/rooms'
import { UserRepository } from '@/lib/db/queries/user'

export interface CreateRoomActionState {
  error: string | null
  success: boolean
}

const CreateRoomSchema = z.object({
  name: z.string().trim().min(2, 'Room name must be at least 2 characters.').max(60, 'Room name is too long.'),
  max_participants: z.coerce.number().int().min(2, 'Need at least 2 players.').max(500, 'Max 500 players.'),
  is_private: z.boolean(),
})

export async function createRoomAction(
  _prevState: CreateRoomActionState,
  formData: FormData,
): Promise<CreateRoomActionState> {
  const t = await getExtracted()
  const user = await UserRepository.getCurrentUser({ minimal: true })

  if (!user || !user.is_admin) {
    return { error: t('Unauthenticated.'), success: false }
  }

  const isPrivateRaw = formData.get('is_private')
  const parsed = CreateRoomSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    max_participants: String(formData.get('max_participants') ?? ''),
    is_private: isPrivateRaw === 'on' || isPrivateRaw === 'true',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t('Invalid input.'), success: false }
  }

  const { data, error } = await RoomsRepository.createRoom(
    user.id,
    parsed.data.name,
    parsed.data.max_participants,
    parsed.data.is_private,
  )

  if (error || !data) {
    return { error: error ?? DEFAULT_ERROR_MESSAGE, success: false }
  }

  revalidatePath('/admin/p2p')
  return { error: null, success: true }
}

export async function deleteRoomAction(roomId: string): Promise<{ error: string | null }> {
  const t = await getExtracted()
  const user = await UserRepository.getCurrentUser({ minimal: true })

  if (!user || !user.is_admin) {
    return { error: t('Unauthenticated.') }
  }

  if (!roomId) {
    return { error: t('Invalid input.') }
  }

  const { error } = await RoomsRepository.deleteRoom(roomId)
  if (error) {
    return { error: DEFAULT_ERROR_MESSAGE }
  }

  revalidatePath('/admin/p2p')
  return { error: null }
}
