# Spotify Tournament

A multiplayer party game built around the Spotify catalogue. The host signs in
with Spotify; other players join from any device with just a name. Two game
modes are included:

- **Tournament**: a single-elimination bracket where players submit songs for a
  category and the table votes on which one fits best.
- **Guess Game**: a picker plays a song through the host's Spotify device and
  the other players race to guess the title and artist for points.

## Features

- Spotify OAuth for the host (Better Auth)
- Name-only join for everyone else (no Spotify account required)
- Playback through the host's Spotify Connect device via the Web Playback SDK
- Round-robin category selection in tournament mode
- Single-elimination bracket with blind voting and no self-voting
- Adaptive playback length (30s in round 1, 15s in later rounds)
- Live updates over Server-Sent Events
- QR code for quick join from phones on the same network

## Tech stack

- **Framework**: Next.js 16 (App Router) with React 19 and TypeScript
- **Auth**: Better Auth with the Spotify social provider
- **Database**: PostgreSQL via Prisma with the Neon serverless adapter
- **Hosting**: Fly.io (production app + staging app)
- **Realtime**: Server-Sent Events
- **Spotify**: Web API + Web Playback SDK
- **Styling**: Tailwind CSS v4
- **Component workshop**: Storybook
- **Tests/lint**: Vitest, ESLint

## Prerequisites

- Node.js 24+ (matches `Dockerfile`)
- npm
- A Spotify developer app (free, Premium required for the host at play time)
- A Postgres database — Neon recommended (free tier is enough for development)
- For deploys: a Fly.io account and `flyctl` installed

## Local setup

### 1. Clone and install

```bash
git clone <repository-url>
cd spotify-tournament
npm install
```

### 2. Create a Spotify app

1. Go to <https://developer.spotify.com/dashboard> and create a new app.
2. Copy the **Client ID** and **Client Secret**.
3. Add the redirect URI: `http://localhost:3000/api/auth/callback/spotify`.
   (If you run with HTTPS or on a LAN IP, add those variants too.)

### 3. Provision a Neon database

1. Sign in at <https://neon.tech> and create a project.
2. From the project dashboard, copy the **pooled connection string**.
3. Keep it handy for the `.env` step below.

Any Postgres works (e.g. a local `postgres://` URL via Docker), but the
production code path uses `@prisma/adapter-neon`, so Neon is the path with
the fewest surprises.

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# Better Auth
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000

# Spotify OAuth
SPOTIFY_CLIENT_ID=<from Spotify dashboard>
SPOTIFY_CLIENT_SECRET=<from Spotify dashboard>

# Neon Postgres
DATABASE_URL=postgres://<user>:<password>@<host>/<db>?sslmode=require
```

### 5. Run the app

```bash
npm run dev
```

`npm run dev` runs `prisma migrate deploy` before starting Next, so the schema
is applied to whatever `DATABASE_URL` points at.

Open <http://localhost:3000>.

### Optional: HTTPS on your LAN

To test multi-device play (e.g. join from your phone via QR code) the host's
browser needs HTTPS so the Web Playback SDK and Spotify OAuth callback work
over the LAN IP:

```bash
./scripts/setup-https.sh
```

The script generates a self-signed cert in `certs/` covering `localhost`,
`127.0.0.1`, and your current Wi‑Fi IP. Trust the cert on macOS with the
command the script prints, then run Next with HTTPS:

```bash
next dev --experimental-https \
  --experimental-https-key ./certs/server.key \
  --experimental-https-cert ./certs/server.crt
```

Update `BETTER_AUTH_URL` and the Spotify redirect URI to the matching
`https://<lan-ip>:3000` value.

## Database

The Prisma schema lives in `prisma/`. The generated client is committed to
`prisma/generated/`.

```bash
npm run db:migrate   # create a new migration locally
npm run db:gen       # regenerate the Prisma client
npm run db:reset     # drop everything and re-run migrations (destructive)
```

## Deploying to Fly.io

There are two apps: `spotify-tournament` (production, `fly.toml`) and
`spotify-tournament-staging` (`fly.staging.toml`). Both deploy the same
`Dockerfile` and run `prisma migrate deploy` on release.

### One-time setup per app

```bash
# Install flyctl: https://fly.io/docs/flyctl/install/
flyctl auth login

# Set secrets (production)
flyctl secrets set \
  BETTER_AUTH_SECRET=<value> \
  SPOTIFY_CLIENT_ID=<value> \
  SPOTIFY_CLIENT_SECRET=<value> \
  DATABASE_URL=<neon pooled connection string> \
  --app spotify-tournament

# Same for staging
flyctl secrets set ... --app spotify-tournament-staging --config fly.staging.toml
```

`BETTER_AUTH_URL` is set as a non-secret `[env]` in each `fly.toml`.

### Add Fly URLs to Spotify

Add the following redirect URIs in the Spotify dashboard:

- `https://spotify-tournament.fly.dev/api/auth/callback/spotify`
- `https://spotify-tournament-staging.fly.dev/api/auth/callback/spotify`

### Deploy

```bash
flyctl deploy                                  # production
flyctl deploy --config fly.staging.toml        # staging
```

A `fly-deploy.yml` GitHub workflow exists but is currently gated off
(`if: false`); deploys are done manually with `flyctl` for now.

## Game flow

1. **Landing**: host signs in with Spotify, others join with a name.
2. **Lobby**: host shares the join link / QR code, kicks anyone, picks a mode.
3. **Tournament mode**: round-robin category picks → submissions → bracket vote.
4. **Guess mode**: each turn one player picks a song; the rest guess title/artist.
5. **Round repeat** until the host ends the session.

### Tournament rules

- The category picker doesn't submit a song that round.
- Players can't vote for their own submission.
- Round 1 plays 30 seconds of each song; later rounds play 15 seconds.
- Only the host's Spotify device plays audio.

## Project structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...auth]/        # Better Auth handler
│   │   ├── game/
│   │   │   ├── create/
│   │   │   └── [sessionId]/       # join, category, submit-song, vote,
│   │   │                          # start-tournament, play-song, new-round,
│   │   │                          # playback, kick, stream (SSE), guess/*
│   │   ├── playback/              # pause / resume / seek / transfer
│   │   └── spotify/               # search, devices, token, transfer-playback
│   ├── auth/signin/
│   ├── lobby/[sessionId]/
│   ├── game/[sessionId]/
│   ├── tournament/[sessionId]/
│   ├── guess/[sessionId]/
│   └── page.tsx
├── components/
│   ├── SessionProvider.tsx        # Better Auth client provider
│   ├── SpotifyPlayer.tsx          # Web Playback SDK wrapper
│   ├── SpotifyPlayerProvider.tsx
│   └── game/
│       ├── CategoryPhase.tsx
│       ├── SongSubmissionPhase.tsx
│       ├── SongSearcher.tsx
│       ├── TournamentPhase.tsx
│       ├── MatchDisplay.tsx
│       ├── SongMatchCard.tsx
│       ├── GameShell.tsx
│       ├── QRCodeModal.tsx
│       ├── SettingsModal.tsx
│       └── guess/                 # Guess game phases & scoreboards
├── hooks/                         # useAuthSession, useGameSession,
│                                  # useTournamentSession, useGuessSession,
│                                  # useSSEStream
├── lib/
│   ├── auth.ts                    # Better Auth config + Spotify token refresh
│   ├── db-prisma.ts               # Prisma client w/ Neon adapter
│   ├── game-session.ts
│   ├── tournament.ts
│   ├── guess-game.ts
│   ├── guess-scoring.ts
│   ├── spotify.ts
│   └── sse-manager.ts
├── prisma/
│   ├── schema.prisma
│   ├── models/
│   ├── migrations/
│   └── generated/                 # generated Prisma client (committed)
├── scripts/
│   ├── init-db.ts
│   └── setup-https.sh
├── Dockerfile
├── docker-entrypoint.js
├── fly.toml
└── fly.staging.toml
```

## Key API endpoints

### Auth

- `GET/POST /api/auth/[...auth]` — Better Auth (sign in, callbacks, session)

### Session management

- `POST /api/game/create` — create a session
- `POST /api/game/[sessionId]/join` — join with a player name
- `POST /api/game/[sessionId]/kick` — host removes a player
- `GET  /api/game/[sessionId]` — fetch session state
- `PATCH /api/game/[sessionId]` — update session
- `GET  /api/game/[sessionId]/stream` — SSE event stream

### Tournament flow

- `POST /api/game/[sessionId]/category` — pick the round's category
- `POST /api/game/[sessionId]/submit-song` — submit a song
- `POST /api/game/[sessionId]/start-tournament` — kick off the bracket
- `POST /api/game/[sessionId]/play-song` — host plays the current match
- `POST /api/game/[sessionId]/vote` — cast a vote
- `POST /api/game/[sessionId]/new-round` — advance to the next round

### Guess game flow

- `POST /api/game/[sessionId]/guess/config` — host configures guess game
- `POST /api/game/[sessionId]/guess/start` — start the guess game
- `POST /api/game/[sessionId]/guess/pick-song` — picker chooses a song
- `POST /api/game/[sessionId]/guess/start-playback` — start the round
- `POST /api/game/[sessionId]/guess/submit-guess` — submit a guess
- `POST /api/game/[sessionId]/guess/next-turn` — advance to the next picker
- `POST /api/game/[sessionId]/guess/restart` — reset scores and start again

### Spotify / playback

- `GET  /api/spotify/search?q=...` — song search (filtered by host's market)
- `GET  /api/spotify/devices` — list the host's Spotify Connect devices
- `POST /api/spotify/transfer-playback` — move playback to a chosen device
- `GET  /api/spotify/token` — short-lived access token for the Web Playback SDK
- `POST /api/playback`, `/api/playback/pause`, `/resume`, `/seek` — host controls

## Scripts

```bash
npm run dev               # prisma migrate deploy + next dev
npm run build             # prisma generate + next build
npm start                 # next start (production)
npm run test:lint         # eslint
npm run test:lint:fix     # eslint --fix
npm run db:migrate        # prisma migrate dev
npm run db:gen            # prisma generate
npm run db:reset          # prisma migrate reset (destructive)
npm run storybook         # storybook dev on :6006
npm run build-storybook   # static storybook build
```

## Spotify Premium requirement

Only the **host** needs Spotify Premium — audio always plays on the host's
active Spotify device. Joining players don't need a Spotify account at all.

## Known limitations

- Player IDs are stored in `localStorage` on join devices.
- Match completion auto-advances; there is no manual "next" button.
- The Fly deploy GitHub workflow is gated off; deploys are manual.

## License

MIT
