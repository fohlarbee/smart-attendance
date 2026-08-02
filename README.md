# Beacon — Smart Attendance

A QR-code classroom attendance system that actually stops **buddy signing** (a student
marking an absent friend present). The lecturer displays a **rotating, signed QR** that
changes every ~20 seconds; students scan it with their phone, and a mark only counts
from **inside the classroom**.

Built with Next.js (App Router) — one codebase for the web app and its API. Works in
any modern phone browser; no app-store install.

> Full design rationale and the research behind it are in [`SPEC.md`](./SPEC.md).

---

## Why plain QR isn't enough

A basic QR system doesn't stop the fraud it's meant to:

- A per-student QR can be screenshotted and sent to a friend.
- A single class QR can be photographed and sent to an absent friend to scan remotely.

Beacon closes this with layers that work together (see `SPEC.md` §5):

| Layer | Stops | How |
|-------|-------|-----|
| **Rotating signed token** | Forwarded screenshot | HMAC-signed, expires in 30s, refreshes every 20s |
| **GPS geofence** | Remote scanning | Scan must be within the room radius (Haversine) |
| **One mark per student** | Self-inflation | Unique `(session, student)` in the DB |
| **One device per session** *(optional)* | One phone marking many | Device hash unique per session |

Identity comes from the student's **login**, never typed at scan time — so the lecturer's
live list shows each present student's **name + matric number** automatically, and there's
no free-text box to forge.

---

## Tech stack

- **Next.js 16** (App Router, TypeScript) — frontend + API route handlers
- **Tailwind CSS v4** — the "Beacon" design system (deep ink + amber)
- **Prisma + SQLite** — local dev; switch the datasource `provider` to `postgresql` to deploy
- **Auth**: `jose` (JWT in an httpOnly cookie) + `bcryptjs` — lightweight, server-authoritative
- **QR**: `qrcode` (generate) + `html5-qrcode` (scan)
- **Motion**: `motion` (Framer Motion) for the beacon animations
- HMAC tokens via Node `crypto`

---

## Getting started

```bash
npm install
cp .env.example .env      # then fill in the two secrets (command is in the file)
npx prisma migrate dev    # creates the SQLite DB
npm run db:seed           # demo users, a course, 5 enrolled students
npm run dev               # http://localhost:3000
```

### Demo accounts (password `password123`)

| Role | Email |
|------|-------|
| Lecturer | `lecturer@beacon.edu` |
| Student | `2022ns0469@unijos.edu.ng` |
| Admin | `admin@beacon.edu` |

### Try the flow

1. Sign in as the **lecturer** → **Start session** → allow location, set the radius → the
   beacon appears with the rotating QR.
2. On the **same laptop** (or another device — see the note below), sign in as the
   **student**, open **Scan**, and point the camera at the beacon. You're marked present
   and appear on the lecturer's live list.
3. Sign in as **admin** → **Attendance records** → filter and **Export CSV**.

> **Camera + GPS need a secure context.** They work on `http://localhost`. To test from a
> separate phone you need HTTPS — run a tunnel (e.g. `ngrok http 3000`) and open the https
> URL on the phone, or deploy.

---

## Project structure

```
prisma/schema.prisma          data model (User, Course, Enrolment, Session, Attendance)
prisma/seed.ts                demo data
src/lib/token.ts              HMAC rotating-token issue/verify
src/lib/geo.ts                Haversine geofence
src/lib/auth.ts               JWT session + password hashing
src/lib/device.ts             optional device fingerprint
src/app/api/                  route handlers (sessions, token, live, attendance, admin export)
src/app/lecturer/             course list, create-session, beacon display, summary
src/app/student/              home + scan
src/app/admin/                overview + records/CSV
src/components/beacon/        RotatingQr, CountdownRing, SuccessCheck (the animations)
```

---

## Deploying

**SQLite locally, Postgres in production** — the datasource `provider` is set automatically
by `scripts/db-provider.mjs` (run from `predev`/`prebuild`). It picks `postgresql` when
`DATABASE_URL` is a `postgres://…` string (or `DATABASE_PROVIDER=postgresql` is set), and
`sqlite` otherwise. So local dev needs no changes; production just needs the right env vars.

To deploy (e.g. Vercel + Neon):

1. Create a Postgres database (Neon/Supabase). Set these env vars on the host:
   - `DATABASE_URL` — the **pooled** connection string, with `?sslmode=require&pgbouncer=true`
     (the `pgbouncer=true` flag keeps Prisma happy with Neon's connection pooler).
   - `DATABASE_PROVIDER=postgresql` — guarantees the Postgres client is generated at build.
   - `SERVER_SECRET` and `AUTH_SECRET` — 64-char hex each.
2. Apply the schema + seed **once**, using the **direct (non-pooler)** connection string
   (pooler endpoints reject schema changes):
   ```bash
   DATABASE_URL="<direct-url>" npm run db:push
   DATABASE_URL="<direct-url>" npm run db:seed
   ```
3. Deploy. The build runs `prisma generate` for Postgres automatically; HTTPS on the host
   satisfies the camera/GPS secure-context requirement.

> Schema changes later: re-run `npm run db:push` against the **direct** URL. The app runtime
> always uses the **pooled** URL.

---

## Scope

This is a focused v1. Deliberately left as *future work*: visitor passes, staff/payroll
clock-in, full offline capture with sync, and biometric layers.
