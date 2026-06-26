import { NextResponse } from 'next/server'
import { listUserCashTransactions } from '@/lib/db/queries/finance'
import { UserRepository } from '@/lib/db/queries/user'

// Returns the signed-in user's own deposits + withdrawals for the Cash page tabs.
export async function GET() {
  const user = await UserRepository.getCurrentUser()
  if (!user) {
    return NextResponse.json({ transactions: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const rows = await listUserCashTransactions({
    userId: user.id,
    walletAddress: user.deposit_wallet_address,
  })

  return NextResponse.json(
    {
      transactions: rows.map(r => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        method: r.method,
        txHash: r.tx_hash,
        createdAt: r.created_at,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
