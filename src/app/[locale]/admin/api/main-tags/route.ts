import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/admin-auth-check'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { TagRepository } from '@/lib/db/queries/tag'

export async function GET() {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { data, error, globalChilds } = await TagRepository.getMainTags()
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    const mainCategories = (data ?? []).map(tag => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      childs: tag.childs ?? [],
    }))

    return NextResponse.json({
      mainCategories,
      globalCategories: globalChilds ?? [],
    })
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
