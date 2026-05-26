# Supabase Setup

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**, choose an organisation, give the project a name (e.g. `quizzicle`), set a strong database password, and pick the region closest to your users.
3. Wait ~2 minutes for the project to provision.

## 2. Get your API credentials

In the Supabase dashboard, open **Project Settings → API**:

| Key | Environment variable |
|-----|----------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` / secret key | `SUPABASE_SERVICE_ROLE_KEY` |

Copy these values into `.env.local` (never commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

> **Security note:** The `service_role` key bypasses Row Level Security. It is only used inside Next.js API routes (server-side) and must never be exposed to the browser.

## 3. Run the migration

1. In the Supabase dashboard, navigate to **SQL Editor**.
2. Click **New query**.
3. Open `supabase/migrations/001_initial_schema.sql`, copy the entire contents, and paste it into the editor.
4. Click **Run** (or press `Cmd/Ctrl + Enter`).

The migration creates all tables, indexes, RLS policies, and wires up the Realtime publication in a single step.

## 4. Enable Realtime

The migration runs `ALTER PUBLICATION supabase_realtime ADD TABLE ...` which registers the tables with Supabase Realtime automatically. To confirm (or enable manually):

1. Go to **Database → Replication** in the Supabase dashboard.
2. Under **supabase_realtime**, verify that `games`, `players`, and `questions` are listed as replicated tables.
3. If any are missing, toggle them on in the UI.

## 5. Verify RLS policies

1. Go to **Authentication → Policies**.
2. Confirm that each table (`games`, `players`, `rounds`, `questions`, `answers`) has a **"Public read access"** `SELECT` policy with the condition `true`.

All write operations are performed by Next.js API routes using the `service_role` key, which bypasses RLS entirely — no insert/update/delete policies are required.
