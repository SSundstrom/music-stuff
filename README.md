# Spotify Tournament

A multiplayer song tournament game where players vote on which songs best fit chosen categories.

## Features

- **Create Game Sessions**: Session owners authenticate with Spotify to create game rooms
- **Join Sessions**: Other players join with just a name (no Spotify account required)
- **Category Selection**: Players take turns picking categories in round-robin fashion
- **Song Submission**: Players search and submit songs matching the category
- **Tournament Voting**: Single-elimination tournament with blind voting
- **Adaptive Playback**: Songs play for 30 seconds in first round, 15 seconds in later rounds
- **Real-time Updates**: Server-Sent Events (SSE) for live game updates

## Tech Stack

- **Framework**: Next.js 14+ with TypeScript
- **Real-time**: Server-Sent Events (SSE)
- **Database**: SQLite
- **Spotify Integration**: Spotify Web API (OAuth 2.0)
- **Frontend**: React with Tailwind CSS
- **Authentication**: Better Auth

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Spotify Developer Account (free)

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd spotify-tournament
```

2. Install dependencies

```bash
npm install
```

3. Set up Spotify Developer Credentials

   a. Go to <https://developer.spotify.com/dashboard>
   b. Create a new application
   c. Accept the terms and create the app
   d. You'll get Client ID and Client Secret
   e. Add redirect URI: `http://localhost:3000/api/auth/callback/spotify`

4. Create `.env.local` file

```bash
cp .env.example .env.local
```

5. Fill in the environment variables:

```
# From Spotify Developer Dashboard
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

### Running the Application

```bash
npm run dev
```

Access at `http://localhost:3000`

## Game Flow

1. **Landing Page**: Sign in with Spotify or join existing session
2. **Lobby**: Wait for all players to join
3. **Category Selection**: Current player picks a category
4. **Song Submission**: Other players search and submit songs
5. **Tournament**: Single-elimination bracket with voting
6. **Round Repeat**: Next player picks category, repeat from step 3

## Game Rules

- **Category Picker**: The player whose turn it is picks the category but cannot submit a song
- **Voting**: Players vote for the song they think best fits the category
- **No Self-Voting**: Players cannot vote for songs they submitted
- **Duration**: 30 seconds for first round, 15 seconds for subsequent rounds
- **Playback**: Only the session owner's device plays the music

## Project Structure

```
├── app/
│   ├── api/                          # API Routes
│   │   ├── auth/                     # NextAuth configuration
│   │   ├── game/                     # Game endpoints
│   │   └── spotify/                  # Spotify API integration
│   ├── game/                         # Game page
│   ├── lobby/                        # Lobby page
│   └── page.tsx                      # Landing page
├── components/
│   ├── game/                         # Game phase components
│   │   ├── CategoryPhase.tsx
│   │   ├── SongSubmissionPhase.tsx
│   │   ├── TournamentPhase.tsx
│   │   ├── MatchDisplay.tsx
│   │   └── SongSearcher.tsx
│   └── SessionProvider.tsx           # NextAuth provider
├── lib/
│   ├── db.ts                         # Database initialization
│   ├── game-session.ts               # Game session logic
│   ├── spotify.ts                    # Spotify API client
│   ├── tournament.ts                 # Tournament logic
│   └── sse-manager.ts                # SSE management
├── types/
│   ├── game.ts                       # Game type definitions
│   └── next-auth.d.ts                # NextAuth type extensions
└── data/                             # SQLite database (created at runtime)
```

## API Endpoints

### Session Management

- `POST /api/game/create` - Create new session
- `POST /api/game/[sessionId]/join` - Join session
- `GET /api/game/[sessionId]` - Get session state
- `PATCH /api/game/[sessionId]` - Update session

### Game Flow

- `POST /api/game/[sessionId]/category` - Submit category
- `POST /api/game/[sessionId]/submit-song` - Submit song
- `POST /api/game/[sessionId]/vote` - Cast vote
- `POST /api/game/[sessionId]/start-tournament` - Start tournament
- `POST /api/game/[sessionId]/playback` - Control playback

### Search

- `GET /api/spotify/search?q=query` - Search Spotify songs

## Building for Production

```bash
npm run build
npm start
```

## Testing

```bash
npm run test:lint
```

## Spotify Premium Requirement

- Only the **session owner** needs Spotify Premium
- Other players can have free Spotify accounts
- Music plays through the owner's active device

## Known Limitations

- SSE real-time updates are implemented using Server-Sent Events
- Player IDs stored in localStorage (should use sessions in production)
- Match completion auto-advances to next (could add manual advancement)

## Future Enhancements

- Additional SSE events for more granular updates
- Match result animations
- Leaderboard and statistics
- Persistent player ratings
- Custom tournament formats
- Mobile app
- Multi-language support

## License

MIT

## Contributing

Feel free to fork and submit pull requests!
