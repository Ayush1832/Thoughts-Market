import { isAdminAuthorized } from '@/lib/admin-auth-check'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function POST(_request: NextRequest) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
