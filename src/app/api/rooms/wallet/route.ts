import { NextResponse } from 'next/server'
import { getP2pBalance } from '@/lib/db/queries/p2p-wallet'
import { UserRepository } from '@/lib/db/queries/user'

// GET /api/rooms/wallet — the signed-in user's isolated P2P play-money balance.
export async function GET() {
  const user = await UserRepository.getCurrentUser({ minimal: true })
  if (!user) {
    return NextResponse.json({ balance: 0 }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { data } = await getP2pBalance(user.id)
  return NextResponse.json(
    { balance: data?.balance ?? 0 },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
