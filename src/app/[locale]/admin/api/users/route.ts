import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAdminWallet } from '@/lib/admin'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { UserRepository } from '@/lib/db/queries/user'
import { buildPublicProfilePath, buildUsernameProfilePath } from '@/lib/platform-routing'
import { getPublicAssetUrl } from '@/lib/storage'
import { db } from '@/lib/drizzle'
import { sessions } from '@/lib/db/schema/auth/tables'
import { orders } from '@/lib/db/schema/orders/tables'
import { inArray, sql, count, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const limitParam = Number.parseInt(searchParams.get('limit') || '50')
    const limit = Number.isNaN(limitParam) ? 50 : Math.min(limitParam, 100)

    const offsetParam = Number.parseInt(searchParams.get('offset') || '0')
    const offset = Number.isNaN(offsetParam) ? 0 : Math.max(offsetParam, 0)
    const search = searchParams.get('search') || undefined
    const sortBy = (searchParams.get('sortBy') as 'username' | 'email' | 'address' | 'created_at' | 'last_active') || 'created_at'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    const validSortFields = ['username', 'email', 'address', 'created_at', 'last_active']
    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json({ error: 'Invalid sortBy parameter' }, { status: 400 })
    }

    let data: any[] = []
    let totalCount = 0
    let error: any = null

    if (sortBy === 'last_active') {
      const fetchLimit = 1000
      const result = await UserRepository.listUsers({
        limit: fetchLimit,
        offset: 0,
        search,
        sortBy: 'created_at',
        sortOrder,
      })
      data = result.data || []
      totalCount = result.count || 0
      error = result.error
    }
    else {
      const result = await UserRepository.listUsers({
        limit,
        offset,
        search,
        sortBy,
        sortOrder,
      })
      data = result.data || []
      totalCount = result.count || 0
      error = result.error
    }

    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    const referredIds = Array.from(new Set((data ?? [])
      .map(user => user.referred_by_user_id)
      .filter((id): id is string => Boolean(id))))

    const { data: referredUsers } = await UserRepository.getUsersByIds(referredIds)
    const referredEntries = (referredUsers ?? []).filter((ref): ref is typeof ref & { username: string } => Boolean(ref.username))

    const referredMap = new Map<string, { username: string, address: string, deposit_wallet_address?: string | null, image?: string | null }>(
      referredEntries.map(referred => [referred.id, {
        username: referred.username,
        address: referred.address,
        deposit_wallet_address: referred.deposit_wallet_address,
        image: referred.image,
      }]),
    )

    const baseProfileUrl = (() => {
      const raw = process.env.SITE_URL!
      return raw.startsWith('http') ? raw : `https://${raw}`
    })()

    const userIds = (data ?? []).map(u => u.id)
    const sessionsRows = userIds.length ? await db
      .select({ user_id: sessions.user_id, last_seen: sessions.created_at })
      .from(sessions)
      .where(inArray(sessions.user_id, userIds))
      .orderBy(desc(sessions.created_at)) : []

    const lastSeenMap = new Map<string, string>()
    for (const s of sessionsRows as any[]) {
      const existing = lastSeenMap.get(s.user_id)
      if (!existing || new Date(s.last_seen) > new Date(existing)) {
        lastSeenMap.set(s.user_id, s.last_seen)
      }
    }

    const ordersAggRows = userIds.length ? await db
      .select({ user_id: orders.user_id, trade_count: count(orders.id), trade_volume: sql`coalesce(sum(${orders.taker_amount}), 0)` })
      .from(orders)
      .where(inArray(orders.user_id, userIds))
      .groupBy(orders.user_id) : []

    const tradeMap = new Map<string, { trade_count: number, trade_volume: string }>()
    for (const r of ordersAggRows as any[]) {
      tradeMap.set(r.user_id, { trade_count: Number(r.trade_count || 0), trade_volume: String(r.trade_volume ?? '0') })
    }

    const transformedUsers = (data ?? []).map((user) => {
      const created = new Date(user.created_at)
      const createdLabel = Number.isNaN(created.getTime())
        ? '—'
        : created.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })

      const depositWalletAddress = user.deposit_wallet_address
      const profilePath = buildPublicProfilePath(user.username || depositWalletAddress || user.address || '')

      const referredSource = user.referred_by_user_id
        ? referredMap.get(user.referred_by_user_id)
        : undefined
      let referredDisplay: string | null = null
      let referredProfile: string | null = null

      if (user.referred_by_user_id && referredSource) {
        referredDisplay = referredSource.username
        const referredPath = buildUsernameProfilePath(referredSource.username)
        referredProfile = referredPath ? `${baseProfileUrl}${referredPath}` : null
      }

      const settings = user.settings ?? {}
      const kycStatus = settings.kyc?.status ?? 'unverified'
      const trustScore = typeof settings.trust?.score === 'number' ? settings.trust.score : null
      const isBanned = settings.admin_controls?.is_banned ?? false

      const searchText = [
        user.username,
        user.email,
        user.address,
        depositWalletAddress,
        referredDisplay,
      ].filter(Boolean).join(' ').toLowerCase()

      return {
        ...user,
        is_admin: isAdminWallet(user.address) || isAdminWallet(depositWalletAddress),
        avatarUrl: user.image ? getPublicAssetUrl(user.image) : '',
        referred_by_display: referredDisplay,
        referred_by_profile_url: referredProfile,
        created_label: createdLabel,
        profileUrl: profilePath ? `${baseProfileUrl}${profilePath}` : null,
        created_at: user.created_at,
        search_text: searchText,
        kyc_status: kycStatus,
        trust_score: trustScore,
        is_banned: isBanned,
        last_active: lastSeenMap.get(user.id) ?? null,
        trade_count: tradeMap.get(user.id)?.trade_count ?? 0,
        trade_volume: tradeMap.get(user.id)?.trade_volume ?? '0',
      }
    })

    if (sortBy === 'last_active') {
      const sorted = transformedUsers.sort((a: any, b: any) => {
        const ta = a.last_active ? new Date(a.last_active).getTime() : 0
        const tb = b.last_active ? new Date(b.last_active).getTime() : 0
        return sortOrder === 'asc' ? ta - tb : tb - ta
      })

      const paged = sorted.slice(offset, offset + limit)
      return NextResponse.json({ data: paged, count: totalCount, totalCount })
    }

    return NextResponse.json({ data: transformedUsers, count: totalCount, totalCount })
  }
  catch (error) {
    console.error(error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}