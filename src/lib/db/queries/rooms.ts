import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm'
import { users } from '@/lib/db/schema/auth/tables'
import { room_participants, rooms } from '@/lib/db/schema/rooms/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Open rooms that are never started expire after this long and get removed.
export const ROOM_EXPIRY_MINUTES = 24 * 60 // 24 hours

export const RoomsRepository = {
  // Delete stale, never-started rooms (participants cascade via FK).
  async cleanupExpiredRooms() {
    return runQuery(async () => {
      await db.delete(rooms).where(and(
        eq(rooms.status, 'open'),
        lt(rooms.created_at, sql`now() - interval '${sql.raw(String(ROOM_EXPIRY_MINUTES))} minutes'`),
      ))
      return { data: true, error: null }
    })
  },

  // Host removes a player from a room (sets left_at).
  async kickParticipant(roomId: string, hostId: string, targetUserId: string) {
    return runQuery(async () => {
      const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1)
      if (!room) { return { data: null, error: 'Room not found' } }
      if (room.host_id !== hostId) { return { data: null, error: 'Only the host can remove players' } }
      if (targetUserId === hostId) { return { data: null, error: 'The host cannot be removed' } }

      await db.update(room_participants)
        .set({ left_at: new Date() })
        .where(and(
          eq(room_participants.room_id, roomId),
          eq(room_participants.user_id, targetUserId),
          isNull(room_participants.left_at),
        ))
      return { data: true, error: null }
    })
  },

  async createRoom(hostId: string, name: string, maxParticipants = 50, isPrivate = false, question?: string) {
    return runQuery(async () => {
      const code = generateRoomCode()
      const [room] = await db.insert(rooms).values({
        code,
        name,
        host_id: hostId,
        max_participants: maxParticipants,
        is_private: isPrivate,
        metadata: question ? { question } : {},
      }).returning()

      if (!room) { return { data: null, error: 'Failed to create room' } }

      // Auto-join host as participant
      await db.insert(room_participants).values({
        room_id: room.id,
        user_id: hostId,
        role: 'host',
      })

      return { data: room, error: null }
    })
  },

  async joinRoom(roomId: string, userId: string) {
    return runQuery(async () => {
      const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1)
      if (!room) { return { data: null, error: 'Room not found' } }
      if (room.status !== 'open') { return { data: null, error: 'Room is not open for joining' } }

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(room_participants)
        .where(and(eq(room_participants.room_id, roomId), isNull(room_participants.left_at)))

      const count = countResult[0]?.count ?? 0
      if (count >= room.max_participants) { return { data: null, error: 'Room is full' } }

      const [participant] = await db.insert(room_participants)
        .values({ room_id: roomId, user_id: userId, role: 'player' })
        .onConflictDoUpdate({
          target: [room_participants.room_id, room_participants.user_id],
          set: { left_at: null },
        })
        .returning()

      return { data: participant, error: null }
    })
  },

  async leaveRoom(roomId: string, userId: string) {
    return runQuery(async () => {
      await db.update(room_participants)
        .set({ left_at: new Date() })
        .where(and(
          eq(room_participants.room_id, roomId),
          eq(room_participants.user_id, userId),
        ))
      return { data: true, error: null }
    })
  },

  async startRoom(roomId: string, hostId: string) {
    return runQuery(async () => {
      const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1)
      if (!room) { return { data: null, error: 'Room not found' } }
      if (room.host_id !== hostId) { return { data: null, error: 'Only the host can start the room' } }
      if (room.status !== 'open') { return { data: null, error: 'Room is already started or closed' } }

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(room_participants)
        .where(and(eq(room_participants.room_id, roomId), isNull(room_participants.left_at)))

      if ((countResult[0]?.count ?? 0) < 3) { return { data: null, error: 'Need at least 3 participants to start' } }

      const [updated] = await db.update(rooms)
        .set({ status: 'playing', started_at: new Date() })
        .where(eq(rooms.id, roomId))
        .returning()

      return { data: updated, error: null }
    })
  },

  // Place / add to a Yes or No bet (parimutuel pool). Players commit to one side.
  async placeBet(roomId: string, userId: string, choice: 'yes' | 'no', amount: number) {
    return runQuery(async () => {
      const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1)
      if (!room) { return { data: null, error: 'Room not found' } }
      if (room.status !== 'open' && room.status !== 'playing') { return { data: null, error: 'Betting is closed for this room' } }
      if (!Number.isFinite(amount) || amount <= 0) { return { data: null, error: 'Enter a valid amount' } }

      const [participant] = await db.select().from(room_participants)
        .where(and(
          eq(room_participants.room_id, roomId),
          eq(room_participants.user_id, userId),
          isNull(room_participants.left_at),
        ))
        .limit(1)
      if (!participant) { return { data: null, error: 'Join the room before betting' } }

      const prevChoice = participant.outcome_choice
      const prevStake = Number(participant.stake_amount ?? 0)
      if (prevChoice && prevChoice !== choice && prevStake > 0) {
        return { data: null, error: `You already bet ${prevChoice.toUpperCase()}. You can only add to that side.` }
      }
      const newStake = (prevChoice === choice ? prevStake : 0) + amount

      await db.update(room_participants)
        .set({ outcome_choice: choice, stake_amount: String(newStake) })
        .where(eq(room_participants.id, participant.id))
      return { data: { choice, stake: newStake }, error: null }
    })
  },

  // Host resolves the market; winning side splits the whole pool proportionally.
  async resolveRoom(roomId: string, hostId: string, outcome: 'yes' | 'no') {
    return runQuery(async () => {
      const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1)
      if (!room) { return { data: null, error: 'Room not found' } }
      if (room.host_id !== hostId) { return { data: null, error: 'Only the host can resolve the market' } }
      if (room.status === 'resolved') { return { data: null, error: 'This room is already resolved' } }

      const parts = await db.select().from(room_participants)
        .where(and(eq(room_participants.room_id, roomId), isNull(room_participants.left_at)))

      let poolYes = 0, poolNo = 0
      for (const p of parts) {
        const s = Number(p.stake_amount ?? 0)
        if (s <= 0) { continue }
        if (p.outcome_choice === 'yes') { poolYes += s }
        else if (p.outcome_choice === 'no') { poolNo += s }
      }
      const total = poolYes + poolNo
      const winPool = outcome === 'yes' ? poolYes : poolNo

      for (const p of parts) {
        const stake = Number(p.stake_amount ?? 0)
        let payout = 0
        if (stake > 0) {
          if (winPool === 0) { payout = stake } // no one on winning side → refund all
          else if (p.outcome_choice === outcome) { payout = (stake / winPool) * total }
        }
        await db.update(room_participants)
          .set({ pnl: String(payout - stake) })
          .where(eq(room_participants.id, p.id))
      }

      const meta = (room.metadata && typeof room.metadata === 'object') ? room.metadata as Record<string, unknown> : {}
      const [updated] = await db.update(rooms)
        .set({ status: 'resolved', resolved_at: new Date(), metadata: { ...meta, outcome, pool_total: total } })
        .where(eq(rooms.id, roomId))
        .returning()
      return { data: updated, error: null }
    })
  },

  async getRoomByCode(code: string) {
    return runQuery(async () => {
      const [room] = await db.select().from(rooms).where(eq(rooms.code, code.toUpperCase())).limit(1)
      return { data: room ?? null, error: null }
    })
  },

  async getRoomWithParticipants(roomId: string) {
    return runQuery(async () => {
      const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1)
      if (!room) { return { data: null, error: 'Room not found' } }

      const participants = await db
        .select({
          id: room_participants.id,
          user_id: room_participants.user_id,
          role: room_participants.role,
          stake_amount: room_participants.stake_amount,
          outcome_choice: room_participants.outcome_choice,
          pnl: room_participants.pnl,
          joined_at: room_participants.joined_at,
          left_at: room_participants.left_at,
          username: users.username,
          address: users.address,
          image: users.image,
        })
        .from(room_participants)
        .innerJoin(users, eq(room_participants.user_id, users.id))
        .where(and(
          eq(room_participants.room_id, roomId),
          isNull(room_participants.left_at),
        ))

      return { data: { ...room, participants }, error: null }
    })
  },

  async listUserRooms(userId: string) {
    return runQuery(async () => {
      const userRooms = await db
        .select({
          id: rooms.id,
          code: rooms.code,
          name: rooms.name,
          status: rooms.status,
          max_participants: rooms.max_participants,
          pot_amount: rooms.pot_amount,
          host_id: rooms.host_id,
          created_at: rooms.created_at,
          started_at: rooms.started_at,
          host_username: users.username,
          host_address: users.address,
          participant_count: sql<number>`(
            SELECT count(*)::int FROM room_participants rp
            WHERE rp.room_id = ${rooms.id} AND rp.left_at IS NULL
          )`,
        })
        .from(rooms)
        .innerJoin(users, eq(rooms.host_id, users.id))
        .innerJoin(room_participants, and(
          eq(room_participants.room_id, rooms.id),
          eq(room_participants.user_id, userId),
          isNull(room_participants.left_at),
        ))
        .where(eq(rooms.status, 'open'))
        .orderBy(desc(rooms.created_at))
        .limit(20)

      return { data: userRooms, error: null }
    })
  },

  async listPublicRooms() {
    return runQuery(async () => {
      const publicRooms = await db
        .select({
          id: rooms.id,
          code: rooms.code,
          name: rooms.name,
          status: rooms.status,
          max_participants: rooms.max_participants,
          pot_amount: rooms.pot_amount,
          host_id: rooms.host_id,
          created_at: rooms.created_at,
          host_username: users.username,
          participant_count: sql<number>`(
            SELECT count(*)::int FROM room_participants rp
            WHERE rp.room_id = ${rooms.id} AND rp.left_at IS NULL
          )`,
        })
        .from(rooms)
        .innerJoin(users, eq(rooms.host_id, users.id))
        .where(and(eq(rooms.is_private, false), eq(rooms.status, 'open')))
        .orderBy(desc(rooms.created_at))
        .limit(10)

      return { data: publicRooms, error: null }
    })
  },

  // Admin: every room regardless of status/privacy, newest first.
  async listAllRooms(limit = 100) {
    return runQuery(async () => {
      const allRooms = await db
        .select({
          id: rooms.id,
          code: rooms.code,
          name: rooms.name,
          status: rooms.status,
          max_participants: rooms.max_participants,
          pot_amount: rooms.pot_amount,
          is_private: rooms.is_private,
          host_id: rooms.host_id,
          created_at: rooms.created_at,
          started_at: rooms.started_at,
          host_username: users.username,
          host_address: users.address,
          participant_count: sql<number>`(
            SELECT count(*)::int FROM room_participants rp
            WHERE rp.room_id = ${rooms.id} AND rp.left_at IS NULL
          )`,
        })
        .from(rooms)
        .innerJoin(users, eq(rooms.host_id, users.id))
        .orderBy(desc(rooms.created_at))
        .limit(limit)

      return { data: allRooms, error: null }
    })
  },

  // Admin: hard-delete a room (participants cascade via FK).
  async deleteRoom(roomId: string) {
    return runQuery(async () => {
      await db.delete(rooms).where(eq(rooms.id, roomId))
      return { data: true, error: null }
    })
  },
}
