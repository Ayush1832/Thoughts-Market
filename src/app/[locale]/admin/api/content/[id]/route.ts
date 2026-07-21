import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function PATCH(_request: NextRequest) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
