'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const MIN_PARTICIPANTS = 3
const MAX_PARTICIPANTS = 50

function generateRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => characters[Math.floor(Math.random() * characters.length)]).join('')
}

export default function FriendPlayLobby({ onClose }: { onClose?: () => void }) {
  const [roomCode, setRoomCode] = useState<string>('')
  const [participants, setParticipants] = useState<string[]>([])
  const [newParticipantName, setNewParticipantName] = useState<string>('')
  const [message, setMessage] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)

  const participantCount = participants.length
  const roomCreated = roomCode.length > 0
  const canAddParticipant = participantCount < MAX_PARTICIPANTS
  const canStartGame = roomCreated && participantCount >= MIN_PARTICIPANTS

  const statusText = useMemo(() => {
    if (!roomCreated) {
      return 'Create a room to invite friends and start playing together.'
    }

    if (participantCount === 0) {
      return 'Room created. Add players to join the lobby.'
    }

    if (participantCount < MIN_PARTICIPANTS) {
      return `Waiting for at least ${MIN_PARTICIPANTS} players. ${MIN_PARTICIPANTS - participantCount} more needed.`
    }

    if (participantCount > MAX_PARTICIPANTS) {
      return `Room is over capacity. Maximum ${MAX_PARTICIPANTS} participants allowed.`
    }

    return `Ready to play! ${participantCount} players in the room.`
  }, [participantCount, roomCreated])

  const handleCreateRoom = () => {
    if (roomCreated) {
      setMessage('A room is already active. You can invite friends with the current room code.')
      return
    }

    setRoomCode(generateRoomCode())
    setParticipants(['You'])
    setHasStarted(false)
    setMessage('Room created successfully. Share the code with friends.')
  }

  const handleAddParticipant = () => {
    const name = newParticipantName.trim()

    if (!roomCreated) {
      setMessage('Please create a room before inviting friends.')
      return
    }

    if (!name) {
      setMessage('Enter a name to add a participant.')
      return
    }

    if (participants.includes(name)) {
      setMessage('That participant already exists in the room.')
      return
    }

    if (!canAddParticipant) {
      setMessage(`Cannot add more than ${MAX_PARTICIPANTS} participants.`)
      return
    }

    setParticipants(prev => [...prev, name])
    setNewParticipantName('')
    setMessage(`${name} joined the room.`)
  }

  const handleStartGame = () => {
    if (!canStartGame) {
      setMessage(`A minimum of ${MIN_PARTICIPANTS} players is required to start.`)
      return
    }

    setHasStarted(true)
    setMessage(`Game started with ${participantCount} players!`)
  }

  const handleLeaveRoom = () => {
    setRoomCode('')
    setParticipants([])
    setNewParticipantName('')
    setHasStarted(false)
    setMessage('Room closed. Create a new room to play again.')
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-muted p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Friends lobby</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Play with friends</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Create a shared room on your dashboard, invite up to 50 people, and start the game once at least 3 have joined.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreateRoom} variant="secondary" size="lg">
            {roomCreated ? 'Room created' : 'Create room'}
          </Button>
          {onClose ? (
            <Button onClick={onClose} variant="outline" size="lg">
              Close
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-border/70 bg-background p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary-foreground">Room code</div>
            <div className="text-sm font-semibold text-foreground">{roomCreated ? roomCode : '—'}</div>
          </div>

          <div className="mb-4 text-sm text-muted-foreground">{statusText}</div>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Invite friend</label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  value={newParticipantName}
                  onChange={event => setNewParticipantName(event.target.value)}
                  placeholder="Friend name"
                  disabled={!roomCreated || hasStarted}
                />
                <Button onClick={handleAddParticipant} disabled={!roomCreated || hasStarted || !canAddParticipant} size="sm">
                  Add
                </Button>
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-foreground dark:bg-slate-950/60">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>Players</span>
                <span>{participantCount}/{MAX_PARTICIPANTS}</span>
              </div>
              <div className="space-y-2">
                {participants.length > 0 ? (
                  participants.map(participant => (
                    <div key={participant} className="rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground">
                      {participant}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
                    No participants yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background p-4">
          <div className="mb-4 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
            Minimum 3 participants is required to start.
            <br />
            Maximum 50 participants can join the room.
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={handleStartGame} disabled={!canStartGame || hasStarted} variant="default" size="lg">
              {hasStarted ? 'Game started' : 'Start game'}
            </Button>
            <Button onClick={handleLeaveRoom} variant="outline" size="lg" disabled={!roomCreated}>
              Close room
            </Button>
          </div>
          {message ? (
            <div className="mt-4 rounded-2xl border border-border/70 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
              {message}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
