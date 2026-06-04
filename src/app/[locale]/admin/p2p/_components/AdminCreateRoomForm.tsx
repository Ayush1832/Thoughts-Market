'use client'

import { Loader2Icon, PlusIcon } from 'lucide-react'
import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  createRoomAction,
  type CreateRoomActionState,
} from '@/app/[locale]/admin/p2p/_actions/room-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const INITIAL_STATE: CreateRoomActionState = { error: null, success: false }

export default function AdminCreateRoomForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(createRoomAction, INITIAL_STATE)

  useEffect(() => {
    if (state.success) {
      toast.success('Room created.')
      formRef.current?.reset()
    }
    else if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="rounded-lg border p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Create a room</h2>
        <p className="text-sm text-muted-foreground">
          Spin up a new peer-to-peer room. A shareable join code is generated automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div className="grid gap-1.5">
          <Label htmlFor="room-name">Room name</Label>
          <Input
            id="room-name"
            name="name"
            placeholder="e.g. Friday Night Crypto"
            maxLength={60}
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="room-max">Max players</Label>
          <Input
            id="room-max"
            name="max_participants"
            type="number"
            min={2}
            max={500}
            defaultValue={50}
            required
          />
        </div>
      </div>

      <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_private"
          className="size-4 rounded border-input accent-primary"
        />
        <span>Private room (hidden from public lobby)</span>
      </label>

      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending
            ? <Loader2Icon className="size-4 animate-spin" />
            : <PlusIcon className="size-4" />}
          Create room
        </Button>
      </div>
    </form>
  )
}
