# Running Level Up on Supabase

Supabase gives you a hosted PostgreSQL database with a friendly dashboard (table editor, SQL editor, backups) on a free plan. Level Up uses Supabase **as its database**: the app connects with a normal Postgres connection string, and all tables, migrations and permissions work as described in [ARCHITECTURE.md](ARCHITECTURE.md).

**Overview:** create a project → copy two connection strings → put them in `.env` → run migrations → run the app → deploy to Vercel.

---

## 1. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) and click **New project**.
2. Choose a name (e.g. `level-up`) and the **region closest to your university**. For Central Asia, Frankfurt (`eu-central-1`) is a good choice.
3. Set a **database password** and save it somewhere safe.
   > Tip: use only letters and digits. Special characters (`@ # / ? %`) must be URL-encoded in connection strings (`@` → `%40`), which is a common source of "password authentication failed" errors.
4. Wait about a minute for the project to start.

## 2. Copy the two connection strings

Open the project and click **Connect** in the top bar, then the **Connection string** tab (type: *URI*). Copy these two:

| Use | Supabase option | Port | Goes into |
| --- | --- | --- | --- |
| The running app | **Transaction pooler** | `6543` | `DATABASE_URL` |
| Migrations & demo data | **Session pooler** | `5432` | `DIRECT_URL` |

They look like this (copy the host exactly from the dashboard; it can be `aws-0-…` or `aws-1-…`):

```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Replace `[YOUR-PASSWORD]` with the password from step 1.

**Why two?** The transaction pooler shares a few database connections between many short requests, which is ideal for the app and for serverless hosting. Migrations need a regular session, which the session pooler provides. The **direct connection** (`db.<ref>.supabase.co`) is IPv6-only on the free plan and doesn't work from many networks or from Vercel, so the poolers are the safer choice.

You don't need to add `sslmode`: the app turns on SSL automatically for Supabase hosts.

## 3. Configure the project

```bash
cp .env.example .env
```

Edit `.env`:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_UNIVERSITY_NAME="Your University"
NEXT_PUBLIC_UNIVERSITY_TIMEZONE="Asia/Tashkent"
# …the rest of the settings from .env.example
```

`.env` is in `.gitignore`. **Never commit your database password.**

## 4. Create the tables

```bash
npm install
npm run db:migrate     # creates all tables in Supabase
npm run db:seed        # optional: demo data (only into an empty database)
```

Open **Table Editor** in the Supabase dashboard: you should see `users`, `organizations`, `events`, `tasks` and the rest, each marked **RLS enabled**.

<details>
<summary>No Node.js on your computer? Run migrations from GitHub instead</summary>

1. In your GitHub repository go to **Settings → Secrets and variables → Actions → New repository secret**.
2. Name it `DIRECT_URL` and paste the **session pooler** connection string.
3. Open **Actions → "Supabase – migrate database" → Run workflow**. Tick *Also load demo data* if you want the demo.

</details>

## 5. Run the app

```bash
npm run dev            # http://localhost:3000
```

With demo data, sign in as `student@demo.edu`, `organizer@demo.edu` or `admin@demo.edu` (password `password123`). On an empty database, the first account you register becomes the platform administrator.

## 6. Deploy to Vercel (free)

1. Push the repository to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. Under **Environment Variables**, add:
   - `DATABASE_URL`: the **transaction pooler** string (port 6543)
   - `DATABASE_POOL_MAX`: `1`
   - every `NEXT_PUBLIC_*` value from your `.env` (university name, time zone, Telegram/Instagram links)
   - `ALLOWED_EMAIL_DOMAINS`, if you want to restrict sign-up
3. Deploy. `DIRECT_URL` isn't needed on Vercel because migrations run from your computer or the GitHub workflow.

**After changing the schema** (`src/db/schema.ts` → `npm run db:generate`), apply it to Supabase with `npm run db:migrate` (or the GitHub workflow) **before** deploying the new code.

---

## Security: why every table has Row Level Security

Supabase automatically exposes tables in the `public` schema through its REST API (`https://<ref>.supabase.co/rest/v1/...`). Anyone with the project's *anon* key can call that API, and the key is designed to be public. Without protection, that API could read the `users` table, including password hashes.

Level Up doesn't use that API: the server talks to Postgres directly. So every table has **RLS enabled with no policies** (migration `drizzle/0001_enable_rls.sql`):

- the app connects as the table owner, which is not restricted by RLS, so everything works;
- the REST API roles (`anon`, `authenticated`) see **no rows** and can't insert, update or delete anything.

Supabase's **Security Advisor** will list "RLS enabled, no policy" for these tables. That's informational and intended. If you want, you can also switch off the REST API entirely under **Project Settings → Data API**.

The Supabase dashboard's own **Authentication** section (`auth.users`) stays empty. Level Up uses its own accounts in `public.users`.

## Free plan notes

- 500 MB database, which is plenty for one university's MVP.
- Projects are **paused after 7 days without activity**. Restore one from the dashboard with one click (data is kept). Any regular usage keeps it awake.
- Daily backups are available on paid plans. On the free plan you can export data from the dashboard or with `pg_dump` using the session pooler string.

## Troubleshooting

| Error | Fix |
| --- | --- |
| `password authentication failed` | Wrong password or unencoded special characters. Reset it under **Project Settings → Database**, preferably letters and digits only. |
| `Tenant or user not found` | The pooler user must be `postgres.<project-ref>`, and the host region must match your project. Copy the string again from **Connect**. |
| `getaddrinfo ENOTFOUND db.<ref>.supabase.co` / `ENETUNREACH` | You used the IPv6-only direct connection. Use the pooler strings instead. |
| `prepared statement "…" already exists` | Only happens with custom clients on port 6543. The app's client already disables prepared statements (`prepare: false`). |
| Migrations hang or fail on port 6543 | `DIRECT_URL` must be the **session pooler** (port 5432), not the transaction pooler. |
| `npm run db:reset` refuses to run | Safety guard: it would delete all data in Supabase. If you really mean it: `ALLOW_REMOTE_RESET=yes npm run db:reset`. |

## Local development with the Supabase CLI (optional)

If you have Docker, the [Supabase CLI](https://supabase.com/docs/guides/local-development) runs a full local Supabase:

```bash
supabase init && supabase start
# then in .env (both URLs point to the local database):
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
npm run db:migrate && npm run db:seed
```

The plain `docker compose up -d` database from the README works just as well.

## Going further with Supabase

These Supabase features fit naturally as next steps:

- **Realtime:** push new chat messages instantly instead of polling every 3 seconds (`src/features/chat/components/chat-room.tsx`).
- **Storage:** upload club logos, event covers and avatars instead of pasting image URLs.
- **Auth:** sign in with Google or e-mail magic links (requires moving accounts to Supabase Auth).
