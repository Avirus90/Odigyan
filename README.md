# OdiGyan Firebase Migration Blueprint

This repository was originally exported from Caffeine with ICP/Canister based backend wiring. This update adds a production-oriented Firebase target architecture so the app can be migrated without changing the current UI experience.

## Tech Stack (Target)

- Frontend: React + TypeScript + Vite + Tailwind + shadcn/ui
- Backend: Firebase Auth, Firestore, Cloud Functions, Storage, Hosting
- Data fetching: React Query + Firebase SDK
- Payments: Razorpay via Cloud Functions

## Added Migration Assets

- Firestore rules: `firebase/firestore.rules`
- Firestore composite indexes: `firebase/firestore.indexes.json`
- Cloud Functions scaffold: `functions/src/index.ts`
- Frontend Firebase services:
  - `src/frontend/src/services/firebase/config.ts`
  - `src/frontend/src/services/firebase/auth.ts`
  - `src/frontend/src/services/firebase/studentProfile.ts`
  - `src/frontend/src/services/firebase/courses.ts`
  - `src/frontend/src/services/firebase/banners.ts`
- Environment template: `.env.example`
- Migration and validation checklist: `docs/firebase-migration-plan.md`

## Setup

1. Install dependencies.
   ```bash
   pnpm install
   ```
2. Copy env template and fill values.
   ```bash
   cp .env.example .env
   ```
3. Configure Firebase project.
   ```bash
   firebase login
   firebase use <project-id>
   ```
4. Deploy rules and indexes.
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
5. Build and deploy functions.
   ```bash
   cd functions
   pnpm install
   pnpm build
   firebase deploy --only functions
   ```
6. Build and deploy hosting.
   ```bash
   pnpm --filter odigyan-frontend build
   firebase deploy --only hosting
   ```

## Why README is visible instead of app?

If you open the GitHub repository URL, GitHub always shows `README.md` (code view), not the running app.

To open the frontend app:

1. Build frontend output into `src/frontend/dist`:
   ```bash
   pnpm --filter odigyan-frontend build
   ```
2. Deploy Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```
3. Open the Firebase Hosting URL shown after deploy (for example `https://odigyan-a5d08.web.app`).

`firebase.json` is configured for SPA routing so all routes resolve through `index.html`.

## Scripts

At repository root:

- `pnpm dev`
- `pnpm build`
- `pnpm deploy:hosting`
- `pnpm deploy:functions`

These scripts assume the Firebase-first setup and the `odigyan-frontend` workspace package name.

## Migration Notes

See `docs/firebase-migration-plan.md` for:

- ICP to Firebase service mapping
- Step-by-step migration sequence
- Testing checklist for auth/profile/linking/enrollment/banner/current affairs flow
