import { isAdminAuthorized } from '@/lib/admin-auth-check'
import type { NextRequest } from 'next/server'
import type { TxStatus, TxType } from '@/lib/db/queries/finance'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { createTransaction, listTransactions } from '@/lib/db/queries/finance'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') ?? undefined) as TxType | undefined
    const status = (searchParams.get('status') ?? undefined) as TxStatus | undefined
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0)

    const { rows, total } = await listTransactions({ type, status, limit, offset })
    return NextResponse.json({ data: rows, total })
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const body = await request.json()
    const { type, amount, currency, status, method, wallet_address, user_id, tx_hash, notes } = body

    if (!type || !amount) {
      return NextResponse.json({ error: 'type and amount are required.' }, { status: 400 })
    }

    const tx = await createTransaction({
      type,
      amount: String(amount),
      currency: currency ?? 'USDC',
      status: status ?? 'pending',
      method: method ?? 'Crypto Wallet',
      wallet_address: wallet_address ?? '',
      user_id: user_id ?? null,
      tx_hash: tx_hash ?? null,
      notes: notes ?? null,
    })

    return NextResponse.json(tx, { status: 201 })
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
