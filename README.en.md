[Русский README](README.md)

# Bobik 3D

Bobik 3D is a browser-based tamagotchi-style game built with React, Vite, and
react-three-fiber.

The game combines a lightweight 3D scene, player progression, leaderboard
features, and a Supabase-backed account system.

## Features

- 3D dog scene rendered with `three` and `@react-three/fiber`
- Browser-friendly game loop with persistence
- Supabase authentication and player profiles
- Leaderboard and progression systems
- Telegram-related hooks for game and admin workflows

## Stack

- React 18
- Vite 5
- React Router 6
- Three.js
- `@react-three/fiber`
- Supabase Auth + Postgres

## Getting Started

### Requirements

- Node.js 18+
- npm
- a Supabase project

### Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in the required environment variables:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

   Older setups can still use `VITE_SUPABASE_ANON_KEY`.

4. Apply the SQL migrations from [`supabase/migrations/`](supabase/migrations/).

5. Start the development server:

   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - start the Vite development server
- `npm run build` - create a production build
- `npm run lint` - run ESLint
- `npm run preview` - preview the production build locally
- `npm run smoke:auth` - run the local auth smoke test

## Environment Variables

See [`.env.example`](.env.example) for the expected variables.

If you want Telegram or admin flows to work, also configure:

- `TELEGRAM_GAME_BOT_TOKEN`
- `TELEGRAM_ADMIN_BOT_TOKEN`
- `ADMIN_RPC_SECRET`

## Project Structure

- [`src/`](src/) - React app and gameplay logic
- [`api/`](api/) - server-side endpoints for analytics, cron jobs, and Telegram
- [`supabase/`](supabase/) - local Supabase config and SQL migrations
- [`scripts/`](scripts/) - smoke tests and maintenance helpers

## Notes

- The game expects Supabase to be configured before local play.
- Legacy browser data is migrated on first successful sign-in.
- The repository contains the app code and migrations, but not live production credentials.
