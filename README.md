# Level Up

**Building your dreams by acting.**

Level Up is a web platform for one university's students and student organizations. It combines event management, student communities and team collaboration in one place.

| For students | For student organizations |
| --- | --- |
| Discover events and projects (search, categories, dates) | Create, publish and manage events, with capacity and a waitlist |
| Register for events online and join waitlists automatically | Check attendees in and export attendee lists (CSV) |
| Join clubs (open or by request) and follow their updates | Run projects on kanban boards with assignees, priorities and due dates |
| Message other students: direct messages and group chats | Track progress per project and see overdue work |
| Add events to your own calendar (.ics) | Manage team members, roles and responsibilities |
| Find the official university and club Telegram/Instagram pages | Plan meetings on a shared team calendar |
| Get a personal dashboard, calendar, task list and notifications | Chat in internal team channels; manage the clubs you oversee |

It's a working MVP, not a visual prototype. Every screen reads from and writes to a real PostgreSQL database, and permissions are enforced on the server.

---

## Tech stack (all free or with free tiers)

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, React 19, Server Components, Server Actions) | One codebase for UI and backend; deploys free on Vercel |
| Language | **TypeScript** | Type safety from the database to the UI |
| Database | **PostgreSQL on Supabase** + **Drizzle ORM** | Relational data with real transactions; free hosted database with a friendly dashboard |
| Styling | **Tailwind CSS v4** + small hand-written UI kit | Modern look, automatic dark mode, no heavy component library |
| Validation | **Zod** | Every form and action input is validated on the server |
| Auth | Built-in (scrypt hashing + database sessions) | No paid auth provider and no vendor lock-in |
| Tests | **Vitest** (unit + database integration tests) | Fast and free |

---

## Quick start

**Requirements:** Node.js 20.9+ and a PostgreSQL database: a free **Supabase** project (recommended) or a local one.

```bash
# 1. Install dependencies
npm install

# 2. Configure
cp .env.example .env            # database URLs, university name, time zone, social links…

# 3. Database. Pick one:
#    a) Supabase: paste the two connection strings into .env (DATABASE_URL, DIRECT_URL)
#       → step-by-step guide: docs/SUPABASE.md
#    b) Local Postgres via Docker:
docker compose up -d

# 4. Create the tables and load demo data
npm run db:migrate
npm run db:seed

# 5. Run
npm run dev                     # http://localhost:3000
```

### Demo accounts

After `npm run db:seed`, every demo account uses the password **`password123`**:

| E-mail | Who |
| --- | --- |
| `student@demo.edu` | Timur, a student. Member of Coding Club, has tasks, chats and registrations |
| `organizer@demo.edu` | Amina, president of the Student Union and lead of the Coding Club |
| `admin@demo.edu` | Platform administrator. Can manage any organization and mark it "official" |

On a fresh database without demo data, **the first account you register becomes the platform administrator**.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |
| `npm test` | Unit tests + database integration tests (needs `DATABASE_URL`) |
| `npm run db:generate` | Create a new SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Load demo data (only into an empty database) |
| `npm run db:reset` | **Delete all app data** (the `campus` schema), re-migrate and re-seed (refuses in production and, unless confirmed, on remote databases like Supabase) |
| `npm run db:studio` | Browse the database in Drizzle Studio |

---

## Configuration

All settings live in environment variables (see [`.env.example`](.env.example)):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Connection string used by the app (Supabase: **transaction pooler**, port 6543) |
| `DIRECT_URL` | Connection string for migrations and the seed script (Supabase: **session pooler**, port 5432). Defaults to `DATABASE_URL` |
| `NEXT_PUBLIC_APP_NAME` | Platform name shown in the UI (default "Level Up") |
| `NEXT_PUBLIC_UNIVERSITY_NAME` / `_SHORT_NAME` | Your university's name |
| `NEXT_PUBLIC_UNIVERSITY_TIMEZONE` | IANA time zone for showing and entering times, e.g. `Asia/Tashkent` |
| `NEXT_PUBLIC_UNIVERSITY_TELEGRAM_URL` / `_INSTAGRAM_URL` / `_WEBSITE_URL` | Official channels shown on the landing page, footer and dashboard |
| `ALLOWED_EMAIL_DOMAINS` | Optional comma-separated list to restrict sign-up, e.g. `student.example.edu` |
| `DATABASE_POOL_MAX` | Optional connection pool size (default 5; use 1–3 on serverless) |

`NEXT_PUBLIC_*` values are baked in at build time, so rebuild after changing them.

---

## Deploying for free (Supabase + Vercel)

Step-by-step walkthrough: **[docs/SUPABASE.md](docs/SUPABASE.md)**.

1. **Database:** create a free project on [Supabase](https://supabase.com). Under **Connect → Connection string**, copy the *transaction pooler* (port 6543) and *session pooler* (port 5432) strings.
2. **Create the tables:** put them in `.env` as `DATABASE_URL` and `DIRECT_URL`, then run `npm run db:migrate` (and `npm run db:seed` for demo data). Without Node.js locally, add a `DIRECT_URL` repository secret and run the **"Supabase – migrate database"** GitHub Action instead.
3. **App:** import the repository on [Vercel](https://vercel.com), add `DATABASE_URL` (transaction pooler), `DATABASE_POOL_MAX=1` and your `NEXT_PUBLIC_*` settings, and deploy.
4. After schema changes, run `npm run db:migrate` against Supabase before deploying the new code.

All tables live in their own `campus` schema, so the app never mixes with other apps' tables in the same database, and every table has Row Level Security enabled, so Supabase's REST API can't read or change data. The app itself connects as the table owner. Any other PostgreSQL host (Neon, Railway, a VPS) works too: just set `DATABASE_URL`. The app is a standard Node.js server (`npm run build && npm start`), so it also runs on Render, Railway, Fly.io or any VPS.

---

## Project structure

```
src/
├── app/                      # Routes (Next.js App Router)
│   ├── (marketing)/          # Public landing page
│   ├── (auth)/               # Login & registration
│   ├── (main)/               # Everything else; layout picks app shell vs public shell
│   │   ├── dashboard/  events/  projects/  clubs/  people/
│   │   ├── messages/   calendar/  tasks/   notifications/  settings/
│   │   └── workspace/[slug]/ # Organization workspace: events, projects, tasks,
│   │                         #   calendar, chat, members, clubs, settings
│   └── api/                  # Route handlers: chat polling, .ics and CSV downloads
├── features/                 # Feature modules (business logic + feature UI)
│   ├── auth/  organizations/  events/  projects/  meetings/
│   ├── chat/  feed/  notifications/  shell/
│   │   ├── actions.ts        #   Server Actions (mutations, always re-check permissions)
│   │   ├── queries.ts        #   Server-only data access
│   │   └── components/       #   Feature-specific UI
├── components/               # Shared UI kit and layout (sidebar, tabs, forms…)
├── db/                       # Drizzle schema + client
├── lib/                      # Auth, permissions, dates/time zones, forms, ICS/CSV
└── config/site.ts            # Branding & university settings
drizzle/                      # SQL migrations (committed)
scripts/                      # seed & reset
tests/                        # Vitest unit + integration tests
docs/ARCHITECTURE.md          # How it fits together and why
docs/SUPABASE.md              # Running on Supabase + Vercel, step by step
```

Read **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the data model, permission rules, the real-time chat approach and the scaling roadmap.

---

## Roadmap ideas

- Push-based chat (Pusher, Ably or Supabase Realtime; free tiers) instead of polling
- Image uploads (Cloudinary / UploadThing free tiers) instead of image URLs
- E-mail notifications and password reset (Resend free tier)
- Telegram bot that posts new events to a club's channel
- Event QR-code tickets for faster check-in
- Multi-university support (add a `universities` table and scope data by it)
