# Tap

One profile for everything you play, stream and do. Link your accounts and Tap turns them into a profile card your friends can see.

This first version supports **chess.com** (ratings per mode, win/loss/draw record, puzzles and recent games) via the free public [chess.com Published-Data API](https://www.chess.com/news/view/published-data-api). No login or API key is needed.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

A profile lives at a shareable URL such as `/profile?chesscom=hikaru`. Each linked service is one query parameter, so future integrations stack: `/profile?chesscom=hikaru&strava=...`.

## Deploy

Import the repo on [Vercel](https://vercel.com/new). No environment variables are required.

## Adding a service

Every integration is a **provider** (see `src/lib/providers/types.ts`):

1. Create `src/lib/providers/<id>/` with a fetcher that returns a `ProviderResult` and a section component.
2. Export a `Provider` from its `index.tsx` (`id`, `name`, `accent`, `validateAccount`, `normalizeAccount`, `fetchAccount`, `renderSection`).
3. Add it to `providers` in `src/lib/providers/registry.ts` (and remove it from `upcoming`).

The profile page renders every provider found in the URL with no other changes. Services that need OAuth (Spotify, Strava, Xbox, Epic) will also need sign-in and storage for tokens, which is the next step after this version.

## Local testing without the network

Set `CHESSCOM_API_BASE` to point the chess.com provider at a mock server, e.g. `CHESSCOM_API_BASE=http://localhost:4010/pub npm run dev`.

## Stack

Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4. chess.com responses are cached for a few minutes with `"use cache"`.
