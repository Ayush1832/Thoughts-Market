import { NextResponse } from 'next/server'

// Live global-news feed for the Atlas dashboard, powered by the GDELT Doc 2.0
// API (free, no API key). Each category maps to a focused query.

const REVALIDATE_SECONDS = 300 // cache 5 min

const CATEGORY_QUERIES: Record<string, string> = {
  geopolitics: '(geopolitics OR sanctions OR diplomacy OR military OR "foreign policy")',
  elections: '(election OR parliament OR vote OR poll OR referendum)',
  commodities: '(oil OR "crude oil" OR commodity OR gold OR "natural gas")',
  markets: '("stock market" OR equities OR bonds OR "interest rates" OR inflation)',
  tech: '(technology OR "artificial intelligence" OR semiconductor OR chip OR startup)',
  conflict: '(conflict OR war OR ceasefire OR airstrike OR militants)',
}

const CATEGORY_LABEL: Record<string, string> = {
  geopolitics: 'GEOPOLITICS',
  elections: 'ELECTION',
  commodities: 'COMMODITY',
  markets: 'FINANCE',
  tech: 'TECH',
  conflict: 'CONFLICT',
}

interface GdeltArticle {
  url: string
  title: string
  seendate?: string
  domain?: string
  socialimage?: string
  sourcecountry?: string
}

interface FeedItem {
  id: string
  category: string
  title: string
  source: string
  url: string
  image: string | null
  ago: string
}

// "20260605T024500Z" → minutes/hours/days ago
function relativeFromSeendate(seendate?: string): string {
  if (!seendate || seendate.length < 15) return 'now'
  const iso = `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}T${seendate.slice(9, 11)}:${seendate.slice(11, 13)}:${seendate.slice(13, 15)}Z`
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 'now'
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.round(hrs / 24)}d`
}

const FALLBACK: FeedItem[] = [
  { id: 'fb1', category: 'GEOPOLITICS', title: 'Live intelligence feed is temporarily unavailable', source: 'Atlas', url: '#', image: null, ago: 'now' },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = (searchParams.get('category') || 'geopolitics').toLowerCase()
  const query = CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.geopolitics
  const label = CATEGORY_LABEL[category] ?? 'GLOBAL'

  const gdeltUrl
    = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`${query} sourcelang:english`)}`
      + `&mode=ArtList&maxrecords=24&format=json&sort=DateDesc`

  try {
    const res = await fetch(gdeltUrl, {
      headers: { 'User-Agent': 'ThoughtsMarket-Atlas/1.0' },
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!res.ok) {
      return NextResponse.json({ items: FALLBACK, category })
    }

    const json = (await res.json()) as { articles?: GdeltArticle[] }
    const articles = Array.isArray(json.articles) ? json.articles : []

    const items: FeedItem[] = articles
      .filter(a => a.title && a.url)
      .slice(0, 20)
      .map((a, i) => ({
        id: `${category}-${i}-${a.url.slice(-12)}`,
        category: label,
        title: a.title.trim(),
        source: a.domain ?? 'news',
        url: a.url,
        image: a.socialimage || null,
        ago: relativeFromSeendate(a.seendate),
      }))

    return NextResponse.json({ items: items.length ? items : FALLBACK, category })
  }
  catch {
    return NextResponse.json({ items: FALLBACK, category })
  }
}
