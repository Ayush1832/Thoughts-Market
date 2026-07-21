import type { NextRequest } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { WAGER_REQUIREMENT_USD } from '@/app/api/creators/status/route'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { CreatorApplicationsRepository } from '@/lib/db/queries/creators'
import { UserRepository } from '@/lib/db/queries/user'
import { orders } from '@/lib/db/schema/orders/tables'
import { db } from '@/lib/drizzle'

const USDC_DECIMALS = 1_000_000

export async function POST(request: NextRequest) {
  try {
    const user = await UserRepository.getCurrentUser({ minimal: true })

    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to apply.' }, { status: 401 })
    }

    // Enforce wagering requirement
    const [wagerRow] = await db
      .select({
        total: sql<string>`coalesce(sum(cast(maker_amount as numeric)) / ${USDC_DECIMALS}, 0)`,
      })
      .from(orders)
      .where(eq(orders.user_id, user.id))

    const totalWageredUsd = Number(wagerRow?.total ?? 0)
    if (totalWageredUsd < WAGER_REQUIREMENT_USD) {
      return NextResponse.json(
        {
          error: `You need to wager at least $${WAGER_REQUIREMENT_USD.toLocaleString()} to apply. Current: $${totalWageredUsd.toLocaleString()}.`,
          code: 'WAGER_REQUIREMENT_NOT_MET',
        },
        { status: 403 },
      )
    }

    const body = await request.json() as {
      displayName: string
      username: string
      niche: string
      socialLink?: string
      reason: string
      details?: Record<string, unknown>
    }

    if (!body.displayName?.trim() || !body.username?.trim() || !body.niche?.trim() || !body.reason?.trim()) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const { data, error } = await CreatorApplicationsRepository.submit({
      userId: user.id,
      displayName: body.displayName.trim(),
      username: body.username.trim(),
      niche: body.niche.trim(),
      socialLink: body.socialLink?.trim(),
      reason: body.reason.trim(),
      details: body.details && typeof body.details === 'object' ? body.details : undefined,
    })

    if (error || !data) {
      return NextResponse.json({ error: error ?? DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ application: data })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
