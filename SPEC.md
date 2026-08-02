# Smart Attendance — Technical Specification

A QR-code attendance system that actually stops proxy ("buddy") signing, using a
rotating signed QR + GPS geofence, with an optional one-device-per-student layer.

Undergraduate project. Scope is deliberately small: three roles, one anti-fraud
mechanism done well, one dashboard. Everything below is the target for v1 unless
marked *Future work*.

---

## 1. Problem it solves

A plain QR attendance system does **not** prevent buddy signing:

- A per-student QR can be screenshotted and sent to a friend.
- A single class QR can be photographed in class and sent to an absent friend.

This system closes that hole with two mandatory layers plus one optional layer.

| Layer | Stops | How |
|-------|-------|-----|
| **1. Rotating signed QR** (mandatory) | Screenshot forwarded to an absent friend | The classroom QR refreshes every ~20s; each encodes a short-lived, single-use, HMAC-signed token. A forwarded screenshot expires before it can be used. |
| **2. GPS geofence** (mandatory) | A friend scanning from off-campus | On scan, the phone sends its coordinates; the server rejects anything outside the classroom radius (Haversine distance). |
| **3. Device fingerprint** (optional, *if time allows*) | One phone marking several students | A hashed browser/device id may mark at most one student per session. |

Identity comes from the **logged-in student session**, not from a personal QR —
so there is no static personal QR to leak in the first place.

---

## 2. Roles

- **Admin** — manages courses, enrols students, views/export all attendance.
- **Lecturer** — starts/stops a class session, displays the rotating QR, sees who
  scanned in live.
- **Student** — logs in, scans the session QR from their own phone, sees their
  own attendance history.

---

## 3. Flow (happy path)

0. Lecturer **creates the session** (see §3a): picks a course, captures the
   classroom location, sets the radius, and starts it.
1. Server creates a `Session` row with the classroom's centre coordinates +
   allowed radius and opens the fullscreen Beacon display.
2. Lecturer's screen shows a QR that **auto-refreshes every 20s**. Each QR encodes
   a fresh signed token (see §5).
3. Student logs in on their phone → **Scan** → camera reads the QR; browser also
   captures GPS.
4. Phone POSTs `{ token, lat, lng, deviceHash? }` to the server.
5. Server validates, in order: token signature → not expired → not already used →
   inside geofence → (optional) device not already used this session → student
   enrolled in the course.
6. On success: `Attendance` row written, student sees a green confirmation.
   On failure: a specific reason ("code expired", "you're not in the classroom",
   "this device already marked attendance").

---

## 3a. Lecturer — create & display session (QR generation layer)

This is the layer where the lecturer *creates* the QR. The student never generates
a QR; the QR only ever lives on the lecturer's screen.

1. **Pick a course** — lecturer selects one of their courses (or creates one).
2. **Start-session screen:**
   - **Capture classroom location** — "Use my current location" reads the
     lecturer's GPS via `navigator.geolocation` and stores it as
     `centreLat` / `centreLng`. This is the geofence centre.
   - **Set radius** — a slider (default 50 m) → `radiusMetres`.
   - Optional **session label** (e.g. "Week 6 lecture").
3. **Start** — `POST /api/sessions` creates the `Session` row and routes to the
   **fullscreen Beacon display**: the rotating signed QR inside a glowing frame, a
   depleting countdown ring, a live scanned-in count/list, and **End session**.

The projected QR is generated **server-side, once per rotation** — the Beacon
display fetches a fresh token from `GET /api/sessions/:id/token` (§5, §9) every
~20s and renders it with `qrcode`. No attendance data is ever placed in the QR
itself; it carries only the signed, expiring token.

---

## 4. Architecture

Single Next.js (App Router) codebase — frontend + backend together.

```
Browser (student phone)          Next.js app (Vercel)              Database
  camera → QR token         →    Route Handlers (/api/*)      →    Postgres
  navigator.geolocation     →      - token verify (HMAC)              (Prisma)
                                    - geofence (Haversine)
Lecturer screen                     - dedupe / single-use
  rotating QR (SSE/poll)    ←      - session mgmt
```

- **Frontend:** React Server + Client Components, Tailwind, shadcn/ui.
- **Backend:** Next.js Route Handlers (`app/api/.../route.ts`).
- **Auth:** Auth.js (NextAuth) with credentials; role stored on the user.
- **DB:** PostgreSQL via Prisma (SQLite acceptable for local dev/demo).
- **QR:** `qrcode` (generate, lecturer side) + `html5-qrcode` (scan, student side).
- **Token:** Node `crypto` HMAC-SHA256. No third-party service.
- **PWA:** `manifest.ts` + a minimal service worker, added last (§9). Not on the
  critical path.

---

## 5. The rotating signed token (the core contribution)

The QR does **not** contain attendance data. It contains a signed capsule that is
only meaningful to our server.

**Payload (before signing):**
```
sessionId . issuedAtEpochSeconds . nonce
```

**Token shown in QR:**
```
base64url(payload) . base64url(HMAC_SHA256(payload, SERVER_SECRET))
```

**Rules:**
- New token generated on the lecturer screen **every 20s** (`TOKEN_TTL = 30s`, a
  small grace window over the refresh interval).
- Server recomputes the HMAC to verify authenticity — a client cannot forge one
  without `SERVER_SECRET`.
- Server rejects if `now - issuedAt > TOKEN_TTL`.
- The `nonce` gives every rotation a unique, unguessable value inside the signed
  payload.

**Why not make each token globally single-use?** The projected screen shows *one*
token per 20s window, so every student scanning during that window scans the same
token. Rejecting a token after its first use would reject everyone but the first
student. Replay/forwarding is instead defeated by the combination below, which is
compatible with a whole class scanning the same on-screen code:

1. **HMAC** — the token can't be forged.
2. **TTL (30s)** — a screenshot forwarded to an absent friend is dead on arrival.
3. **Geofence (§6)** — a token used from outside the room is rejected.
4. **One mark per student** — `Attendance (sessionId, studentId)` is unique, so a
   student can't inflate their own attendance no matter how many tokens they scan.
5. **One device per session (§7, optional)** — one phone can't mark many students.

> This signed + expiring token, checked against location and a one-mark-per-student
> rule, is the project's original mechanism — defensible as "your algorithm," not an
> off-the-shelf library feature.

---

## 6. Geofence check

- `Session` stores `centreLat`, `centreLng`, `radiusMetres` (e.g. 50m), set when
  the lecturer starts the session (captured from the lecturer's device or entered).
- On scan, compute the **Haversine distance** between the student's coordinates
  and the session centre; reject if `distance > radiusMetres`.
- Store the student's coordinates on the `Attendance` row for audit.
- Handle the "location permission denied" case explicitly — no location, no mark.

---

## 7. Device fingerprint (optional layer)

- Client computes a stable-ish hash (e.g. FingerprintJS open-source, or a hash of
  a few `navigator` signals) → `deviceHash`.
- A `(sessionId, deviceHash)` pair may appear **once**. A second student scanning
  from the same phone is rejected.
- Build only after layers 1 and 2 are solid and demoed. Treat as a plus, not a
  dependency.

---

## 8. Data model (Prisma sketch)

```
User        id, fullName, email, passwordHash, role(ADMIN|LECTURER|STUDENT),
            matricNumber?                       // required for STUDENT, unique
Course      id, code, title, lecturerId
Enrolment   id, courseId, studentId            // student ↔ course
Session     id, courseId, label?, startedAt, endedAt?,
            centreLat, centreLng, radiusMetres
Attendance  id, sessionId, studentId, markedAt,
            lat, lng, deviceHash?               // one row per (session, student)
```

Uniqueness: `User (matricNumber)` unique; `Attendance (sessionId, studentId)`
unique (one mark per student — see §5); `Attendance (sessionId, deviceHash)`
unique *when* layer 3 is on (NULLs are distinct in SQLite, so it's inert until
device hashes are sent).

**Identity is not typed at scan time.** `fullName` and `matricNumber` live on the
student's profile (set at sign-up / enrolment), so the lecturer's live list shows
each present student as `fullName · matricNumber` by joining `Attendance → User`.
The student never enters their matric number during the scan — that would let one
student mark another and undo the anti-fraud layers.

---

## 9. API surface (Route Handlers)

```
POST /api/auth/*                     Auth.js
POST /api/sessions                   lecturer: start session {courseId, centre, radius}
POST /api/sessions/:id/end           lecturer: end session
GET  /api/sessions/:id/token         lecturer: current rotating token (polled/SSE)
GET  /api/sessions/:id/live          lecturer: who has scanned in (poll/SSE)
                                     → [{ fullName, matricNumber, markedAt }], count
POST /api/attendance                 student: {token, lat, lng, deviceHash?}
GET  /api/me/attendance              student: own history
GET  /api/admin/attendance?...       admin: filter + CSV export
```

---

## 10. Tech stack summary

| Concern | Choice |
|---------|--------|
| Framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Auth.js (NextAuth), credentials + roles |
| DB / ORM | PostgreSQL + Prisma (SQLite for local) |
| QR generate | `qrcode` |
| QR scan | `html5-qrcode` |
| Signing | Node `crypto` (HMAC-SHA256) |
| Fingerprint (opt) | FingerprintJS OSS or hashed `navigator` signals |
| Deploy | Vercel + hosted Postgres (Neon/Supabase) |

---

## 11. Milestones

1. **Scaffold** — Next.js app, Prisma schema, auth, three role dashboards (empty).
2. **Sessions + rotating QR** — lecturer starts a session, screen shows refreshing
   signed QR; token endpoint + verification.
3. **Scan + mark** — student scans, token verified, `Attendance` written; live
   list updates on the lecturer screen.
4. **Geofence** — capture GPS on scan, Haversine check, audit coordinates stored.
5. **Dashboards + export** — history views + admin CSV export.
6. **(Optional) Device fingerprint.**
7. **PWA polish** — manifest + service worker, installable, offline shell.

---

## 12. Out of scope for v1 (write up as *Future work*)

- Visitor self-registration / digital passes.
- Worker payroll / clock-in for staff.
- Full offline capture with later sync.
- Facial recognition or biometric layers.

Keeping these out is deliberate — a focused, working three-layer system defends
better than a broad half-finished one.

---

## 13. Security notes

- `SERVER_SECRET` lives only on the server (env var); never shipped to the client.
- All validation is **server-authoritative** — the client never decides if a mark
  is valid; it only submits inputs.
- Rate-limit `POST /api/attendance` per student to blunt brute-force/replay.
- Store GPS only for audit; note it in the project's data-privacy section.
