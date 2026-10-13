# VYRA

High Performance for Everybody.

VYRA is a mobile-first health and fitness web app prototype built with Next.js App Router, TypeScript, Tailwind CSS, shadcn-style local UI primitives, Lucide icons, Recharts, Framer Motion, and localStorage persistence.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Implemented

- Mobile-first app shell with Home, Activity, Nutrition, Health/Cycle, and VYRA AI tabs.
- Working onboarding, local profile preferences, light/dark theme, and Demo Mode labeling.
- Readiness, activity, sleep, resting heart rate, nutrition, supplement, and optional cycle tracking UI.
- Functional local logging flows for workouts, food, supplements, and cycle entries.
- Deterministic local VYRA AI insight panel and downloadable PDF report.
- PWA manifest and app icon.

## Privacy and Limits

This prototype stores data only in browser `localStorage`. It has no production health backend, no real wearable permissions, no analytics, no payment processing, and no medical certification. Demo trends and readiness scores are simulated and are not clinically validated.
