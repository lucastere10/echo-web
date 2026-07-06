# Echo

Echo is a lightweight monolithic web app for AI-powered audio transcription. Upload audio files, transcribe them with OpenAI Whisper, and copy or download the results.

## Stack

- Bun
- TanStack Start
- TypeScript
- Tailwind CSS
- Google OAuth
- JSON file storage (no database)

## Setup

1. Install dependencies:

```bash
bun install
```

2. Copy the environment template:

```bash
cp .env.example .env
```

3. Fill in `.env`:

- `ADMIN_EMAIL` — Google account that receives administrator access
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `OPENAI_API_KEY` — OpenAI API key (server-side only)
- `SESSION_SECRET` — long random string for encrypted sessions
- `APP_URL` — public app URL (e.g. `http://localhost:3000`)

4. Configure Google OAuth:

- Authorized redirect URI: `${APP_URL}/auth/callback`

5. Start the dev server:

```bash
bun run dev
```

## Usage

### Administrator

1. Sign in with the Google account matching `ADMIN_EMAIL`
2. Open **Admin** to create invitation links
3. Share links like `${APP_URL}/invite/<token>`
4. Upload and transcribe audio from the home page

### Invited users

1. Open the invitation link
2. Sign in with Google
3. Upload audio within the invitation limits

## Limits

Configured via environment variables:

- `MAX_FILES_PER_UPLOAD`
- `INVITE_EXPIRATION_HOURS`
- `MAX_FILE_SIZE_MB`
- `MAX_CONCURRENT_JOBS`
- `RATE_LIMIT_PER_MINUTE`

Invitation links also define per-invite upload and file limits.

## Privacy

Audio files are kept in memory during processing and are not stored on disk.

## Production

```bash
bun run build
node dist/server/index.mjs
```

Persist the `data/` directory between deploys so invitation state survives restarts.
