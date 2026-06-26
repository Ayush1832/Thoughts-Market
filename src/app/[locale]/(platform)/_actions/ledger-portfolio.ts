'use server'

import { z } from 'zod'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { listPositionsByCondition } from '@/lib/db/queries/positions'
import { UserRepository } from '@/lib/db/queries/user'

const ConditionSharesSchema = z.object({ conditionId: z.string().min(1) })

export interface ConditionSharesResult {
  error: string | null
  data: Array<{ tokenId: string, shares: string }> | null
}

export async function getMyConditionSharesAction(input: { conditionId: string }): Promise<ConditionSharesResult> {
  const parsed = ConditionSharesSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid request.', data: null }
  }

  const user = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  if (!user) {
    return { error: 'Unauthenticated.', data: null }
  }

  try {
    const rows = await listPositionsByCondition(user.id, parsed.data.conditionId)
    return { error: null, data: rows.map(row => ({ tokenId: row.token_id, shares: row.shares })) }
  }
  catch (error) {
    console.error('Failed to load condition shares', error)
    return { error: DEFAULT_ERROR_MESSAGE, data: null }
  }
}
