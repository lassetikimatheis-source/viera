# Connections and testing

## Test now, without provider credentials

Open `/?sandbox=1#profile/connections`. This uses the separate localStorage key
`vyra-test-v1`; the personal diary remains in `vyra-personal-v2`.
In Xcode choose the shared scheme **VYRA-Test**, select an iPhone simulator and Run.
It launches this same isolated connections screen automatically. Use **VYRA** for
the regular personal diary.

1. Load WHOOP test data, inspect the preview, then confirm the test import.
2. Open Home, sleep, stress measurement details, and the training history.
3. Repeat the WHOOP import. Stable external IDs prevent duplicate records.
4. Load Strava test data. The sample represents the same workout, so the preview
   flags it and skips it by default. This is a heuristic for review, not a promise
   that every cross-provider duplicate can be identified automatically.
5. Load Apple Health test data and confirm the source-selection preview.
6. Return to the personal diary through the connections screen.

These are synthetic fixtures, not a provider sandbox or a live device connection.
The normalizer and import merge are shared with real API data.

## Apple Health on an iPhone

Open `ios/VYRA.xcodeproj`, choose your developer team and a unique bundle ID with
HealthKit enabled, choose an iPhone and Run. In VYRA: Profile > Health connections >
Apple Health. Review the native explanation, choose allowed data in Apple's sheet,
select a source in the import preview and confirm.

The import reads 30 days of permitted metrics and 12 hours of pulse readings.
Denial and absence of data cannot be distinguished by HealthKit. The simulator can
exercise the screens and isolated test data, but does not prove access to a real watch.
No HealthKit write permission or background synchronization is requested.

## WHOOP and Strava registration

Register an app in each provider's own developer dashboard. The implementation
cannot log into real accounts until the provider grants access and client credentials
are configured on the server. Never put secrets in NEXT_PUBLIC variables or Swift.

Server variables (local `.env.local`, and production Vercel environment settings):

```dotenv
VYRA_APP_URL=https://viera-matheis.vercel.app
VYRA_CONNECTION_SECRET=<at-least-32-random-characters>
WHOOP_CLIENT_ID=<registered-client-id>
WHOOP_CLIENT_SECRET=<registered-client-secret>
STRAVA_CLIENT_ID=<registered-client-id>
STRAVA_CLIENT_SECRET=<registered-client-secret>
```

Generate a fresh secret using `openssl rand -hex 32`. Do not commit the result.
For local web OAuth use a development origin and matching registered web callback;
`http://localhost:3021` is accepted only outside production. The native build uses
the production origin. Redeploy after changing production environment settings.

Web callbacks:

- `https://viera-matheis.vercel.app/api/integrations/whoop/callback`
- `https://viera-matheis.vercel.app/api/integrations/strava/callback`

Native callbacks:

- `vyra://viera-matheis.vercel.app/oauth/whoop`
- `vyra://viera-matheis.vercel.app/oauth/strava`

Register the web and native redirect URIs where supported. Strava's authorization
callback domain is `viera-matheis.vercel.app`. Native Strava uses its mobile authorize
endpoint. Native authorization opens ASWebAuthenticationSession, then exchanges the
code through the webview's same-origin server route so cookies stay in the app.

WHOOP requests read-only sleep, recovery, workout and offline scopes. Strava requests
read and activity:read; activities outside that granted scope are not imported.
Read-only API requests fetch the previous 14 days and complete pagination before
offering an import. WHOOP supplies stage totals, not a chronological sleep-phase
timeline in these endpoints; the app does not invent phase timestamps or stress.

## Session behavior

OAuth state and PKCE are generated per attempt. Flow cookies last 10 minutes.
Access and rotating refresh tokens use authenticated AES-GCM encryption in HttpOnly,
SameSite=Lax cookies scoped to `/api/integrations` (Secure over HTTPS). They are never
returned to client JavaScript. Connection cookies expire after 30 days. This is a
per-browser/device integration without a cross-device account database.

Disconnect revokes the provider grant and clears the local connection cookie.
Previously confirmed diary imports remain until deleted by the user. For production
multi-device accounts and parallel background refresh, introduce a durable token
store and distributed refresh locking; this MVP performs explicit user-driven sync.

## Garmin

Direct Garmin Health API access requires approval of the Garmin Connect Developer
Program. No unofficial password login, scraping, or fake OAuth is implemented.
Garmin data already present in Apple Health can be imported from that source.

Official references:

- https://developer.whoop.com/docs/developing/oauth/
- https://developer.whoop.com/api/
- https://developers.strava.com/docs/authentication/
- https://developers.strava.com/docs/reference/
- https://developer.garmin.com/gc-developer-program/health-api/

Checks: `npm test`, `node tests/connections.mjs`, `node tests/native-training.mjs`,
and an iOS simulator build. Provider token exchanges are tested with mocked HTTP
responses; real account approval, rate limits and real-device HealthKit permissions
must still be verified after registration.
