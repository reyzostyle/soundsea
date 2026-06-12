# SoundSea — local music player

Paste a YouTube or TikTok link → the backend downloads the audio as mp3 with yt-dlp → the web app plays it. Playlists are stored in localStorage.

## Requirements

- Node 18+
- `yt-dlp` and `ffmpeg` on PATH

## Run

Backend (port 4000):

```sh
cd backend
npm install
npm run dev
```

Frontend (port 3000):

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

## API

- `POST /api/download` — body `{ "url": "<youtube or tiktok url>" }`, returns `{ title, filename, duration, thumbnail }`
- `GET /api/audio/:filename` — serves the downloaded mp3 (supports Range requests for seeking)

Downloaded files live in `backend/public/downloads/`.
