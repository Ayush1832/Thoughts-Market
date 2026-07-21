import type { AdminRoomRow } from '@/app/[locale]/admin/p2p/_components/AdminRoomsTable'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import AdminCreateRoomForm from '@/app/[locale]/admin/p2p/_components/AdminCreateRoomForm'
import AdminRoomsTable from '@/app/[locale]/admin/p2p/_components/AdminRoomsTable'
import { verifyAdminSession } from '@/lib/admin-session'
import { RoomsRepository } from '@/lib/db/queries/rooms'
import { UserRepository } from '@/lib/db/queries/user'

function formatCreatedLabel(value: Date | string | null): string {
  if (!value) {
    return '—'
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatCard({ label, value, accent }: { label: string, value: string | number, accent?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? 'text-primary' : ''}`}>{value}</p>
    </div>
  )
}

export default async function AdminP2PPage({ params }: PageProps<'/[locale]/admin/p2p'>) {
  const { locale } = await params
  setRequestLocale(locale)

  // Check for admin session first
  const isAdminAuthenticated = await verifyAdminSession()

  if (!isAdminAuthenticated) {
    // Fall back to wallet-based admin check
    const user = await UserRepository.getCurrentUser({ minimal: true })
    if (!user || !user.is_admin) {
      notFound()
    }
  }

  const { data } = await RoomsRepository.listAllRooms()
  const roomsData = data ?? []

  const rows: AdminRoomRow[] = roomsData.map(room => ({
    id: room.id,
    code: room.code,
    name: room.name,
    status: room.status,
    host: room.host_username || room.host_address || '—',
    participantCount: Number(room.participant_count ?? 0),
    maxParticipants: room.max_participants,
    pot: String(room.pot_amount ?? '0'),
    isPrivate: Boolean(room.is_private),
    createdLabel: formatCreatedLabel(room.created_at),
  }))

  const totalRooms = rows.length
  const openRooms = rows.filter(r => r.status === 'open').length
  const playingRooms = rows.filter(r => r.status === 'playing').length
  const totalPlayers = rows.reduce((sum, r) => sum + r.participantCount, 0)

  return (
    <section className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Peer to Peer</h1>
        <p className="text-sm text-muted-foreground">
          Manage Friends Play rooms — view every room on the platform and create new ones.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total rooms" value={totalRooms} />
        <StatCard label="Open" value={openRooms} accent />
        <StatCard label="In progress" value={playingRooms} />
        <StatCard label="Active players" value={totalPlayers} />
      </div>

      <AdminCreateRoomForm />

      <AdminRoomsTable rows={rows} />
    </section>
  )
}
