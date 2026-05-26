import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { eq, desc, inArray, sql } from 'drizzle-orm'
import { isAdminWallet } from '@/lib/admin'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { db } from '@/lib/drizzle'
import { users, sessions, wallets } from '@/lib/db/schema/auth/tables'
import { affiliate_referrals } from '@/lib/db/schema/affiliates/tables'
import { UserRepository } from '@/lib/db/queries/user'
import { getPublicAssetUrl } from '@/lib/storage'

function getAdminControls(settings: Record<string, any> = {}) {
  return {
    is_banned: settings.admin_controls?.is_banned ?? false,
    is_shadow_banned: settings.admin_controls?.is_shadow_banned ?? false,
    is_frozen: settings.admin_controls?.is_frozen ?? false,
    limit_trading: settings.admin_controls?.limit_trading ?? false,
    limit_withdrawals: settings.admin_controls?.limit_withdrawals ?? false,
  }
}

function getBadges(settings: Record<string, any> = {}) {
  return {
    badge_verified_trader: settings.badges?.verified_trader ?? false,
    badge_influencer: settings.badges?.influencer ?? false,
    badge_market_creator: settings.badges?.market_creator ?? false,
    badge_whale: settings.badges?.whale ?? false,
  }
}

function getUserStats(settings: Record<string, any> = {}) {
  return {
    kyc_status: settings.kyc?.status ?? 'unverified',
    trust_score: typeof settings.trust?.score === 'number' ? settings.trust.score : null,
    reputation_level: settings.trust?.level ?? 'Bronze',
    total_volume: settings.volume?.total ? `$${Number(settings.volume.total).toLocaleString()}` : '$0',
    win_rate: settings.win_rate ? `${settings.win_rate}%` : '0%',
    pnl: typeof settings.pnl?.total === 'number' ? `${settings.pnl.total >= 0 ? '+' : '-'}$${Math.abs(settings.pnl.total).toLocaleString()}` : '$0',
  }
}

function getRiskSignals(settings: Record<string, any> = {}) {
  const riskFlags = settings.risk?.flags ?? []
  const suspiciousPatterns = settings.risk?.patterns ?? []

  return {
    risk_flags: Array.isArray(riskFlags) ? riskFlags : [],
    suspicious_patterns: Array.isArray(suspiciousPatterns) ? suspiciousPatterns : [],
  }
}

function mergeSettings(existing: Record<string, any> = {}, incoming: Record<string, any> = {}) {
  return {
    ...existing,
    ...incoming,
    admin_controls: {
      ...(existing.admin_controls ?? {}),
      ...(incoming.admin_controls ?? {}),
    },
    badges: {
      ...(existing.badges ?? {}),
      ...(incoming.badges ?? {}),
    },
    kyc: {
      ...(existing.kyc ?? {}),
      ...(incoming.kyc ?? {}),
    },
    trust: {
      ...(existing.trust ?? {}),
      ...(incoming.trust ?? {}),
    },
    risk: {
      ...(existing.risk ?? {}),
      ...(incoming.risk ?? {}),
    },
  }
}

export async function GET(request: NextRequest, context: any) {
  try {
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    let paramsObj: any = context?.params ?? context
    if (paramsObj && typeof paramsObj.then === 'function') {
      paramsObj = await paramsObj
    }
    const userId = paramsObj?.userId
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        address: users.address,
        deposit_wallet_address: users.deposit_wallet_address,
        image: users.image,
        created_at: users.created_at,
        settings: users.settings,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const sessionsData = await db
      .select({ ip_address: sessions.ip_address, user_agent: sessions.user_agent, created_at: sessions.created_at })
      .from(sessions)
      .where(eq(sessions.user_id, userId))
      .orderBy(desc(sessions.created_at))
      .limit(20)

    const walletsData = await db
      .select({ address: wallets.address, chain_id: wallets.chain_id, is_primary: wallets.is_primary, created_at: wallets.created_at })
      .from(wallets)
      .where(eq(wallets.user_id, userId))
      .orderBy(desc(wallets.created_at))

    const referralsData = await db
      .select({ id: affiliate_referrals.id, user_id: affiliate_referrals.user_id, created_at: affiliate_referrals.created_at })
      .from(affiliate_referrals)
      .where(eq(affiliate_referrals.affiliate_user_id, userId))
      .orderBy(desc(affiliate_referrals.created_at))
      .limit(20)

    const referredUserIds = referralsData.map((referral) => referral.user_id)
    const referredUsers = referredUserIds.length > 0
      ? await db
          .select({ id: users.id, username: users.username, deposit_wallet_address: users.deposit_wallet_address })
          .from(users)
          .where(inArray(users.id, referredUserIds))
      : []

    const referralMap = new Map(referredUsers.map((ref) => [ref.id, ref]))

    const referrals = referralsData.map((referral) => ({
      id: referral.id,
      username: referralMap.get(referral.user_id)?.username ?? null,
      deposit_wallet_address: referralMap.get(referral.user_id)?.deposit_wallet_address ?? null,
      created_at: referral.created_at,
    }))

    const settings = user.settings || {}
    const stats = getUserStats(settings)
    const riskSignals = getRiskSignals(settings)
    const controls = getAdminControls(settings)
    const badges = getBadges(settings)

    return NextResponse.json({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        address: user.address,
        deposit_wallet_address: user.deposit_wallet_address,
        image: user.image ? getPublicAssetUrl(user.image) : null,
        created_at: user.created_at,
        profileUrl: null,
        ...stats,
        ...controls,
        ...badges,
        referral_count: referrals.length,
        wallets: walletsData,
        sessions: sessionsData,
        referrals,
        ...riskSignals,
      },
    })
  }
  catch (error) {
    console.error('Admin user detail API error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: any) {
  try {
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    let paramsObj: any = context?.params ?? context
    if (paramsObj && typeof paramsObj.then === 'function') {
      paramsObj = await paramsObj
    }
    const userId = paramsObj?.userId
    const body = await request.json()
    const settingsInput = body.settings ?? {}

    const [existingUser] = await db
      .select({ settings: users.settings })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const mergedSettings = mergeSettings(existingUser.settings ?? {}, settingsInput)
    const { data: updatedUser, error } = await UserRepository.updateUserProfileById(userId, { settings: mergedSettings })

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data: updatedUser })
  }
  catch (error) {
    console.error('Admin user detail PATCH API error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
