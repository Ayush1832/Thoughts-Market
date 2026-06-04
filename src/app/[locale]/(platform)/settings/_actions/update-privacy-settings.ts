'use server'

import { revalidatePath } from 'next/cache'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { UserRepository } from '@/lib/db/queries/user'

export interface PrivacySettingsInput {
  profile_visibility: 'public' | 'friends' | 'private'
  show_on_leaderboard: boolean
  share_history_with_friends: boolean
  blocked: string[]
}

const VISIBILITIES = ['public', 'friends', 'private'] as const

export async function updatePrivacySettingsAction(input: PrivacySettingsInput) {
  try {
    const user = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
    if (!user) {
      return { error: 'Unauthenticated.' }
    }

    const profileVisibility = VISIBILITIES.includes(input.profile_visibility)
      ? input.profile_visibility
      : 'public'
    const blocked = Array.isArray(input.blocked)
      ? Array.from(new Set(input.blocked.filter(a => typeof a === 'string' && a.trim().length > 0).map(a => a.trim()))).slice(0, 200)
      : []

    const { error } = await UserRepository.updateUserPrivacySettings(user, {
      profile_visibility: profileVisibility,
      show_on_leaderboard: Boolean(input.show_on_leaderboard),
      share_history_with_friends: Boolean(input.share_history_with_friends),
      blocked,
    })

    if (error) {
      return { error }
    }

    revalidatePath('/settings/privacy')
    return { error: null }
  }
  catch {
    return { error: DEFAULT_ERROR_MESSAGE }
  }
}
