import { desc, eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { UserRepository } from '@/lib/db/queries/user'
import { creator_applications } from '@/lib/db/schema/creators/tables'
import { orders } from '@/lib/db/schema/orders/tables'
import { db } from '@/lib/drizzle'

export const WAGER_REQUIREMENT_USD = 1_000
const USDC_DECIMALS = 1_000_000

export async function GET() {
  try {
    const user = await UserRepository.getCurrentUser({ minimal: true })

    if (!user) {
      return NextResponse.json({
        applicationStatus: 'none',
        totalWageredUsd: 0,
        isEligible: false,
        displayName: null,
        username: null,
        reviewNotes: null,
        niche: null,
      })
    }

    // Sum all orders maker_amount for this user (USDC 6-decimal → dollars)
    const [wagerRow] = await db
      .select({
        total: sql<string>`coalesce(sum(cast(maker_amount as numeric)) / ${USDC_DECIMALS}, 0)`,
      })
      .from(orders)
      .where(eq(orders.user_id, user.id))

    const totalWageredUsd = Number(wagerRow?.total ?? 0)

    // Most recent application by this user
    const [application] = await db
      .select({
        status: creator_applications.status,
        display_name: creator_applications.display_name,
        username: creator_applications.username,
        review_notes: creator_applications.review_notes,
        niche: creator_applications.niche,
      })
      .from(creator_applications)
      .where(eq(creator_applications.user_id, user.id))
      .orderBy(desc(creator_applications.created_at))
      .limit(1)

    return NextResponse.json({
      applicationStatus: application?.status ?? 'none',
      totalWageredUsd,
      isEligible: totalWageredUsd >= WAGER_REQUIREMENT_USD,
      displayName: application?.display_name ?? null,
      username: application?.username ?? null,
      reviewNotes: application?.review_notes ?? null,
      niche: application?.niche ?? null,
    })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
