# RefineAI

RefineAI is a loop prompting chatbot that generates, critiques, and refines AI output until it matches your target description (90%+ quality score). Sessions and rounds are persisted in Supabase.

## Features

- **Automatic loop**: Generate → Critique → Refine until quality hits 90%+
- **Supabase persistence**: Every session and round saved to the database
- **Session history**: Browse past sessions and view all rounds
- **Live status**: Generating / Critiquing / Refining indicators
- **Quality score bar**: Visual 0–100% progress each round
- **STOP button**: Halt the loop anytime
- **Final output**: Green highlight + copy button when target is met
- **Dark theme**: Clean, modern UI with mobile-responsive drawer sidebar

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API (`gpt-4o` by default)
- Supabase (PostgreSQL)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql)
3. Copy your project URL and anon key from **Settings → API**

### 3. Configure environment

Copy the example env file and fill in your keys:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Never commit `.env.local`** — it is gitignored.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Verify connections

```bash
curl http://localhost:3000/api/health
```

Expected response when configured correctly:

```json
{ "openai": "configured", "supabase": "ok" }
```

## How the Loop Works

| Round | Task      | Description                          |
|-------|-----------|--------------------------------------|
| 1     | Generate  | First attempt based on user target   |
| 2     | Critique  | What is missing or wrong?            |
| 3     | Refine    | Improve based on critique            |
| 4+    | Alternate | Critique → Refine until score ≥ 90%  |

The loop stops when:
- Quality score reaches **90%+** (session status: `completed`)
- User clicks **STOP** (session status: `stopped`)
- **12 rounds** max (session status: `completed`)

## Database Schema

**sessions**
- `id`, `target`, `status` (running/completed/stopped), `final_output`, `created_at`

**rounds**
- `id`, `session_id`, `round_number`, `output`, `critique`, `score`, `created_at`

## Project Structure

```
app/
  api/
    chat/route.ts         → OpenAI loop API
    health/route.ts       → Connection health check
  components/
    LoopApp.tsx           → Main app state + layout
    SessionHistory.tsx    → Past sessions list
    Sidebar.tsx           → Session + round history
    ChatArea.tsx          → Main output display
    InputBox.tsx          → User target input
    StatusBar.tsx         → Loop status + quality score
    OutputCard.tsx        → Each round's output card
  lib/
    loopEngine.ts         → Client-side loop orchestration
    openaiClient.ts       → OpenAI API wrapper
    supabaseClient.ts     → Supabase client
    db.ts                 → Database helper functions
    types.ts              → Shared types
supabase/
  schema.sql              → Database schema + RLS policies
```

## Deploy to Vercel

1. Push this repo to GitHub (see below)
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add environment variables (Production + Preview):

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI secret key |
| `OPENAI_MODEL` | `gpt-4o` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

4. Deploy and verify `/api/health` returns `"supabase": "ok"`

## Scripts

| Command         | Description              |
|-----------------|--------------------------|
| `npm run dev`   | Start development server |
| `npm run build` | Production build         |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |

## Security Note

The MVP uses open RLS policies (anon read/write) since there is no user authentication. For production use with sensitive data, add Supabase Auth and restrict policies per user.

## Success Criteria

- Supabase tables created and connected
- Every loop session saved to DB
- Every round saved with score
- Sidebar shows past sessions from DB
- Clicking old session shows all rounds
- `.env.local` gitignored
- Code on GitHub as `refineai`
- `vercel.json` ready for deployment
- No build errors
