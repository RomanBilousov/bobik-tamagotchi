# Bobik 3D

Bobik 3D is a Vite + React tamagotchi-style game with a 3D dog scene built on
`three`, `@react-three/fiber`, and `@react-three/drei`.

## Stack

- React 18
- Vite 5
- React Router 6
- Supabase Auth + Postgres
- Three.js / react-three-fiber

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY` for older projects).
4. Apply the SQL migration from `supabase/migrations/`.
5. Start the app with `npm run dev`.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## Notes

- The app now expects Supabase to be configured.
- Legacy browser data is migrated on first successful sign-in for a user.
