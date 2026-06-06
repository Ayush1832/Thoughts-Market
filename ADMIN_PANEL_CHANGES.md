# Admin Panel — Changes & Workflow

This document describes the changes made to the **Thoughts Market admin panel**, the files
involved, and the end-to-end workflow for each feature.

---

## 1. Overview

The admin panel lives under `src/app/[locale]/admin/` and is rendered inside
[`admin/layout.tsx`](src/app/[locale]/admin/layout.tsx), which wraps every admin page with:

- `AdminHeader` (logo + user menu)
- `AdminSidebar` (left navigation)
- the page content (`children`)

Navigation items are defined in
[`admin/_components/AdminSidebar.tsx`](src/app/[locale]/admin/_components/AdminSidebar.tsx).

Existing sections: **General, Theme, Locales, Categories, Market Context, Finance,
Affiliate, Events, Users, Roles, Support, Trending, Social.**

---

## 2. New feature — Peer to Peer (P2P Rooms)

A new **Peer to Peer** section was added so admins can **view all Friends-Play rooms**
across the platform and **create new ones**.

### 2.1 Files added / changed

| File | Type | Purpose |
|------|------|---------|
| `admin/_components/AdminSidebar.tsx` | changed | Added the **"Peer to Peer"** nav item (`⚔` `SwordsIcon`) → `/admin/p2p`, placed between *Events* and *Users*. |
| `admin/p2p/page.tsx` | new | Server page: admin guard, summary stats, renders the create form + rooms table. |
| `admin/p2p/_components/AdminRoomsTable.tsx` | new | Client component: lists every room (desktop table + mobile cards) with status badges and a per-row **Delete** action. |
| `admin/p2p/_components/AdminCreateRoomForm.tsx` | new | Client form: create a room (name, max players, private toggle). |
| `admin/p2p/_actions/room-actions.ts` | new | Server actions: `createRoomAction`, `deleteRoomAction` (both admin-gated, Zod-validated). |
| `lib/db/queries/rooms.ts` | changed | Added `RoomsRepository.listAllRooms(limit)` and `RoomsRepository.deleteRoom(roomId)`. Reuses existing `createRoom()`. |

> No database schema change was required — it reuses the existing `rooms` /
> `room_participants` tables (`lib/db/migrations/2026_05_31_001_p2p_rooms.sql`).

### 2.2 Data model (existing tables)

- **`rooms`** — `id, code, name, host_id, status (open|playing|resolved|cancelled),
  max_participants, pot_amount, is_private, created_at, started_at, …`
- **`room_participants`** — `room_id, user_id, role (host|player), left_at, …`

### 2.3 Repository methods (`lib/db/queries/rooms.ts`)

| Method | Used by | Description |
|--------|---------|-------------|
| `createRoom(hostId, name, maxParticipants, isPrivate)` | create action | Inserts a room (generates a join code) and auto-joins the host as a participant. |
| `listAllRooms(limit = 100)` | admin page | Returns every room (any status/privacy), newest first, joined with host username/address + live participant count. |
| `deleteRoom(roomId)` | delete action | Hard-deletes a room; participants cascade via FK. |

### 2.4 Server actions (`_actions/room-actions.ts`)

Both actions **require an authenticated admin** (`UserRepository.getCurrentUser({ minimal: true })`
→ `user.is_admin`) and `revalidatePath('/admin/p2p')` on success.

- **`createRoomAction(prevState, formData)`**
  - Validates with Zod: `name` (2–60 chars), `max_participants` (2–500), `is_private` (bool).
  - Calls `RoomsRepository.createRoom(adminUser.id, …)` — the admin becomes the host.
  - Returns `{ error, success }`.
- **`deleteRoomAction(roomId)`**
  - Calls `RoomsRepository.deleteRoom(roomId)`.
  - Returns `{ error }`.

### 2.5 Page (`admin/p2p/page.tsx`)

1. `setRequestLocale(locale)`.
2. **Defensive admin guard** — `getCurrentUser({ minimal: true })`; non-admins get `notFound()`.
   (Mutations are independently guarded in the actions.)
3. Fetches `RoomsRepository.listAllRooms()` and maps rows to the table shape.
4. Computes summary stats: **Total rooms · Open · In progress · Active players.**
5. Renders: stats cards → `AdminCreateRoomForm` → `AdminRoomsTable`.

---

## 3. Admin workflow

### 3.1 Viewing rooms

```
Admin → /admin → sidebar "Peer to Peer"
      → /admin/p2p
        ├─ guard: must be is_admin (else 404)
        ├─ stats cards (Total / Open / In progress / Active players)
        └─ rooms table:
             Room · Code · Host · Players (n/max) · Status · Pot · Created · [Delete]
```

- **Status badges:** `open` (green, pulsing) · `playing` (amber) · `resolved` (sky) · `cancelled` (red).
- Private rooms show a lock icon next to the name.

### 3.2 Creating a room

```
Create form → enter name + max players + (optional) private toggle → "Create room"
   → createRoomAction (admin-gated, Zod-validated)
   → RoomsRepository.createRoom(adminId, name, maxPlayers, isPrivate)
        ├─ generates a unique join code
        └─ auto-joins admin as host participant
   → revalidatePath('/admin/p2p') → table refreshes
   → toast "Room created."
```

### 3.3 Deleting a room

```
Table row → "Delete" → confirm dialog
   → deleteRoomAction(roomId) (admin-gated)
   → RoomsRepository.deleteRoom(roomId)  (participants cascade)
   → revalidatePath('/admin/p2p') + router.refresh()
   → toast "Room deleted."
```

### 3.4 Relationship to the user-facing side

The same `rooms` data powers the user-facing **Friends Play** lobby
(`(home)/_components/FriendPlayLobby.tsx`) and the room APIs under `app/api/rooms/*`.
Admin actions (create/delete) operate on the same tables, so changes are reflected
on the user side immediately.

---

## 4. Visual / theme changes affecting the admin panel

The platform-wide **"Prism" reskin** also applies to admin pages (they share
`globals.css` and the shared UI primitives):

- **Palette:** dark near-black `#07080f` background with iridescent violet/cyan/pink accents.
- **Fonts:** Inter (body), Instrument Serif (display), JetBrains Mono (numbers/labels).
- **Glass surfaces:** the shared `components/ui/card.tsx` renders as a translucent
  blurred "glass" card in dark mode, so admin tables/panels built on `Card` adopt the look automatically.
- **Nebula background:** a fixed radial-glow + faint grid behind all content (dark mode).

These are **styling-only** changes — no admin logic, data, or actions were affected.

---

## 5. Security notes

- All P2P **mutations** are admin-gated server-side (`is_admin`) — the UI guard is defensive only.
- `listAllRooms` is read-only and only reached after the page-level admin guard.
- No new secrets/env vars were introduced.
