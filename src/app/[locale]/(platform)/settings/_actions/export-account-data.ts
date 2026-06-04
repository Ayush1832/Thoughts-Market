'use server'

import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { UserRepository } from '@/lib/db/queries/user'

export async function exportAccountDataAction(): Promise<{ data: string | null, error: string | null }> {
  try {
    const user = await UserRepository.getCurrentUser({ disableCookieCache: true })
    if (!user) {
      return { data: null, error: 'Unauthenticated.' }
    }

    const payload = {
      exported_at: new Date().toISOString(),
      profile: {
        id: user.id,
        address: user.address,
        username: user.username,
        email: (user as any).email ?? null,
        image: user.image ?? null,
        created_at: (user as any).created_at ?? null,
      },
      settings: user.settings ?? {},
    }

    return { data: JSON.stringify(payload, null, 2), error: null }
  }
  catch {
    return { data: null, error: DEFAULT_ERROR_MESSAGE }
  }
}
