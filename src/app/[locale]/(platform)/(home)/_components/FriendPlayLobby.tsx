'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  id: string
  user_id: string
  role: 'host' | 'player'
  username: string | null
  address: string
  image: string | null
  joined_at: string
}

interface Room {
  id: string
  code: string
  name: string
  status: 'open' | 'playing' | 'resolved' | 'cancelled'
  max_participants: number
  pot_amount: string
  host_id: string
  created_at: string
  started_at: string | null
  participant_count?: number
  host_username?: string | null
  participants?: Participant[]
}

interface ChatMessage {
  id: string
  user: string
  avatar: string
  text: string
  time: string
  host?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAT_TABS = ['Discussion', 'Analytics', 'Resolution', 'Invite']

const AI_STATS = [
  { label: 'SENTIMENT', value: 74, display: '74 · Bullish bias on UP', color: 'bg-green-500' },
  { label: 'VOLATILITY', value: 58, display: '58 · Medium', color: 'bg-yellow-400' },
  { label: 'MANIPULATION', value: 12, display: '12 · Low risk', color: 'bg-green-400' },
  { label: 'ENGAGEMENT', value: 84, display: '84 · High', color: 'bg-primary' },
  { label: 'TRENDING SCORE', value: 92, display: '92 · Top 5%', color: 'bg-pink-500' },
]

const AVATAR_COLORS: Record<string, string> = {
  A: 'bg-green-500', B: 'bg-amber-500', C: 'bg-cyan-500', D: 'bg-blue-400',
  E: 'bg-orange-500', F: 'bg-fuchsia-500', G: 'bg-teal-500', H: 'bg-lime-500',
  I: 'bg-indigo-500', J: 'bg-blue-500', K: 'bg-rose-500', L: 'bg-indigo-400',
  M: 'bg-purple-500', N: 'bg-pink-500', O: 'bg-sky-500', P: 'bg-violet-500',
  Q: 'bg-emerald-500', R: 'bg-red-500', S: 'bg-purple-400', T: 'bg-teal-400',
  U: 'bg-cyan-400', V: 'bg-blue-600', W: 'bg-green-600', X: 'bg-slate-500',
  Y: 'bg-yellow-500', Z: 'bg-violet-400',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const AvatarCircle = ({ letter, className }: { letter: string, className?: string }) => (
  <div className={cn(
    'flex items-center justify-center rounded-full text-xs font-bold text-white',
    AVATAR_COLORS[letter.toUpperCase()] ?? 'bg-primary',
    className,
  )}
  >
    {letter.toUpperCase()}
  </div>
)

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FriendPlayLobby({ onClose }: { onClose?: () => void }) {
  // Room list state
  const [rooms, setRooms] = useState<Room[]>([])
  const [publicRooms, setPublicRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [roomDetails, setRoomDetails] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)

  // Create room form
  const [creating, setCreating] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  // Join by code
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  // Room actions
  const [starting, setStarting] = useState(false)
  const [actionError, setActionError] = useState('')

  // Chat
  const [activeTab, setActiveTab] = useState('Discussion')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', user: 'System', avatar: 'S', text: 'Room created. Invite friends with the room code.', time: 'just now' },
  ])
  const [chatInput, setChatInput] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)

  // ── Fetch rooms ─────────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms')
      if (res.ok) {
        const json = await res.json()
        setRooms(json.mine ?? [])
        setPublicRooms(json.public ?? [])
        if (!selectedRoom && json.mine?.length > 0) {
          setSelectedRoom(json.mine[0])
        }
        else if (!selectedRoom && json.public?.length > 0) {
          setSelectedRoom(json.public[0])
        }
      }
    }
    catch {}
    finally {
      setLoading(false)
    }
  }, [selectedRoom])

  useEffect(() => { void fetchRooms() }, [fetchRooms])

  // ── Fetch room details when selected ────────────────────────────────────────
  useEffect(() => {
    if (!selectedRoom) return
    fetch(`/api/rooms/${selectedRoom.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setRoomDetails(d) })
      .catch(() => {})
  }, [selectedRoom?.id])

  // ── Create room ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newRoomName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName.trim() }),
      })
      if (res.ok) {
        const room: Room = await res.json()
        setRooms(prev => [room, ...prev])
        setSelectedRoom(room)
        setNewRoomName('')
        setShowCreate(false)
      }
    }
    catch {}
    finally { setCreating(false) }
  }

  // ── Join by code ─────────────────────────────────────────────────────────────
  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch('/api/rooms/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchRooms()
        setSelectedRoom(data.room)
        setJoinCode('')
      }
      else {
        setJoinError(data.error ?? 'Could not join room')
      }
    }
    catch { setJoinError('Network error') }
    finally { setJoining(false) }
  }

  // ── Leave room ───────────────────────────────────────────────────────────────
  const handleLeave = async () => {
    if (!selectedRoom) return
    await fetch(`/api/rooms/${selectedRoom.id}/leave`, { method: 'POST' })
    setSelectedRoom(null)
    setRoomDetails(null)
    await fetchRooms()
  }

  // ── Start room ───────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!selectedRoom) return
    setStarting(true)
    setActionError('')
    try {
      const res = await fetch(`/api/rooms/${selectedRoom.id}/start`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSelectedRoom(data)
        await fetchRooms()
      }
      else {
        setActionError(data.error ?? 'Could not start room')
      }
    }
    catch { setActionError('Network error') }
    finally { setStarting(false) }
  }

  // ── Chat send ────────────────────────────────────────────────────────────────
  const handleSend = () => {
    const text = chatInput.trim()
    if (!text) return
    setMessages(prev => [...prev, {
      id: Date.now().toString(), user: 'You', avatar: 'Y', text, time: 'just now',
    }])
    setChatInput('')
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), 50)
  }

  const allRooms = [...rooms, ...publicRooms.filter(pr => !rooms.some(r => r.id === pr.id))]
  const currentParticipants = roomDetails?.participants ?? []
  const isLive = selectedRoom?.status === 'playing'

  return (
    <div className="overflow-hidden rounded-3xl border border-border/40 bg-card animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Friends Play</p>
          <h2 className="text-xl font-bold text-foreground">Your rooms</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
            {allRooms.filter(r => r.status === 'open' || r.status === 'playing').length} active
          </span>
          {onClose && <Button onClick={onClose} variant="ghost" size="sm" className="size-7 p-0">✕</Button>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr]">
        {/* ── LEFT: Room list ── */}
        <div className="space-y-2 border-r border-border/40 p-3">
          {/* Create room */}
          {showCreate
            ? (
                <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                  <Input
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    placeholder="Room name..."
                    className="h-8 text-xs"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCreate} size="sm" className="h-7 flex-1 text-xs" disabled={creating || !newRoomName.trim()}>
                      {creating ? 'Creating…' : 'Create'}
                    </Button>
                    <Button onClick={() => setShowCreate(false)} variant="ghost" size="sm" className="h-7 text-xs">Cancel</Button>
                  </div>
                </div>
              )
            : (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="w-full rounded-2xl border-2 border-dashed border-border/50 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  + Create with Thought So
                </button>
              )}

          {/* Join by code */}
          <div className="flex gap-1.5">
            <Input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
              placeholder="Enter room code..."
              className="h-8 font-mono text-xs uppercase"
              maxLength={6}
            />
            <Button onClick={handleJoinByCode} size="sm" className="h-8 shrink-0 text-xs" disabled={joining || !joinCode.trim()}>
              {joining ? '…' : 'Join'}
            </Button>
          </div>
          {joinError && <p className="text-xs text-destructive">{joinError}</p>}

          {/* Room list */}
          {loading
            ? (
                <div className="py-4 text-center text-xs text-muted-foreground">Loading rooms…</div>
              )
            : allRooms.length === 0
              ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">No rooms yet. Create one!</div>
                )
              : allRooms.map(room => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoom(room)}
                  className={cn(
                    'w-full rounded-2xl border p-3 text-left transition-all duration-150',
                    selectedRoom?.id === room.id
                      ? 'border-primary/30 bg-secondary'
                      : 'border-transparent hover:bg-muted/50',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white',
                      room.status === 'playing' ? 'bg-gradient-to-br from-green-500 to-teal-500' : 'bg-gradient-to-br from-primary to-primary/70',
                    )}
                    >
                      {room.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-foreground">{room.name}</p>
                        {room.status === 'playing' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green-400">
                            <span className="size-1.5 animate-pulse rounded-full bg-green-400" />
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-2xs text-muted-foreground">
                        {room.participant_count ?? 0}/{room.max_participants} players · Code:
                        {' '}
                        <span className="font-mono font-semibold">{room.code}</span>
                      </p>
                    </div>
                  </div>
                </button>
              ))}
        </div>

        {/* ── RIGHT: Room detail ── */}
        {selectedRoom
          ? (
              <div className="flex min-h-0 flex-col">
                {/* Room header */}
                <div className="flex items-center gap-3 border-b border-border/40 px-5 py-3">
                  <div>
                    <p className="font-bold text-foreground">{selectedRoom.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        isLive ? 'bg-green-500/15 text-green-400' : 'bg-muted text-muted-foreground',
                      )}
                      >
                        {isLive && <span className="size-1.5 animate-pulse rounded-full bg-green-400" />}
                        {isLive ? 'LIVE · TRADING OPEN' : 'OPEN'}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        Code:
                        {' '}
                        <span className="font-semibold text-foreground">{selectedRoom.code}</span>
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    {selectedRoom.status === 'open' && (
                      <Button
                        onClick={handleStart}
                        size="sm"
                        className="h-7 text-xs"
                        disabled={starting || (currentParticipants.length < 3)}
                      >
                        {starting ? 'Starting…' : 'Start Game'}
                      </Button>
                    )}
                    <Button onClick={handleLeave} variant="destructive" size="sm" className="h-7 text-xs">Leave</Button>
                  </div>
                </div>
                {actionError && <p className="px-5 pt-2 text-xs text-destructive">{actionError}</p>}

                <div className="grid gap-4 p-4 lg:grid-cols-[1fr_200px]">
                  {/* Chat */}
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
                      {CHAT_TABS.map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveTab(tab)}
                          className={cn(
                            'flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
                            activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {tab}
                          {tab === 'Discussion' && messages.length > 0 && (
                            <span className="ml-1 rounded-full bg-primary/20 px-1 text-2xs text-primary">{messages.length}</span>
                          )}
                        </button>
                      ))}
                    </div>

                    {activeTab === 'Discussion' && (
                      <>
                        <div ref={chatRef} className="max-h-44 space-y-3 overflow-y-auto pr-1">
                          {messages.map(msg => (
                            <div key={msg.id} className="flex gap-2.5">
                              <AvatarCircle letter={msg.avatar} className="size-7 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground">
                                    {msg.user}
                                    {msg.host && <span className="ml-1 text-2xs text-primary">(host)</span>}
                                  </span>
                                  <span className="text-2xs text-muted-foreground">{msg.time}</span>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">{msg.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/40 px-3 py-2">
                          <AvatarCircle letter="Y" className="size-6 shrink-0" />
                          <input
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Share your strategy..."
                            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleSend}
                            className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
                          >
                            Post
                          </button>
                        </div>
                      </>
                    )}
                    {activeTab !== 'Discussion' && (
                      <div className="flex h-28 items-center justify-center rounded-xl border border-border/30 text-xs text-muted-foreground">
                        {activeTab} — coming soon
                      </div>
                    )}

                    {/* Participants */}
                    {currentParticipants.length > 0 && (
                      <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
                        <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                          Players (
                          {currentParticipants.length}
                          /
                          {selectedRoom.max_participants}
                          )
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {currentParticipants.map(p => (
                            <div key={p.id} className="flex items-center gap-1.5 rounded-full border border-border/40 bg-card px-2 py-1">
                              <AvatarCircle letter={(p.username ?? p.address)[0] ?? 'U'} className="size-4" />
                              <span className="text-2xs font-medium text-foreground">
                                {p.username ?? `${p.address.slice(0, 6)}…`}
                              </span>
                              {p.role === 'host' && (
                                <span className="text-2xs text-primary">host</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Analysis */}
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-border/40 bg-muted/30 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="size-5 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">Market DNA</p>
                          <p className="text-2xs text-muted-foreground">Live AI analysis</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {AI_STATS.map(stat => (
                          <div key={stat.label}>
                            <div className="mb-0.5 flex items-center justify-between">
                              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground/60">{stat.label}</p>
                              <p className="text-2xs font-semibold text-foreground">{stat.display}</p>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                              <div className={cn('h-full rounded-full', stat.color)} style={{ width: `${stat.value}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 rounded-xl bg-muted/50 p-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">↑ Pool sentiment leans UP.</span>
                        {' '}
                        Consider locking your position.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          : (
              <div className="flex flex-col items-center justify-center gap-3 p-10 text-center text-muted-foreground">
                <p className="text-sm">No room selected</p>
                <p className="text-xs">Create a room or join one with a code to get started.</p>
              </div>
            )}
      </div>
    </div>
  )
}
