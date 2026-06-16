'use client'

import {
  BarChart3Icon,
  CheckCircle2Icon,
  ChevronRightIcon,
  FlameIcon,
  LockIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TargetIcon,
  TrendingUpIcon,
  UserPlusIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
type CreatorTier = 'NEWCOMER' | 'RISING' | 'PRO' | 'ELITE'
type AppMode = 'user' | 'creator'
type CreatorState = 'none' | 'approved'

interface Creator {
  id: string
  username: string
  displayName: string
  avatarGradient: string
  avatarEmoji: string
  tier: CreatorTier
  followers: number
  trustScore: number
  accuracy: number
  volume: string
  niche: string
  bio: string
  isFollowing?: boolean
}

interface CreatorMarket {
  id: string
  creator: Creator
  title: string
  category: string
  yesProb: number
  volume: string
  liquidity: string
  traders: number
  tags: string[]
  isTrending?: boolean
  isNew?: boolean
}

// ─── Static Data ──────────────────────────────────────────────────────────────
const FEATURED_CREATORS: Creator[] = [
  {
    id: 'c1',
    username: 'vee.eth',
    displayName: 'vee.eth',
    avatarGradient: 'from-violet-600 to-purple-400',
    avatarEmoji: '🔮',
    tier: 'ELITE',
    followers: 12840,
    trustScore: 92,
    accuracy: 78,
    volume: '$48.3K',
    niche: 'Crypto',
    bio: 'DeFi analyst & on-chain sleuth',
    isFollowing: true,
  },
  {
    id: 'c2',
    username: 'cryptosage',
    displayName: 'CryptoSage',
    avatarGradient: 'from-blue-600 to-cyan-400',
    avatarEmoji: '⚡',
    tier: 'PRO',
    followers: 8240,
    trustScore: 87,
    accuracy: 71,
    volume: '$32.1K',
    niche: 'Crypto',
    bio: 'BTC maximalist, macro watcher',
  },
  {
    id: 'c3',
    username: 'sportstradez',
    displayName: 'SportsTradez',
    avatarGradient: 'from-green-600 to-emerald-400',
    avatarEmoji: '🏆',
    tier: 'PRO',
    followers: 6180,
    trustScore: 84,
    accuracy: 69,
    volume: '$27.5K',
    niche: 'Sports',
    bio: 'NFL & NBA prediction specialist',
  },
  {
    id: 'c4',
    username: 'polimind',
    displayName: 'PoliMind',
    avatarGradient: 'from-red-500 to-rose-400',
    avatarEmoji: '🎯',
    tier: 'ELITE',
    followers: 19420,
    trustScore: 95,
    accuracy: 82,
    volume: '$91.2K',
    niche: 'Politics',
    bio: 'Political analyst, ex-DC staffer',
  },
]

const RISING_CREATORS: Creator[] = [
  {
    id: 'c5',
    username: 'techwhiz',
    displayName: 'TechWhiz',
    avatarGradient: 'from-sky-500 to-indigo-400',
    avatarEmoji: '🤖',
    tier: 'RISING',
    followers: 1240,
    trustScore: 76,
    accuracy: 64,
    volume: '$8.4K',
    niche: 'Technology',
    bio: 'AI & tech sector predictions',
  },
  {
    id: 'c6',
    username: 'macromonk',
    displayName: 'MacroMonk',
    avatarGradient: 'from-amber-500 to-orange-400',
    avatarEmoji: '📊',
    tier: 'RISING',
    followers: 980,
    trustScore: 72,
    accuracy: 61,
    volume: '$5.2K',
    niche: 'Finance',
    bio: 'Macro economics & Fed watcher',
  },
  {
    id: 'c7',
    username: 'streamking',
    displayName: 'StreamKing',
    avatarGradient: 'from-pink-500 to-rose-400',
    avatarEmoji: '🎮',
    tier: 'RISING',
    followers: 2140,
    trustScore: 78,
    accuracy: 66,
    volume: '$12.1K',
    niche: 'Gaming',
    bio: 'Gaming & esports market maker',
  },
  {
    id: 'c8',
    username: 'lifestylezz',
    displayName: 'Lifestylezz',
    avatarGradient: 'from-fuchsia-500 to-pink-400',
    avatarEmoji: '✨',
    tier: 'NEWCOMER',
    followers: 640,
    trustScore: 68,
    accuracy: 58,
    volume: '$2.8K',
    niche: 'Lifestyle',
    bio: 'Influencer market predictions',
  },
]

const MOCK_MARKETS: CreatorMarket[] = [
  {
    id: 'm1',
    creator: FEATURED_CREATORS[0]!,
    title: 'Will ETH surpass $5,000 before Q2 2025?',
    category: 'Crypto',
    yesProb: 67,
    volume: '$12.4K',
    liquidity: '$3.2K',
    traders: 284,
    tags: ['ETH', 'DeFi'],
    isTrending: true,
  },
  {
    id: 'm2',
    creator: FEATURED_CREATORS[3]!,
    title: 'Will the Fed cut rates in June 2025?',
    category: 'Macro',
    yesProb: 43,
    volume: '$28.1K',
    liquidity: '$8.4K',
    traders: 512,
    tags: ['Fed', 'Rates'],
  },
  {
    id: 'm3',
    creator: RISING_CREATORS[0]!,
    title: 'Will Apple release AR glasses by end of 2025?',
    category: 'Technology',
    yesProb: 31,
    volume: '$5.8K',
    liquidity: '$1.4K',
    traders: 147,
    tags: ['Apple', 'AR'],
    isNew: true,
  },
  {
    id: 'm4',
    creator: FEATURED_CREATORS[1]!,
    title: 'BTC to reach new ATH above $120K this bull run?',
    category: 'Crypto',
    yesProb: 58,
    volume: '$18.9K',
    liquidity: '$5.1K',
    traders: 389,
    tags: ['BTC', 'ATH'],
    isTrending: true,
  },
  {
    id: 'm5',
    creator: FEATURED_CREATORS[2]!,
    title: 'Chiefs to win Super Bowl LX?',
    category: 'Sports',
    yesProb: 22,
    volume: '$9.3K',
    liquidity: '$2.8K',
    traders: 203,
    tags: ['NFL', 'Chiefs'],
  },
  {
    id: 'm6',
    creator: RISING_CREATORS[1]!,
    title: 'US recession declared by end of 2025?',
    category: 'Macro',
    yesProb: 38,
    volume: '$7.2K',
    liquidity: '$2.1K',
    traders: 168,
    tags: ['GDP', 'Recession'],
    isNew: true,
  },
]

const AI_SUGGESTIONS = [
  {
    id: 's1',
    emoji: '🔥',
    title: 'Crypto DeFi',
    desc: 'High demand niche — 18% gap in creator supply. Avg $2.1K volume/market.',
    matchScore: 94,
    colorClass: 'border-orange-500/30 from-orange-500/15 to-amber-500/5',
  },
  {
    id: 's2',
    emoji: '🎯',
    title: 'US Politics 2026',
    desc: 'Election cycle approaching — trending searches up 340% this month.',
    matchScore: 87,
    colorClass: 'border-red-500/30 from-red-500/15 to-rose-500/5',
  },
  {
    id: 's3',
    emoji: '🤖',
    title: 'AI & Technology',
    desc: 'Fastest growing category — 52 new markets in last 7 days.',
    matchScore: 82,
    colorClass: 'border-blue-500/30 from-blue-500/15 to-cyan-500/5',
  },
]

const NICHE_FILTERS = [
  { label: 'All niches', count: '2.4K' },
  { label: 'Instagram', count: '184' },
  { label: 'YouTubers', count: '312' },
  { label: 'Streamers', count: '156' },
  { label: 'Lifestyle', count: '240' },
  { label: 'Technology', count: '198' },
  { label: 'Gaming', count: '276' },
  { label: 'Finance', count: '142' },
  { label: 'Sports', count: '318' },
]

const MARKET_FILTERS = ['All', 'Trending', 'New', 'Ending soon', 'High volume', 'Top accuracy', 'Most followed', 'Private pools']
const CATEGORIES = ['All', 'Crypto', 'Sports', 'Politics', 'Stocks', 'Macro', 'Entertainment', 'Climate']
const CREATOR_TABS = ['Overview', 'Create market', 'Audience', 'Monetization', 'Levels & XP', 'Featured & boards', 'Public profile']

const PRESTIGE_BADGES = [
  { id: 'b1', emoji: '✓', label: 'Verified', desc: 'Identity verified', earned: true, colorClass: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  { id: 'b2', emoji: '🎯', label: 'Sharp Caller', desc: '70%+ resolution accuracy', earned: true, colorClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  { id: 'b3', emoji: '💰', label: '$1K Volume', desc: '$1,000+ lifetime volume', earned: true, colorClass: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  { id: 'b4', emoji: '🔥', label: '30-Day Streak', desc: '30 day activity streak', earned: true, colorClass: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
  { id: 'b5', emoji: '💎', label: '$50K Volume', desc: '$50,000+ lifetime volume', earned: false, colorClass: 'border-tm-border bg-tm-elevated/40 text-tm-secondary/40' },
  { id: 'b6', emoji: '👑', label: 'Elite Tier', desc: 'Reach Elite creator tier', earned: false, colorClass: 'border-tm-border bg-tm-elevated/40 text-tm-secondary/40' },
]

const TOP_MARKETS = [
  { rank: 1, title: 'ETH above $5K by Q2?', volume: '$12.4K', result: 'YES ✓', isWin: true },
  { rank: 2, title: 'BTC new ATH this cycle?', volume: '$8.9K', result: 'YES ✓', isWin: true },
  { rank: 3, title: 'Solana surpass ETH in TVL?', volume: '$6.2K', result: 'NO ✗', isWin: false },
  { rank: 4, title: 'Fed pivot in March 2025?', volume: '$4.8K', result: 'YES ✓', isWin: true },
  { rank: 5, title: 'DOGE above $1 by EOY?', volume: '$3.1K', result: 'NO ✓', isWin: true },
]

const RECENT_ACTIVITY = [
  { id: 'a1', text: 'Market resolved: ETH above $4K?', sub: '+$42.50 earned', time: '2h ago', positive: true },
  { id: 'a2', text: 'cryptobull_22 started following you', sub: '+1 follower', time: '4h ago', positive: true },
  { id: 'a3', text: 'Market created: Will ETH reach $5K?', sub: '0 traders so far', time: '8h ago', positive: null },
  { id: 'a4', text: 'Badge earned: Sharp Caller 🎯', sub: 'You hit 70% accuracy!', time: '1d ago', positive: true },
  { id: 'a5', text: 'Market resolved: SOL TVL flip ETH?', sub: '-$18.00 accuracy penalty', time: '2d ago', positive: false },
]

// ─── Utility ──────────────────────────────────────────────────────────────────
function tierColors(tier: CreatorTier): string {
  if (tier === 'ELITE') {
    return 'text-amber-400 bg-amber-500/15 border-amber-500/40'
  }
  if (tier === 'PRO') {
    return 'text-violet-400 bg-violet-500/15 border-violet-500/40'
  }
  if (tier === 'RISING') {
    return 'text-blue-400 bg-blue-500/15 border-blue-500/40'
  }
  return 'text-tm-secondary bg-tm-elevated border-tm-border'
}

function tierLabel(tier: CreatorTier): string {
  if (tier === 'ELITE') {
    return '👑 ELITE'
  }
  if (tier === 'PRO') {
    return '⚡ PRO CREATOR'
  }
  if (tier === 'RISING') {
    return '📈 RISING'
  }
  return 'NEWCOMER'
}

function categoryColor(cat: string): string {
  if (cat === 'Crypto') {
    return 'bg-amber-500/15 text-amber-400'
  }
  if (cat === 'Sports') {
    return 'bg-green-500/15 text-green-400'
  }
  if (cat === 'Politics') {
    return 'bg-red-500/15 text-red-400'
  }
  if (cat === 'Macro') {
    return 'bg-purple-500/15 text-purple-400'
  }
  return 'bg-blue-500/15 text-blue-400'
}

// ─── Small shared components ──────────────────────────────────────────────────
function TierBadge({ tier, short = false }: { tier: CreatorTier, short?: boolean }) {
  return (
    <span className={cn('rounded-full border px-2 py-0.5 text-2xs font-bold tracking-wide whitespace-nowrap', tierColors(tier))}>
      {short ? tier : tierLabel(tier)}
    </span>
  )
}

function CreatorAvatar({ creator, size = 'md' }: { creator: Creator, size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const s = size === 'xl' ? 'size-16 text-2xl' : size === 'lg' ? 'size-12 text-xl' : size === 'sm' ? 'size-8 text-sm' : 'size-10 text-lg'
  return (
    <div className={cn(`
      flex shrink-0 items-center justify-center rounded-full bg-linear-to-br font-bold ring-2 ring-tm-border
    `, s, creator.avatarGradient)}
    >
      {creator.avatarEmoji}
    </div>
  )
}

// ─── User Mode: Suggested niches ─────────────────────────────────────────────
function SuggestedNicheCard({ item }: { item: typeof AI_SUGGESTIONS[0] }) {
  return (
    <div className={cn(`
      group relative flex min-w-[260px] flex-col gap-3 rounded-2xl border bg-linear-to-br p-4 transition-all
      duration-200
      hover:-translate-y-1 hover:shadow-xl
    `, item.colorClass)}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">{item.emoji}</span>
        <div>
          <div className="text-sm font-bold text-tm-primary">{item.title}</div>
          <div className="flex items-center gap-1 text-2xs font-semibold text-primary">
            <ZapIcon className="size-2.5" />
            AI Match
            {' '}
            {item.matchScore}
            %
          </div>
        </div>
        <div className="
          ml-auto flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary
        "
        >
          {item.matchScore}
        </div>
      </div>
      <p className="text-xs/relaxed text-tm-secondary">{item.desc}</p>
      <button
        type="button"
        className="
          mt-auto flex items-center gap-1 text-xs font-semibold text-primary transition-colors
          hover:text-primary/70
        "
      >
        Explore niche
        <ChevronRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  )
}

// ─── User Mode: Creator spotlight card ───────────────────────────────────────
function SpotlightCard({ creator, onToggleFollow }: { creator: Creator, onToggleFollow: (id: string) => void }) {
  return (
    <div className="
      flex min-w-[220px] flex-col gap-3 rounded-2xl border border-tm-border bg-tm-surface p-4 transition-all
      duration-200
      hover:-translate-y-1 hover:border-[#4f8ef7]/40 hover:shadow-lg hover:shadow-[#4f8ef7]/10
    "
    >
      <div className="flex items-start gap-3">
        <CreatorAvatar creator={creator} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-tm-primary">{creator.displayName}</div>
          <div className="truncate text-[11px] text-tm-secondary">
            @
            {creator.username}
          </div>
        </div>
      </div>
      <TierBadge tier={creator.tier} short />
      <p className="text-[11px] leading-relaxed text-tm-secondary/80">{creator.bio}</p>
      <div className="flex gap-3 text-[11px] text-tm-secondary">
        <span>
          <span className="font-semibold text-tm-primary">{creator.followers.toLocaleString()}</span>
          {' '}
          followers
        </span>
        <span>
          <span className="font-semibold text-tm-primary">{creator.trustScore}</span>
          {' '}
          trust
        </span>
        <span>
          <span className="font-semibold text-tm-primary">
            {creator.accuracy}
            %
          </span>
          {' '}
          acc
        </span>
      </div>
      <button
        type="button"
        onClick={() => onToggleFollow(creator.id)}
        className={cn(
          'w-full rounded-xl py-2 text-xs font-semibold transition-all duration-200',
          creator.isFollowing
            ? 'bg-tm-elevated text-tm-secondary hover:bg-red-500/10 hover:text-red-400'
            : 'bg-primary/10 text-primary hover:bg-primary/20',
        )}
      >
        {creator.isFollowing ? '✓ Following' : '+ Follow'}
      </button>
    </div>
  )
}

// ─── User Mode: Market card ───────────────────────────────────────────────────
function MarketCard({ market }: { market: CreatorMarket }) {
  return (
    <div className="
      flex flex-col gap-3 rounded-2xl border border-tm-border bg-tm-surface p-4 transition-all duration-200
      hover:-translate-y-1 hover:border-[#4f8ef7]/40 hover:shadow-lg hover:shadow-[#4f8ef7]/10
    "
    >
      <div className="flex items-center gap-2">
        <CreatorAvatar creator={market.creator} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-tm-primary">{market.creator.displayName}</div>
          <div className="text-2xs text-tm-secondary">
            @
            {market.creator.username}
          </div>
        </div>
        <span className={cn('rounded-lg px-2 py-0.5 text-2xs font-bold tracking-wide uppercase', categoryColor(market.category))}>
          {market.category}
        </span>
      </div>

      <p className="text-sm/snug font-semibold text-tm-primary">{market.title}</p>

      <div className="flex flex-wrap gap-1">
        {market.tags.map(tag => (
          <span key={tag} className="rounded-full bg-tm-elevated px-2 py-0.5 text-2xs text-tm-secondary">
            #
            {tag}
          </span>
        ))}
        {market.isTrending && (
          <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-2xs font-semibold text-orange-400">
            🔥 Trending
          </span>
        )}
        {market.isNew && (
          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-2xs font-semibold text-blue-400">
            ✨ New
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-yes-foreground">
            YES
            {' '}
            {market.yesProb}
            %
          </span>
          <span className="text-no-foreground">
            NO
            {' '}
            {100 - market.yesProb}
            %
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-no/20">
          <div className="h-full rounded-full bg-yes transition-all" style={{ width: `${market.yesProb}%` }} />
        </div>
      </div>

      <div className="flex justify-between text-[11px] text-tm-secondary">
        <span>
          Vol:
          {' '}
          <span className="font-semibold text-tm-primary">{market.volume}</span>
        </span>
        <span>
          Liq:
          {' '}
          <span className="font-semibold text-tm-primary">{market.liquidity}</span>
        </span>
        <span>
          <span className="font-semibold text-tm-primary">{market.traders}</span>
          {' '}
          traders
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="
            flex-1 rounded-xl bg-yes/15 py-2 text-xs font-bold text-yes-foreground transition-all
            hover:-translate-y-px hover:bg-yes/25 hover:shadow-md hover:shadow-yes/20
          "
        >
          Trade YES
        </button>
        <button
          type="button"
          className="
            flex-1 rounded-xl bg-no/15 py-2 text-xs font-bold text-no-foreground transition-all
            hover:-translate-y-px hover:bg-no/25 hover:shadow-md hover:shadow-no/20
          "
        >
          NO
          {' '}
          {100 - market.yesProb}
          %
        </button>
        <button
          type="button"
          className="
            flex items-center justify-center rounded-xl border border-tm-border bg-tm-elevated px-3 text-sm font-bold
            text-tm-secondary transition-all
            hover:bg-primary/10 hover:text-primary
          "
        >
          +
        </button>
      </div>
    </div>
  )
}

// ─── User Mode: Spotlight row ─────────────────────────────────────────────────
function SpotlightRow({
  label,
  icon,
  creators,
  onToggleFollow,
}: {
  label: string
  icon: React.ReactNode
  creators: Creator[]
  onToggleFollow: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h3 className="text-xs font-bold tracking-[1.5px] text-tm-secondary/70 uppercase">{label}</h3>
        <span className="rounded-full bg-tm-elevated px-2 py-0.5 text-2xs font-semibold text-tm-secondary">
          {creators.length}
        </span>
        <button
          type="button"
          className="ml-auto flex items-center gap-0.5 text-[11px] text-primary hover:text-primary/70"
        >
          See all
          <ChevronRightIcon className="size-3" />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {creators.map(c => (
          <SpotlightCard key={c.id} creator={c} onToggleFollow={onToggleFollow} />
        ))}
      </div>
    </div>
  )
}

// ─── User Mode View ───────────────────────────────────────────────────────────
function UserModeView({ onSwitchToCreator }: { onSwitchToCreator: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNiche, setSelectedNiche] = useState('All niches')
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [creators, setCreators] = useState([...FEATURED_CREATORS, ...RISING_CREATORS])

  function handleToggleFollow(id: string) {
    setCreators(prev =>
      prev.map(c => c.id === id ? { ...c, isFollowing: !c.isFollowing } : c),
    )
  }

  const resolvedFeatured = creators.filter(c => ['c1', 'c2', 'c3', 'c4'].includes(c.id))
  const resolvedRising = creators.filter(c => ['c5', 'c6', 'c7', 'c8'].includes(c.id))
  const resolvedYouFollow = creators.filter(c => c.isFollowing)

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-tm-secondary/60" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search creators, markets, niches, tags..."
          className="
            w-full rounded-2xl border border-tm-border bg-tm-surface py-3 pr-4 pl-11 text-sm text-tm-primary
            transition-colors
            placeholder:text-tm-secondary/40
            focus:border-[#4f8ef7]/50 focus:ring-2 focus:ring-[#4f8ef7]/15 focus:outline-none
          "
        />
      </div>

      {/* Niche filter pills */}
      <div className="space-y-2">
        <p className="text-2xs font-bold tracking-[1.8px] text-tm-secondary/50 uppercase">Creator Niche</p>
        <div className="flex flex-wrap gap-2">
          {NICHE_FILTERS.map(f => (
            <button
              key={f.label}
              type="button"
              onClick={() => setSelectedNiche(f.label)}
              className={cn(
                `
                  flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all
                  duration-200
                `,
                selectedNiche === f.label
                  ? 'border-primary/40 bg-primary/15 text-primary shadow-sm shadow-primary/20'
                  : `
                    border-tm-border bg-tm-surface text-tm-secondary
                    hover:border-tm-border/80 hover:bg-tm-elevated hover:text-tm-primary
                  `,
              )}
            >
              {f.label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold', selectedNiche === f.label
                ? `bg-primary/20 text-primary`
                : `bg-tm-elevated text-tm-secondary/60`)}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Market filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MARKET_FILTERS.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedFilter(f)}
              className={cn(
                'shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                selectedFilter === f
                  ? 'border-[#4f8ef7]/40 bg-[#4f8ef7]/15 text-[#4f8ef7]'
                  : 'border-tm-border bg-tm-surface text-tm-secondary hover:bg-tm-elevated hover:text-tm-primary',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all duration-200',
                selectedCategory === cat
                  ? 'bg-tm-primary text-tm-surface'
                  : 'bg-tm-elevated text-tm-secondary hover:bg-tm-border hover:text-tm-primary',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Suggested for you */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-primary" />
          <h3 className="text-xs font-bold tracking-[1.5px] text-tm-secondary/70 uppercase">Suggested for you</h3>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-2xs font-bold text-primary">AI curated</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {AI_SUGGESTIONS.map(s => <SuggestedNicheCard key={s.id} item={s} />)}
        </div>
      </div>

      {/* Creator Spotlight */}
      <div className="space-y-6 rounded-2xl border border-tm-border bg-tm-surface/50 p-5">
        <div className="flex items-center gap-2">
          <StarIcon className="size-4 text-amber-400" />
          <h2 className="text-sm font-bold tracking-wide text-tm-primary">Creator Spotlight</h2>
        </div>

        <SpotlightRow label="Featured" icon="⭐" creators={resolvedFeatured} onToggleFollow={handleToggleFollow} />
        <div className="border-t border-tm-border" />
        <SpotlightRow label="Rising" icon="📈" creators={resolvedRising} onToggleFollow={handleToggleFollow} />
        <div className="border-t border-tm-border" />
        <SpotlightRow label="Elite" icon="👑" creators={resolvedFeatured.filter(c => c.tier === 'ELITE')} onToggleFollow={handleToggleFollow} />
        {resolvedYouFollow.length > 0 && (
          <>
            <div className="border-t border-tm-border" />
            <SpotlightRow label="You Follow" icon="❤️" creators={resolvedYouFollow} onToggleFollow={handleToggleFollow} />
          </>
        )}
      </div>

      {/* All creator markets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide text-tm-primary">All creator markets</h2>
          <span className="text-xs text-tm-secondary">
            {MOCK_MARKETS.length}
            {' '}
            markets
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MOCK_MARKETS.map(m => <MarketCard key={m.id} market={m} />)}
        </div>
      </div>

      {/* Become a creator CTA */}
      <div className="
        relative overflow-hidden rounded-2xl border border-primary/30 bg-linear-to-br from-primary/10 to-violet-500/5
        p-6
      "
      >
        <div className="absolute -top-8 -right-8 size-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-2xl">
            ✨
          </div>
          <div className="flex-1">
            <div className="font-bold text-tm-primary">Ready to create your own markets?</div>
            <div className="text-sm text-tm-secondary">Join 840+ creators earning from prediction markets</div>
          </div>
          <button
            type="button"
            onClick={onSwitchToCreator}
            className="
              flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg
              shadow-primary/30 transition-all duration-200
              hover:-translate-y-px hover:shadow-xl hover:shadow-primary/40
            "
          >
            <UserPlusIcon className="size-4" />
            Become a Creator
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Creator Mode: Application Form ──────────────────────────────────────────
const NICHE_OPTIONS = ['Crypto', 'Sports', 'Politics', 'Finance', 'Technology', 'Entertainment', 'Gaming', 'Lifestyle', 'Other']

function ApplicationForm({ onSubmit }: { onSubmit: () => void }) {
  const [form, setForm] = useState({ displayName: '', username: '', niche: '', social: '', reason: '' })
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!agreed) {
      return
    }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1800))
    onSubmit()
  }

  const canProceed = form.displayName.trim().length >= 2 && form.username.trim().length >= 3 && form.niche

  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <div className="mb-8 space-y-2 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-3xl">
          ✨
        </div>
        <h2 className="text-2xl font-bold text-tm-primary">Apply to become a Creator</h2>
        <p className="text-sm text-tm-secondary">
          Fill in the details below to create your creator profile and start publishing prediction markets.
        </p>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-2">
          {[1, 2].map(s => (
            <div
              key={s}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                step >= s ? 'w-8 bg-primary' : 'w-4 bg-tm-border',
              )}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-tm-secondary uppercase">
                Display Name *
              </label>
              <input
                type="text"
                placeholder="e.g. CryptoSage"
                value={form.displayName}
                onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
                className="
                  w-full rounded-xl border border-tm-border bg-tm-surface px-4 py-3 text-sm text-tm-primary
                  transition-colors
                  placeholder:text-tm-secondary/40
                  focus:border-primary/50 focus:ring-2 focus:ring-primary/15 focus:outline-none
                "
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-tm-secondary uppercase">
                Username / Handle *
              </label>
              <div className="relative">
                <span className="absolute top-1/2 left-4 -translate-y-1/2 text-sm font-medium text-tm-secondary/60">@</span>
                <input
                  type="text"
                  placeholder="yourhandle"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') }))}
                  className="
                    w-full rounded-xl border border-tm-border bg-tm-surface py-3 pr-4 pl-8 text-sm text-tm-primary
                    transition-colors
                    placeholder:text-tm-secondary/40
                    focus:border-primary/50 focus:ring-2 focus:ring-primary/15 focus:outline-none
                  "
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-tm-secondary uppercase">
                Primary Niche *
              </label>
              <div className="flex flex-wrap gap-2">
                {NICHE_OPTIONS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, niche: n }))}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
                      form.niche === n
                        ? 'border-primary/40 bg-primary/15 text-primary'
                        : 'border-tm-border bg-tm-surface text-tm-secondary hover:bg-tm-elevated hover:text-tm-primary',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!canProceed}
              onClick={() => setStep(2)}
              className="
                w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25
                transition-all duration-200
                hover:-translate-y-px hover:shadow-xl hover:shadow-primary/35
                disabled:cursor-not-allowed disabled:opacity-40
                disabled:hover:translate-y-0
              "
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-tm-secondary uppercase">
                Social media / portfolio link
              </label>
              <input
                type="url"
                placeholder="https://twitter.com/yourhandle"
                value={form.social}
                onChange={e => setForm(p => ({ ...p, social: e.target.value }))}
                className="
                  w-full rounded-xl border border-tm-border bg-tm-surface px-4 py-3 text-sm text-tm-primary
                  transition-colors
                  placeholder:text-tm-secondary/40
                  focus:border-primary/50 focus:ring-2 focus:ring-primary/15 focus:outline-none
                "
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide text-tm-secondary uppercase">
                Why do you want to become a creator? *
              </label>
              <textarea
                placeholder="Tell us about your expertise, what markets you'd create, and how you'd engage your audience..."
                value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                rows={4}
                className="
                  w-full resize-none rounded-xl border border-tm-border bg-tm-surface px-4 py-3 text-sm text-tm-primary
                  transition-colors
                  placeholder:text-tm-secondary/40
                  focus:border-primary/50 focus:ring-2 focus:ring-primary/15 focus:outline-none
                "
                required
              />
            </div>

            {/* Terms */}
            <label className="
              flex cursor-pointer items-start gap-3 rounded-xl border border-tm-border bg-tm-elevated/50 p-4
            "
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-xs/relaxed text-tm-secondary">
                I agree to the
                {' '}
                <span className="text-primary">Creator Terms of Service</span>
                {' '}
                and understand that I am responsible for the accuracy and resolution of all markets I create.
              </span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="
                  rounded-xl border border-tm-border bg-tm-surface px-5 py-3 text-sm font-semibold text-tm-secondary
                  hover:bg-tm-elevated hover:text-tm-primary
                "
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={!agreed || !form.reason.trim() || submitting}
                className="
                  flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold
                  text-white shadow-lg shadow-primary/25 transition-all duration-200
                  hover:-translate-y-px hover:shadow-xl hover:shadow-primary/35
                  disabled:cursor-not-allowed disabled:opacity-40
                  disabled:hover:translate-y-0
                "
              >
                {submitting
                  ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Creating your profile...
                      </>
                    )
                  : '🚀 Submit Application'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

// ─── Creator Mode: Dashboard Overview ────────────────────────────────────────
function CreatorDashboard({ displayName, username }: { displayName: string, username: string }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const xpCurrent = 18420
  const xpTarget = 50000
  const xpPercent = Math.round((xpCurrent / xpTarget) * 100)

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-2xl border border-tm-border bg-tm-surface">
        {/* Background gradient */}
        <div className="h-24 bg-linear-to-br from-violet-600/30 via-purple-500/20 to-blue-600/10" />

        <div className="relative px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-10 mb-4 inline-block">
            <div className="
              flex size-20 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-purple-400
              text-4xl font-bold ring-4 ring-tm-surface
            "
            >
              🔮
            </div>
            <div className="absolute -right-1 -bottom-1 rounded-full bg-emerald-500 p-1">
              <ShieldCheckIcon className="size-3 text-white" />
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-tm-primary">{displayName || 'vee.eth'}</h2>
                <TierBadge tier="PRO" />
              </div>
              <div className="text-sm text-tm-secondary">
                @
                {username || 'vee.eth'}
                {' '}
                · DeFi analyst & on-chain sleuth
              </div>
              <div className="flex flex-wrap gap-4 pt-1 text-sm text-tm-secondary">
                <span>
                  <span className="font-bold text-tm-primary">12,840</span>
                  {' '}
                  followers
                </span>
                <span>
                  <span className="font-bold text-tm-primary">92</span>
                  {' '}
                  trust score
                </span>
                <span>
                  Rank
                  {' '}
                  <span className="font-bold text-tm-primary">#142</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              className="
                rounded-xl border border-tm-border bg-tm-elevated px-4 py-2 text-sm font-medium text-tm-secondary
                hover:bg-tm-elevated/80 hover:text-tm-primary
              "
            >
              Edit profile
            </button>
          </div>

          {/* XP Progress */}
          <div className="mt-5 space-y-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-violet-400">
                {xpPercent}
                % TO ELITE CREATOR
              </span>
              <span className="text-tm-secondary">
                {xpCurrent.toLocaleString()}
                {' '}
                /
                {' '}
                {xpTarget.toLocaleString()}
                {' '}
                XP to Elite Creator
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-tm-elevated">
              <div
                className="
                  h-full rounded-full bg-linear-to-r from-violet-500 to-purple-400 shadow-sm shadow-violet-500/50
                  transition-all duration-700
                "
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-tm-border bg-tm-surface p-1.5">
        {CREATOR_TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'shrink-0 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200',
              activeTab === tab
                ? 'bg-tm-elevated text-tm-primary shadow-sm'
                : 'text-tm-secondary hover:text-tm-primary',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Total Volume Generated', value: '$48.3K', icon: <BarChart3Icon className="size-4" />, accent: 'text-[#4f8ef7] bg-[#4f8ef7]/10 border-[#4f8ef7]/20' },
              { label: 'Creator Earnings', value: '$1,247.50', icon: <ZapIcon className="size-4" />, accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Active Markets', value: '23', icon: <TargetIcon className="size-4" />, accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
              { label: 'Resolution Accuracy', value: '67%', icon: <TrendingUpIcon className="size-4" />, accent: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={cn(`
                  flex flex-col gap-2 rounded-2xl border p-4 transition-all duration-300
                  hover:-translate-y-0.5
                `, stat.accent)}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={cn('flex size-8 items-center justify-center rounded-xl', stat.accent)}>
                  {stat.icon}
                </div>
                <div className="text-xs font-semibold tracking-wide text-tm-secondary/80">{stat.label}</div>
                <div className="text-xl font-bold text-tm-primary">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Bottom row: Top markets + Recent activity */}
          <div className="grid gap-4 xl:grid-cols-2">
            {/* Top markets */}
            <div className="rounded-2xl border border-tm-border bg-tm-surface p-5">
              <div className="mb-4 flex items-center gap-2">
                <StarIcon className="size-4 text-amber-400" />
                <h3 className="text-sm font-bold text-tm-primary">Your top markets</h3>
              </div>
              <div className="space-y-3">
                {TOP_MARKETS.map(m => (
                  <div
                    key={m.rank}
                    className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-tm-elevated"
                  >
                    <span className="
                      flex size-6 shrink-0 items-center justify-center rounded-full bg-tm-elevated text-2xs font-bold
                      text-tm-secondary
                    "
                    >
                      {m.rank}
                    </span>
                    <span className="flex-1 truncate text-xs text-tm-primary">{m.title}</span>
                    <span className="shrink-0 text-xs font-semibold text-tm-secondary">{m.volume}</span>
                    <span className={cn('shrink-0 text-2xs font-bold', m.isWin ? 'text-emerald-400' : 'text-red-400')}>
                      {m.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-2xl border border-tm-border bg-tm-surface p-5">
              <div className="mb-4 flex items-center gap-2">
                <FlameIcon className="size-4 text-orange-400" />
                <h3 className="text-sm font-bold text-tm-primary">Recent activity</h3>
              </div>
              <div className="space-y-3">
                {RECENT_ACTIVITY.map(a => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-tm-elevated"
                  >
                    <div className={cn(
                      'mt-0.5 size-1.5 shrink-0 rounded-full',
                      a.positive === true
                        ? 'bg-emerald-400'
                        : a.positive === false
                          ? 'bg-red-400'
                          : `bg-tm-secondary/40`,
                    )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-tm-primary">{a.text}</div>
                      <div className={cn('text-2xs', a.positive === true
                        ? 'text-emerald-400'
                        : a.positive === false
                          ? `text-red-400`
                          : `text-tm-secondary/60`)}
                      >
                        {a.sub}
                      </div>
                    </div>
                    <span className="shrink-0 text-2xs text-tm-secondary/50">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prestige Badges */}
          <div className="rounded-2xl border border-tm-border bg-tm-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-[#4f8ef7]" />
              <h3 className="text-sm font-bold text-tm-primary">Prestige badges</h3>
              <span className="rounded-full bg-tm-elevated px-2 py-0.5 text-2xs font-semibold text-tm-secondary">
                {PRESTIGE_BADGES.filter(b => b.earned).length}
                /
                {PRESTIGE_BADGES.length}
                {' '}
                earned
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PRESTIGE_BADGES.map(b => (
                <div
                  key={b.id}
                  className={cn(
                    `
                      relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all
                      duration-200
                    `,
                    b.earned ? 'hover:-translate-y-0.5 hover:shadow-lg' : 'opacity-60',
                    b.colorClass,
                  )}
                >
                  {!b.earned && (
                    <div className="absolute top-2 right-2">
                      <LockIcon className="size-3 text-tm-secondary/40" />
                    </div>
                  )}
                  {b.earned && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2Icon className="size-3 text-emerald-400" />
                    </div>
                  )}
                  <span className="text-2xl">{b.emoji}</span>
                  <div>
                    <div className="text-xs font-bold">{b.label}</div>
                    <div className="text-2xs text-tm-secondary/70">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'Overview' && (
        <div className="
          flex flex-col items-center justify-center rounded-2xl border border-dashed border-tm-border bg-tm-surface/50
          py-16 text-center
        "
        >
          <div className="mb-3 text-4xl">🚧</div>
          <div className="font-semibold text-tm-primary">{activeTab}</div>
          <div className="mt-1 text-sm text-tm-secondary">Coming soon — this section is being built.</div>
        </div>
      )}
    </div>
  )
}

// ─── Creator Mode View ────────────────────────────────────────────────────────
interface CreatorProfile { state: CreatorState, displayName: string, username: string }

function readCreatorProfile(): CreatorProfile {
  const empty: CreatorProfile = { state: 'none', displayName: '', username: '' }
  if (typeof window === 'undefined') {
    return empty
  }
  try {
    const saved = localStorage.getItem('creator-profile')
    if (!saved) {
      return empty
    }
    return JSON.parse(saved) as CreatorProfile
  }
  catch {
    return empty
  }
}

function CreatorModeView() {
  const [profile, setProfile] = useState<CreatorProfile>(readCreatorProfile)

  function handleApproved(displayName?: string, username?: string) {
    const next: CreatorProfile = { state: 'approved', displayName: displayName ?? '', username: username ?? '' }
    try {
      localStorage.setItem('creator-profile', JSON.stringify(next))
    }
    catch {}
    setProfile(next)
  }

  if (profile.state === 'none') {
    return (
      <div className="py-4">
        <ApplicationForm onSubmit={() => handleApproved()} />
      </div>
    )
  }

  return <CreatorDashboard displayName={profile.displayName} username={profile.username} />
}

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader({ mode, onSetMode }: { mode: AppMode, onSetMode: (m: AppMode) => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-lg">
          ✨
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-wide text-tm-primary">CREATORS CORNER</h1>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-2xs font-bold tracking-wider text-primary">NEW</span>
          </div>
          <p className="text-xs text-tm-secondary">
            {mode === 'user' ? 'Discover creator markets and follow top prediction makers' : 'Create and monetize prediction markets'}
          </p>
        </div>
      </div>

      <div className="flex overflow-hidden rounded-xl border border-tm-border bg-tm-surface">
        <button
          type="button"
          onClick={() => onSetMode('creator')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all duration-200',
            mode === 'creator'
              ? 'bg-tm-elevated text-tm-primary'
              : 'text-tm-secondary hover:text-tm-primary',
          )}
        >
          <SparklesIcon className="size-3" />
          Creator Mode
        </button>
        <div className="w-px bg-tm-border" />
        <button
          type="button"
          onClick={() => onSetMode('user')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all duration-200',
            mode === 'user'
              ? 'bg-tm-elevated text-tm-primary'
              : 'text-tm-secondary hover:text-tm-primary',
          )}
        >
          <UsersIcon className="size-3" />
          User Mode
        </button>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function CreatorsCornerClient() {
  const [mode, setMode] = useState<AppMode>('user')

  return (
    <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
      <PageHeader mode={mode} onSetMode={setMode} />

      <div className="border-t border-tm-border" />

      {mode === 'user'
        ? <UserModeView onSwitchToCreator={() => setMode('creator')} />
        : <CreatorModeView />}
    </div>
  )
}
