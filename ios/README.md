# VYRA for iPhone

Open `VYRA.xcodeproj`, select the VYRA scheme and an iPhone simulator, then Run.
For a physical device, select your Apple developer team in Signing & Capabilities
and register a unique bundle identifier with the HealthKit capability.
No developer account, signing certificate, or provisioning profile is committed.

## Architecture

SwiftUI hosts the existing application in a persistent WKWebView. Its only in-app
web origin is https://viera-matheis.vercel.app. This preserves the Next.js API
routes for food search and optional AI without embedding server secrets in iOS.
The web UI detects the native bridge and removes the simulated device chrome.
This is a hybrid app, not a complete SwiftUI rewrite; cold starts require internet.
Web updates are deployed independently to Vercel. Safari data is not automatically
shared with this app's WKWebView storage. Backups can be exported/imported manually.

## HealthKit

From Health connections, request read-only access. A native consent sheet precedes
Apple's permission dialog. The reader queries the last 30 days, then passes records
to the existing source-selection and import preview. Nothing is saved until the
user confirms. No Health write permissions or background delivery are requested.
Denied read access is intentionally indistinguishable from no data in HealthKit.
Imports over 10,000 samples per type fail explicitly instead of silently truncating.
SDNN is supported; RMSSD native querying is not implemented yet. Both methods remain
distinct in file imports. Measurements are not converted into a claimed stress score.

Health data is stored in the app's web storage, not a clinical or audited encrypted
database. Existing AI sharing remains an explicit separate action. Before App Store
distribution, review privacy disclosures, retention, authentication, storage protection,
HealthKit policy compliance, app icons, and real-device behavior. Do not market this
prototype as medically validated or fully synchronized.

## Scope

Included: existing dashboard, nutrition/manual food/barcode flows, sleep imports,
training timer plus plans/logs/progress, supplements, optional cycle diary, profile,
backups and preferences. AI requires AI_GATEWAY_API_KEY and VYRA_AI_MODEL on the server.
Coach accounts, secure cross-user sharing, Garmin/WHOOP/Strava OAuth, push delivery,
payments, automatic live training detection and validated stress/readiness are not
implemented. A simulator build does not validate real wearable readings.

Build check:
`xcodebuild -project ios/VYRA.xcodeproj -scheme VYRA -sdk iphonesimulator -configuration Debug -derivedDataPath /tmp/vyra-ios-build CODE_SIGNING_ALLOWED=NO build`
