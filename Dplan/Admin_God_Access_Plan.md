# Admin "God Access" — Implementation Plan

Last updated: 2026-04-10
Status: **PLANNED** (not started)

## Problem

A teacher must create a separate student account in each class to test the student game experience. There is no cross-teacher class visibility — Teacher A cannot see Teacher B's classes. There is no way to impersonate a student without knowing their PIN.

## Goal

A single "admin" login that can:
1. **See all classes** from all teachers in the dashboard
2. **Impersonate any student** to play through their game view
3. **Require no per-class account creation** — one credential, universal access

## Current Auth Architecture

| Aspect | Detail |
|--------|--------|
| Roles | `teacher`, `student` (no admin) |
| Student model | `Pair` (modern) or `User` (legacy) |
| Teacher login | username + password → JWT `{ type: 'teacher', userId, role: 'teacher' }` |
| Student login | designation + PIN → JWT `{ type: 'pair', pairId, designation, classId, lane }` |
| Class ownership | `Class.teacherId` → only owner sees their classes |
| Ownership checks | `getTeacherClassIds(teacherId)` and `teacherOwnsPair(teacherId, pairId)` in `teacher.ts` |
| Token duration | 7 days (httpOnly cookie) |

## Recommended Approach: `admin` Role (Option C)

Add `admin` to the existing `Role` enum. Admin uses the same teacher dashboard UI with ownership checks relaxed. Impersonation is a separate lightweight endpoint.

### Why Not the Alternatives

- **Option A (fully separate admin system):** Over-engineered for a single-user feature. Duplicates dashboard UI.
- **Option B (`isAdmin` boolean flag):** Mixes admin logic into every teacher code path (`|| isAdmin` everywhere). Harder to audit.

## Implementation Steps

### 1. Prisma Schema (migration)

```prisma
// schema.prisma
enum Role {
  teacher
  student
  admin    // ← NEW
}
```

Run `npx prisma migrate dev --name add-admin-role`.

### 2. Auth — Admin Login Path

File: `backend/src/routes/auth.ts`

Admin logs in via the same `POST /api/auth/login` endpoint (username + password). The JWT payload is:

```typescript
{ type: 'teacher', userId: string, role: 'admin' }
```

Using `type: 'teacher'` means all existing teacher middleware (`requireRole('teacher')`) works — we just need to also accept `admin` in the role check.

### 3. Middleware Helpers

File: `backend/src/middleware/auth.ts`

```typescript
export function isAdmin(req: Request): boolean {
  return req.auth?.role === 'admin';
}
```

Update `requireRole` to accept `admin` alongside `teacher`:

```typescript
// requireRole('teacher') should also pass for admin
if (requiredRole === 'teacher' && auth.role === 'admin') next();
```

### 4. Relax Ownership Checks (2 functions)

File: `backend/src/routes/teacher.ts`

```typescript
async function getTeacherClassIds(teacherId: string, admin = false): Promise<string[]> {
  if (admin) {
    // Return ALL class IDs
    const classes = await prisma.class.findMany({ select: { id: true } });
    return classes.map(c => c.id);
  }
  // Existing teacher-scoped query
  const classes = await prisma.class.findMany({
    where: { teacherId },
    select: { id: true },
  });
  return classes.map(c => c.id);
}

async function teacherOwnsPair(teacherId: string, pairId: string, admin = false): Promise<boolean> {
  if (admin) return true;
  // ... existing logic
}
```

Each call site passes `isAdmin(req)` as the flag.

### 5. Impersonation Endpoint

New file: `backend/src/routes/admin.ts`

```
POST /api/admin/impersonate/:pairId
  - Requires: admin role
  - Returns: short-lived student JWT (30-minute expiry)
  - JWT payload: standard pair token shape (type: 'pair', pairId, designation, classId, lane)
  - Response includes: { token, designation, classId, className }
```

The admin opens the student app in a new browser tab with this token. A small banner at the top shows **"Viewing as CA-1 — Exit"** so the admin knows they're impersonating.

### 6. Seed Admin Account

File: `backend/src/seed.ts`

```typescript
// Create admin user (dev credentials: admin / admin123)
await prisma.user.upsert({
  where: { username: 'admin' },
  update: {},
  create: {
    username: 'admin',
    passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
    displayName: 'System Administrator',
    role: 'admin',
  },
});
```

Production: set `ADMIN_PASSWORD` env var on Railway.

### 7. Frontend — Dashboard Changes

File: `frontend/src/pages/TeacherDashboard.tsx`

- Detect `user.role === 'admin'` from auth response
- Fetch ALL classes (backend already handles this via relaxed `getTeacherClassIds`)
- Show teacher name next to each class in the dropdown: `"Class A (Director Wells)"`

File: `frontend/src/components/ClassMonitor.tsx`

- Add **"Impersonate"** button per student row (admin only)
- On click: call `POST /api/admin/impersonate/:pairId`
- Open student app in new tab with returned token
- Show small dismissible banner: "Viewing as [designation] — Click to exit"

### 8. Impersonation Banner (Student Side)

File: `frontend/src/components/ImpersonationBanner.tsx` (new)

- Detect impersonation via short token expiry or a `impersonating: true` flag in JWT
- Render fixed top banner: amber background, "Viewing as CA-1 — Exit"
- Exit clears token and closes tab

## Files Changed (Estimated)

| File | Change | Lines |
|------|--------|-------|
| `schema.prisma` | Add `admin` to Role enum | ~1 |
| `backend/src/routes/auth.ts` | Admin login path + role in JWT | ~10 |
| `backend/src/middleware/auth.ts` | `isAdmin()` helper, relax `requireRole` | ~8 |
| `backend/src/routes/teacher.ts` | Pass admin flag to 2 helper functions + call sites | ~12 |
| `backend/src/routes/admin.ts` | New file: impersonate endpoint | ~35 |
| `backend/src/routes/index.ts` | Mount admin routes | ~2 |
| `backend/src/seed.ts` | Upsert admin account | ~10 |
| `frontend/src/pages/TeacherDashboard.tsx` | Show all classes for admin | ~10 |
| `frontend/src/components/ClassMonitor.tsx` | Impersonate button | ~20 |
| `frontend/src/components/ImpersonationBanner.tsx` | New: banner component | ~25 |
| `frontend/src/stores/studentStore.ts` | Impersonation detection | ~5 |

**Total: ~140 lines across 11 files. 1 new migration. 2 new files.**

## Security Considerations

- Admin impersonation tokens are **short-lived (30 min)** — cannot be reused long-term
- Impersonation is **read-only by default** — admin playing as a student creates real MissionScore records (this is intentional for testing, but could be gated with a `dryRun` flag if needed)
- Admin account creation requires `ADMIN_PASSWORD` env var in production (no default password deployed)
- All impersonation actions could be **audit-logged** (future enhancement: `AdminAuditLog` table)

## Dev Credentials

| Account | Username | Password |
|---------|----------|----------|
| Admin | `admin` | `admin123` |
| Teacher | `teacher` | `teacher123` |
| Student | `CA-1` | PIN `1234` |

## Open Questions

1. Should impersonation create real game data (MissionScores, etc.) or be read-only?
2. Should admin be able to create/delete classes owned by other teachers, or only view?
3. Should there be a separate admin dashboard page, or just the enhanced teacher dashboard?
4. Do we need multiple admin accounts, or is a single one sufficient?
