'use client'

import { Loader2Icon, LockIcon, Trash2Icon } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { deleteRoomAction } from '@/app/[locale]/admin/p2p/_actions/room-actions'
import { useRouter } from '@/i18n/navigation'
import { tableHeaderClass } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface AdminRoomRow {
  id: string
  code: string
  name: string
  status: string
  host: string
  participantCount: number
  maxParticipants: number
  pot: string
  isPrivate: boolean
  createdLabel: string
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-500/15 text-green-400',
  playing: 'bg-amber-500/15 text-amber-400',
  resolved: 'bg-sky-500/15 text-sky-400',
  cancelled: 'bg-red-500/15 text-red-400',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
      STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground',
    )}
    >
      {status === 'open' && <span className="size-1.5 animate-pulse rounded-full bg-green-400" />}
      {status}
    </span>
  )
}

function DeleteRoomButton({ roomId, roomName }: { roomId: string, roomName: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    // eslint-disable-next-line no-alert -- no confirm-dialog primitive exists in this codebase yet
    if (!window.confirm(`Delete room "${roomName}"? This cannot be undone.`)) {
      return
    }

    startTransition(async () => {
      const { error } = await deleteRoomAction(roomId)
      if (error) {
        toast.error(error)
        return
      }
      toast.success('Room deleted.')
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Delete room"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors',
        'hover:bg-red-500/15 hover:text-red-400 disabled:pointer-events-none disabled:opacity-50',
      )}
    >
      {isPending
        ? <Loader2Icon className="size-4 animate-spin" />
        : <Trash2Icon className="size-4" />}
    </button>
  )
}

export default function AdminRoomsTable({ rows }: { rows: AdminRoomRow[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="text-sm text-muted-foreground">No peer-to-peer rooms yet. Create one above to get started.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <div className="border-b p-4 md:px-6">
        <h2 className="text-xl font-semibold">All rooms</h2>
        <p className="text-sm text-muted-foreground">Every peer-to-peer room across the platform, newest first.</p>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y">
          <thead>
            <tr>
              <th className={cn(tableHeaderClass, 'px-6 text-left')}>Room</th>
              <th className={cn(tableHeaderClass, 'px-6 text-left')}>Code</th>
              <th className={cn(tableHeaderClass, 'px-6 text-left')}>Host</th>
              <th className={cn(tableHeaderClass, 'px-6 text-right')}>Players</th>
              <th className={cn(tableHeaderClass, 'px-6 text-left')}>Status</th>
              <th className={cn(tableHeaderClass, 'px-6 text-right')}>Pot</th>
              <th className={cn(tableHeaderClass, 'px-6 text-left')}>Created</th>
              <th className={cn(tableHeaderClass, 'px-6 text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b last:border-b-0">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {row.isPrivate && <LockIcon className="size-3.5 text-muted-foreground" aria-label="Private" />}
                    <span className="truncate">{row.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs tracking-wider text-muted-foreground">{row.code}</td>
                <td className="px-6 py-4 text-sm">{row.host}</td>
                <td className="px-6 py-4 text-right text-sm tabular-nums">
                  {row.participantCount}
                  <span className="text-muted-foreground">
                    /
                    {row.maxParticipants}
                  </span>
                </td>
                <td className="px-6 py-4"><StatusBadge status={row.status} /></td>
                <td className="px-6 py-4 text-right text-sm tabular-nums">{row.pot}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{row.createdLabel}</td>
                <td className="px-6 py-4 text-right">
                  <DeleteRoomButton roomId={row.id} roomName={row.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y md:hidden">
        {rows.map(row => (
          <div key={row.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {row.isPrivate && <LockIcon className="size-3.5 text-muted-foreground" />}
                  <span className="truncate">{row.name}</span>
                </div>
                <p className="font-mono text-xs tracking-wider text-muted-foreground">{row.code}</p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Host</p>
                <p className="truncate font-medium">{row.host}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Players</p>
                <p className="font-medium tabular-nums">
                  {row.participantCount}
                  /
                  {row.maxParticipants}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Pot</p>
                <p className="font-medium tabular-nums">{row.pot}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{row.createdLabel}</span>
              <DeleteRoomButton roomId={row.id} roomName={row.name} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
