import type { TicketCategory, TicketPriority, TicketStatus } from '@/lib/db/schema/support/tables'
import { randomUUID } from 'node:crypto'
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'
import { support_tickets } from '@/lib/db/schema/support/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'

const reporter = alias(users, 'reporter')

export const SupportRepository = {
  async listTickets(params: {
    limit?: number
    offset?: number
    search?: string
    status?: TicketStatus | null
    category?: TicketCategory | null
    sortBy?: 'created_at' | 'updated_at' | 'priority' | 'status'
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<
    | { data: { id: string; category: TicketCategory; subject: string; description: string; status: TicketStatus; priority: TicketPriority; resolution_notes: string | null; created_at: Date; updated_at: Date; user_id: string | null; assigned_to: string | null; reporter_username: string | null; reporter_address: string | null; reporter_email: string | null }[]; count: number; error: null }
    | { data: null; count: null; error: string }
  > {
    try {
      const {
        limit = 50,
        offset = 0,
        search,
        status,
        category,
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = params

      const conditions = []
      if (status) { conditions.push(eq(support_tickets.status, status)) }
      if (category) { conditions.push(eq(support_tickets.category, category)) }
      if (search?.trim()) {
        conditions.push(or(
          ilike(support_tickets.subject, `%${search.trim()}%`),
          ilike(support_tickets.description, `%${search.trim()}%`),
        ))
      }

      const orderFn = sortOrder === 'asc' ? asc : desc
      const orderCol = {
        created_at: support_tickets.created_at,
        updated_at: support_tickets.updated_at,
        priority: support_tickets.priority,
        status: support_tickets.status,
      }[sortBy] ?? support_tickets.created_at

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const rows = await db
        .select({
          id: support_tickets.id,
          category: support_tickets.category,
          subject: support_tickets.subject,
          description: support_tickets.description,
          status: support_tickets.status,
          priority: support_tickets.priority,
          resolution_notes: support_tickets.resolution_notes,
          created_at: support_tickets.created_at,
          updated_at: support_tickets.updated_at,
          user_id: support_tickets.user_id,
          assigned_to: support_tickets.assigned_to,
          reporter_username: reporter.username,
          reporter_address: reporter.address,
          reporter_email: reporter.email,
        })
        .from(support_tickets)
        .leftJoin(reporter, eq(support_tickets.user_id, reporter.id))
        .where(whereClause)
        .orderBy(orderFn(orderCol))
        .limit(limit)
        .offset(offset)

      const [{ value: total }] = await db
        .select({ value: count() })
        .from(support_tickets)
        .where(whereClause)

      return { data: rows, count: total, error: null }
    }
    catch {
      return { data: null, count: null, error: DEFAULT_ERROR_MESSAGE }
    }
  },

  async getTicketById(id: string) {
    return runQuery(async () => {
      const rows = await db
        .select()
        .from(support_tickets)
        .where(eq(support_tickets.id, id))
        .limit(1)

      return { data: rows[0] ?? null, error: null }
    })
  },

  async createTicket(input: {
    user_id?: string
    category: TicketCategory
    subject: string
    description: string
    priority?: TicketPriority
  }) {
    return runQuery(async () => {
      const result = await db
        .insert(support_tickets)
        .values({
          id: randomUUID(),
          user_id: input.user_id ?? null,
          category: input.category,
          subject: input.subject,
          description: input.description,
          priority: input.priority ?? 'medium',
          status: 'open',
        })
        .returning()

      return { data: result[0], error: null }
    })
  },

  async updateTicket(id: string, input: {
    status?: TicketStatus
    priority?: TicketPriority
    assigned_to?: string | null
    resolution_notes?: string | null
  }) {
    return runQuery(async () => {
      const result = await db
        .update(support_tickets)
        .set({ ...input, updated_at: new Date() })
        .where(eq(support_tickets.id, id))
        .returning()

      if (!result[0]) {
        return { data: null, error: 'Ticket not found.' }
      }

      return { data: result[0], error: null }
    })
  },
}
