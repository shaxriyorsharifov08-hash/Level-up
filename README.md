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
| Database | **PostgreSQL** + **Drizzle ORM** | Relational data with real transactions; free hosting on Neon or Supabase |
| Styling | **Tailwind CSS v4** + small hand-written UI kit | Modern look, automatic dark mode, no heavy component library |
| Validation | **Zod** | Every form and action input is validated on the server |
| Auth | Built-in (scrypt hashing + database sessions) | No paid auth provider and no vendor lock-in |
| Tests | **Vitest** (unit + database integration tests) | Fast and free |

---

## Quick start

**Requirements:** Node.js 20.9+ and a PostgreSQL database.

```bash
# 1. Install dependencies
npm install

# 2. Configure
cp .env.example .env            # edit university name, time zone, social links…

# 3. Start PostgreSQL. Pick one:
docker compose up -d            # local Postgres via Docker
# …or create a free database on https://neon.tech and paste its URL into DATABASE_URL

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
| `npm run db:reset` | **Delete everything**, re-migrate and re-seed (refuses in production) |
| `npm run db:studio` | Browse the database in Drizzle Studio |

---

## Configuration

All settings live in environment variables (see [`.env.example`](.env.example)):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_NAME` | Platform name shown in the UI (default "Level Up") |
| `NEXT_PUBLIC_UNIVERSITY_NAME` / `_SHORT_NAME` | Your university's name |
| `NEXT_PUBLIC_UNIVERSITY_TIMEZONE` | IANA time zone for showing and entering times, e.g. `Asia/Tashkent` |
| `NEXT_PUBLIC_UNIVERSITY_TELEGRAM_URL` / `_INSTAGRAM_URL` / `_WEBSITE_URL` | Official channels shown on the landing page, footer and dashboard |
| `ALLOWED_EMAIL_DOMAINS` | Optional comma-separated list to restrict sign-up, e.g. `student.example.edu` |
| `DATABASE_POOL_MAX` | Optional connection pool size (default 5; use 1–3 on serverless) |

`NEXT_PUBLIC_*` values are baked in at build time, so rebuild after changing them.

---

## Deploying for free (Vercel + Neon)

1. **Database:** create a free project on [Neon](https://neon.tech) (or [Supabase](https://supabase.com)) and copy the connection string. Use the pooled connection string if one is offered.
2. **Create the tables** from your machine: `DATABASE_URL="<neon url>" npm run db:migrate` (optionally also `db:seed` for a demo).
3. **App:** import the GitHub repository on [Vercel](https://vercel.com), add the environment variables from `.env.example` with your values, and deploy.
4. After schema changes, run `npm run db:migrate` against the production database before or right after deploying.

The app is a standard Node.js server (`npm run build && npm start`), so it also runs on Render, Railway, Fly.io or any VPS.

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
