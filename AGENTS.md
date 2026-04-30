# AI Agent Guidance for deshishop-manager

## What this repository is
- Private `Node.js` + `TypeScript` app using `Express` + `better-sqlite3` backend in `server.ts`
- Frontend is `Vite` + `React` + `TypeScript` in `src/`
- Tailwind CSS is used via `@tailwindcss/vite`
- Capacitor Android support is present under `android/`
- Runtime files: `shop.db`, `backups/`, `uploads/`

## Primary developer workflows
- Install: `npm install`
- Run locally: `npm run dev` (starts `tsx server.ts`)
- Build frontend: `npm run build`
- Preview build: `npm run preview`
- Type-check only: `npm run lint`
- Production start: `npm start` or `npm run start:prod`

## Important conventions
- Use ES module syntax (`import` / `export`) and `type: module`
- `server.ts` is the active backend entrypoint in development
- `app.js` mirrors compiled JS and is not the preferred primary source for edits
- `vite.config.ts` defines `BASE_PATH` handling and disables HMR in AI Studio via `DISABLE_HMR`
- Frontend API calls are rewritten in `src/main.tsx` for `BASE_URL` and `/api/` paths

## Environment variables
- `GEMINI_API_KEY` must be set in `.env.local` for the app to run locally
- `JWT_SECRET` may be used for authentication in `server.ts`
- `APP_BASE` / `BASE_PATH` control app routing and API prefix behavior

## Key files and directories
- `server.ts` — backend server, database schema, API endpoints, and socket handling
- `src/App.tsx` — main React app and component composition
- `src/components/` — frontend UI components, login, dashboard, assistant, etc.
- `src/translations.ts` — localization strings and language support
- `android/` — Capacitor Android project files
- `README.md` — minimal local run instructions
- `CPANEL_DEPLOY.md` — deployment notes

## How to approach changes
- Prefer editing TypeScript source files over generated or duplicate JS
- Preserve SQLite schema and backups when changing database structure
- Keep frontend `BASE_PATH` / `API` rewrite behavior consistent with `vite.config.ts` and `src/main.tsx`
- Use `npm run lint` to verify TypeScript validity

## Notes for AI agents
- There is no existing `copilot-instructions.md` or GitHub-specific agent instruction file
- Keep suggestions small and focused: backend changes in `server.ts`, UI changes in `src/`, and build/deploy details in `README.md`
- If a feature spans backend and frontend, coordinate `server.ts` API shape with `src/` request handling
