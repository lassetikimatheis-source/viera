# VYRA personal health workspace

## Implemented

- Five areas: Home, Health, Nutrition, Wellbeing and Profile. Coach is removed.
- Local food diary with portions, macros, custom foods, edit/delete, day selection, water and supplement tracking.
- Open Food Facts search and EAN lookup. Optional camera scanning via ZXing, with a manual fallback. Products without complete macro values are excluded.
- Local Apple Health export.xml/ZIP import, source selection and permissions. Overlapping sleep records are merged; repeated imports are deduplicated.
- Health detail charts, manual measurements, cycle journal (opt-in), reports and configurable goals.
- Local profile/avatar, validated backup import/export and deletion. Data remains in this browser, not an account.
- Opt-in challenge links share a name and a step-count snapshot. This is not live friend synchronization.

## External services and honest limits

- The web app cannot request native HealthKit permissions. Automatic Apple Health sync requires an iOS companion/native implementation; importing an export works today.
- AI photo estimates and chat have server endpoints but remain unavailable until both optional variables in .env.example are configured. No fabricated results are shown. Photo estimates require explicit consent and confirmation before logging.
- Before enabling public AI access, add authenticated users, durable rate limiting and provider spending limits. The current process-local limiter is not a distributed abuse control.
- No real payments, subscriptions, cloud accounts or live friend service are connected. The UI explicitly reflects these states.
- Supplements are an intake log, not dosage recommendations. Reports and model responses are not medical diagnoses.
- New browsers start with clearly labeled sample data. Profile offers removal; real imports replace sample data. Previously stored v1 data is not migrated automatically.

## Verification

Run npm test, npm run lint and npm run build. For browser checks, install the Playwright Chromium browser and run npm run test:e2e against a production server on port 3021 (BASE_URL can override it). PLAYWRIGHT_EXECUTABLE_PATH optionally supplies a browser executable.

Browser coverage includes all five tabs at four viewport sizes, diary CRUD/persistence, supplements by date, cycle entries, metric detail views, goals, XML import/overlap handling/deduplication, challenge links, unavailable AI, denied camera access and data deletion persistence.

Physical camera hardware, configured AI inference, native HealthKit and payment flows have not been tested or claimed as connected.
