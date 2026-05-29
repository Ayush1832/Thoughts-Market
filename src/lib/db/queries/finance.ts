import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm'
import {
  finance_alert_configs,
  finance_alert_events,
  finance_fee_configs,
  finance_transactions,
} from '@/lib/db/schema/finance/tables'
import { orders } from '@/lib/db/schema/orders/tables'
import { db } from '@/lib/drizzle'

// ─── Transactions ─────────────────────────────────────────────────────────────

export type TxType = 'deposit' | 'withdrawal' | 'settlement' | 'refund'
export type TxStatus = 'pending' | 'completed' | 'failed' | 'chargeback'

export async function listTransactions(opts: {
  type?: TxType
  status?: TxStatus
  limit?: number
  offset?: number
}) {
  const { type, status, limit = 50, offset = 0 } = opts
  const conditions = []
  if (type) { conditions.push(eq(finance_transactions.type, type)) }
  if (status) { conditions.push(eq(finance_transactions.status, status)) }

  const rows = await db
    .select()
    .from(finance_transactions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(finance_transactions.created_at))
    .limit(limit)
    .offset(offset)

  const [{ total }] = await db
    .select({ total: count() })
    .from(finance_transactions)
    .where(conditions.length ? and(...conditions) : undefined)

  return { rows, total }
}

export async function getTransactionById(id: string) {
  const rows = await db
    .select()
    .from(finance_transactions)
    .where(eq(finance_transactions.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function createTransaction(data: typeof finance_transactions.$inferInsert) {
  const rows = await db
    .insert(finance_transactions)
    .values(data)
    .returning()
  return rows[0]!
}

export async function updateTransactionStatus(
  id: string,
  status: TxStatus,
  reviewedBy: string,
) {
  const rows = await db
    .update(finance_transactions)
    .set({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(finance_transactions.id, id))
    .returning()
  return rows[0] ?? null
}

// ─── Payment Stats ─────────────────────────────────────────────────────────────

export async function getPaymentStats() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    depositsToday,
    withdrawalsToday,
    pendingSettlements,
    failedToday,
    activeChargebacks,
  ] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(amount), 0)` })
      .from(finance_transactions)
      .where(and(
        eq(finance_transactions.type, 'deposit'),
        eq(finance_transactions.status, 'completed'),
        gte(finance_transactions.created_at, todayStart),
      )),
    db
      .select({ total: sql<string>`coalesce(sum(amount), 0)` })
      .from(finance_transactions)
      .where(and(
        eq(finance_transactions.type, 'withdrawal'),
        eq(finance_transactions.status, 'completed'),
        gte(finance_transactions.created_at, todayStart),
      )),
    db
      .select({ total: sql<string>`coalesce(sum(amount), 0)` })
      .from(finance_transactions)
      .where(and(
        eq(finance_transactions.type, 'settlement'),
        eq(finance_transactions.status, 'pending'),
      )),
    db
      .select({ total: count() })
      .from(finance_transactions)
      .where(and(
        eq(finance_transactions.status, 'failed'),
        gte(finance_transactions.created_at, todayStart),
      )),
    db
      .select({ total: count() })
      .from(finance_transactions)
      .where(eq(finance_transactions.status, 'chargeback')),
  ])

  // Yesterday totals for trend calculation
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const [depositsYesterday, withdrawalsYesterday] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(amount), 0)` })
      .from(finance_transactions)
      .where(and(
        eq(finance_transactions.type, 'deposit'),
        eq(finance_transactions.status, 'completed'),
        gte(finance_transactions.created_at, yesterdayStart),
        lt(finance_transactions.created_at, todayStart),
      )),
    db
      .select({ total: sql<string>`coalesce(sum(amount), 0)` })
      .from(finance_transactions)
      .where(and(
        eq(finance_transactions.type, 'withdrawal'),
        eq(finance_transactions.status, 'completed'),
        gte(finance_transactions.created_at, yesterdayStart),
        lt(finance_transactions.created_at, todayStart),
      )),
  ])

  const depToday = Number(depositsToday[0]?.total ?? 0)
  const depYest = Number(depositsYesterday[0]?.total ?? 0)
  const withToday = Number(withdrawalsToday[0]?.total ?? 0)
  const withYest = Number(withdrawalsYesterday[0]?.total ?? 0)

  const depositTrend = depYest > 0 ? ((depToday - depYest) / depYest) * 100 : 0
  const withdrawalTrend = withYest > 0 ? ((withToday - withYest) / withYest) * 100 : 0

  return {
    depositsToday: depToday,
    depositsTodayTrend: depositTrend,
    withdrawalsToday: withToday,
    withdrawalsTodayTrend: withdrawalTrend,
    pendingSettlements: Number(pendingSettlements[0]?.total ?? 0),
    failedTransactions: Number(failedToday[0]?.total ?? 0),
    activeChargebacks: Number(activeChargebacks[0]?.total ?? 0),
  }
}

// ─── Treasury ─────────────────────────────────────────────────────────────────

export async function getTreasuryStats() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  // Real fee revenue from orders: fee_rate_bps * maker_amount / 10000 / 1e6 (USDC 6 decimals)
  const [feeRevenue30d, feeRevenue60d30d] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(cast(fee_rate_bps as numeric) * cast(maker_amount as numeric) / 10000 / 1000000), 0)`,
      })
      .from(orders)
      .where(gte(orders.created_at, thirtyDaysAgo)),
    db
      .select({
        total: sql<string>`coalesce(sum(cast(fee_rate_bps as numeric) * cast(maker_amount as numeric) / 10000 / 1000000), 0)`,
      })
      .from(orders)
      .where(and(
        gte(orders.created_at, sixtyDaysAgo),
        lt(orders.created_at, thirtyDaysAgo),
      )),
  ])

  // Total deposits vs withdrawals for treasury balance
  const [totalDeposits, totalWithdrawals] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(amount), 0)` })
      .from(finance_transactions)
      .where(and(
        eq(finance_transactions.type, 'deposit'),
        eq(finance_transactions.status, 'completed'),
      )),
    db
      .select({ total: sql<string>`coalesce(sum(amount), 0)` })
      .from(finance_transactions)
      .where(and(
        eq(finance_transactions.type, 'withdrawal'),
        eq(finance_transactions.status, 'completed'),
      )),
  ])

  // Pending settlements = exposure
  const [pendingSettlements] = await db
    .select({ total: sql<string>`coalesce(sum(amount), 0)` })
    .from(finance_transactions)
    .where(and(
      eq(finance_transactions.type, 'settlement'),
      eq(finance_transactions.status, 'pending'),
    ))

  // Withdrawal fees from orders (separate fee category)
  const [withdrawalFees30d] = await db
    .select({
      total: sql<string>`coalesce(sum(amount), 0)`,
    })
    .from(finance_transactions)
    .where(and(
      eq(finance_transactions.type, 'withdrawal'),
      eq(finance_transactions.status, 'completed'),
      gte(finance_transactions.created_at, thirtyDaysAgo),
    ))

  const fee30d = Number(feeRevenue30d[0]?.total ?? 0)
  const fee60d = Number(feeRevenue60d30d[0]?.total ?? 0)
  const feeChange = fee60d > 0 ? ((fee30d - fee60d) / fee60d) * 100 : 0

  const dep = Number(totalDeposits[0]?.total ?? 0)
  const with_ = Number(totalWithdrawals[0]?.total ?? 0)
  const treasuryBalance = dep - with_
  const pendingExp = Number(pendingSettlements?.total ?? 0)

  return {
    treasuryBalance,
    totalDeposits: dep,
    totalWithdrawals: with_,
    tradingFees30d: fee30d,
    tradingFees30dChange: feeChange,
    withdrawalFees30d: Number(withdrawalFees30d?.total ?? 0),
    pendingExposure: pendingExp,
    totalRevenue30d: fee30d + Number(withdrawalFees30d?.total ?? 0),
  }
}

// ─── Fee Configs ──────────────────────────────────────────────────────────────

export async function listFeeConfigs() {
  return db
    .select()
    .from(finance_fee_configs)
    .orderBy(finance_fee_configs.id)
}

export async function updateFeeConfig(
  id: number,
  ratePercent: number,
  updatedBy: string,
) {
  const existing = await db
    .select({ rate_percent: finance_fee_configs.rate_percent })
    .from(finance_fee_configs)
    .where(eq(finance_fee_configs.id, id))
    .limit(1)

  const previousRate = existing[0]?.rate_percent ?? '0'

  const rows = await db
    .update(finance_fee_configs)
    .set({
      previous_rate_percent: previousRate,
      rate_percent: String(ratePercent),
      status: 'active',
      updated_by: updatedBy,
      updated_at: new Date(),
    })
    .where(eq(finance_fee_configs.id, id))
    .returning()
  return rows[0] ?? null
}

// ─── Alert Configs ────────────────────────────────────────────────────────────

export async function listAlertConfigs() {
  return db
    .select()
    .from(finance_alert_configs)
    .orderBy(finance_alert_configs.id)
}

export async function toggleAlertConfig(id: number, isEnabled: boolean, updatedBy: string) {
  const rows = await db
    .update(finance_alert_configs)
    .set({ is_enabled: isEnabled, updated_by: updatedBy, updated_at: new Date() })
    .where(eq(finance_alert_configs.id, id))
    .returning()
  return rows[0] ?? null
}

// ─── Alert Events ─────────────────────────────────────────────────────────────

export async function listAlertEvents(opts: { status?: string, limit?: number }) {
  const { status, limit = 100 } = opts
  const conditions = status ? [eq(finance_alert_events.status, status)] : []

  return db
    .select()
    .from(finance_alert_events)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(finance_alert_events.triggered_at))
    .limit(limit)
}

export async function createAlertEvent(data: {
  config_id?: number
  alert_key: string
  type: 'critical' | 'warning' | 'info'
  title: string
  message: string
  threshold?: string
  current_value?: string
}) {
  const rows = await db
    .insert(finance_alert_events)
    .values(data)
    .returning()
  return rows[0]!
}

export async function updateAlertEventStatus(
  id: number,
  status: 'dismissed' | 'resolved',
  resolvedBy?: string,
) {
  const rows = await db
    .update(finance_alert_events)
    .set({
      status,
      resolved_at: status === 'resolved' ? new Date() : null,
      resolved_by: resolvedBy ?? null,
    })
    .where(eq(finance_alert_events.id, id))
    .returning()
  return rows[0] ?? null
}

export async function getAlertEventCounts() {
  const [active, resolved] = await Promise.all([
    db.select({ total: count() }).from(finance_alert_events).where(eq(finance_alert_events.status, 'active')),
    db.select({ total: count() }).from(finance_alert_events).where(eq(finance_alert_events.status, 'resolved')),
  ])
  const configs = await listAlertConfigs()
  return {
    activeCount: Number(active[0]?.total ?? 0),
    resolvedCount: Number(resolved[0]?.total ?? 0),
    enabledConfigs: configs.filter(c => c.is_enabled).length,
    totalConfigs: configs.length,
  }
}
