# Native WHOOP-Anbindung

## Status und Architektur

WHOOP-Anmeldung, Dashboard, Trainingsliste und Verbindungseinstellungen laufen
in SwiftUI. ASWebAuthenticationSession oeffnet nur die WHOOP-Anmeldung. Der
vorhandene hybride Funktionsumfang bleibt unter "Weitere Bereiche" erreichbar;
sein bisheriger Datenspeicher ist nicht mit dem neuen nativen Bestand vereint.
Es handelt sich nicht um eine vollstaendige Neuentwicklung aller App-Bereiche.

Der kleine Server-Endpunkt `/api/native/whoop` bereitet OAuth vor und tauscht bzw.
erneuert Tokens. Gesundheitsdaten ruft das iPhone direkt von WHOOP API v2 ab.
Der Client Secret verbleibt ausschliesslich in Server-Umgebungsvariablen.
Es werden keine OAuth-Tokens an JavaScript, WebView oder Callback-URLs gegeben.

## 1. WHOOP Developer Dashboard

1. Unter https://developer-dashboard.whoop.com eine Entwickler-App anlegen.
2. Namen, Kontakt und eine tatsaechlich verfuegbare Datenschutz-URL hinterlegen.
3. Folgende Redirect URI exakt registrieren:
   `vyra://viera-matheis.vercel.app/oauth/whoop`
4. Freigaben: `offline`, `read:sleep`, `read:recovery`, `read:workout`,
   `read:cycles`. VYRA braucht weder Profil noch E-Mail oder Schreibzugriff.
5. Client ID und Client Secret ausschliesslich am Backend hinterlegen.

Laut WHOOP koennen neue Sandbox-Apps bis zu zehn WHOOP-Mitglieder ohne
oeffentliche App-Freigabe verbinden. Fuer breitere Verteilung die aktuellen
Approval-, Branding- und API-Nutzungsbedingungen pruefen. VYRA ist keine
offizielle WHOOP-App und die Implementierung ersetzt diese Freigabe nicht.

## 2. Backend einrichten

In Vercel fuer die Production-Umgebung setzen, anschliessend neu deployen:

- `WHOOP_CLIENT_ID`: ID aus dem Dashboard.
- `WHOOP_CLIENT_SECRET`: Secret aus dem Dashboard, niemals in Git oder Xcode.
- `VYRA_CONNECTION_SECRET`: kryptografisch zufaelliger Schluessel, mindestens
  32 Zeichen; schuetzt kurzlebige, verschluesselte OAuth-Transaktionen.
- `VYRA_APP_URL`: `https://viera-matheis.vercel.app`

`GET https://viera-matheis.vercel.app/api/native/whoop` zeigt nur
`{"configured":true}` oder `false`, keine Zugangsdaten. Konfiguriert bedeutet
nicht, dass Zugangsdaten schon mit WHOOP erfolgreich getestet wurden.

State und Redirect werden sowohl nativ als auch serverseitig geprueft.
Die OAuth-Bibliothek sendet PKCE S256 mit Code-Verifier. Die aktuelle WHOOP-
Dokumentation bestaetigt dessen serverseitige Durchsetzung nicht ausdruecklich.
Der reale Login muss deshalb nach Registrierung mit dem Provider getestet
werden; die Sicherheit setzt zusaetzlich auf Client Secret, State, kurze
Transaktionslaufzeit und den Betriebssystem-Authentifizierungsdialog.
Der Endpunkt hat ein instanzlokales Rate-Limit. Vor breitem Produktivbetrieb
ein verteiltes Limit, Abuse-Schutz und gegebenenfalls App Attest ergaenzen.

## 3. Xcode und Testen

`VYRA.xcodeproj` oeffnen, Team und eindeutige Bundle ID in Signing waehlen.
HealthKit-Capability und Usage Description sind vorhanden. Das URL-Scheme
`vyra` ist bereits in Info.plist registriert. Bei Domainwechsel muessen
Server-URL, native Redirect-Pruefung und WHOOP-Registrierung gemeinsam wechseln.

- Scheme **VYRA-Test**: isolierte Beispieldaten im Arbeitsspeicher, ohne
  Netzwerk oder Keychain-Zugriff im nativen Bereich. Ein WHOOP-Training und
  seine HealthKit-Kopie ergeben eine angezeigte Einheit.
- Scheme **VYRA**: echter lokaler Bestand. Einstellungen > Mit WHOOP verbinden.
  Nach Anmeldung werden die letzten 30 Tage geladen. Aktualisierung erfolgt
  manuell, nicht per Push oder kontinuierlicher Hintergrundsynchronisierung.
- Auf echtem iPhone testen: Zustimmung, Abbruch, abgelehnte Freigaben,
  erneuter Login, Tokenablauf/Rotation, fehlendes Netz, Widerruf, HealthKit-
  Import und gemeinsamer Import derselben WHOOP-Einheit.

Automatisierte Pruefungen:

```sh
swift test --package-path ios --scratch-path /tmp/vyra-native-core-tests
xcodebuild -project ios/VYRA.xcodeproj -scheme VYRA-Test -sdk iphonesimulator -configuration Debug -derivedDataPath /tmp/vyra-ios-native-whoop CODE_SIGNING_ALLOWED=NO build
npm test
npm run build
```

## Daten, Schutz und Grenzen

- Tokens: Keychain, `WhenUnlockedThisDeviceOnly`. Refreshes werden im Store
  serialisiert; rotierte Tokens ersetzen sofort die alten Tokens.
- Gesundheitsdaten: lokales Application-Support-JSON mit vollstaendigem
  iOS-Dateischutz und Ausschluss vom Backup. Kein Upload an den Assistenten.
  Die vorhandenen Web-Bereiche haben weiterhin ihren separaten Speicher.
  Der neue HealthKit-Import fordert keinen Live-Puls und kein Koerpergewicht
  an, da diese native Uebersicht sie nicht nutzt. Der Legacy-Import bleibt
  unveraendert und kann diese Kategorien weiterhin verwenden.
- "WHOOP trennen" widerruft den API-Zugriff und entfernt direkte WHOOP-Daten
  sowie Tokens lokal. Bereits in Apple Health vorhandene Kopien verbleiben
  dort. Bei Netzproblemen gibt es eine getrennte lokale Entfernung mit dem
  Hinweis, die Freigabe im WHOOP-Konto ebenfalls zu widerrufen.
- WHOOP liefert Schlafdauer, Phasendauern, Schlafleistung, Regelmaessigkeit,
  Effizienz, Recovery, Ruhepuls, RMSSD, Trainingswerte und Zyklusbelastung,
  soweit gemessen und bereits bewertet. Fehlende Werte bleiben offen.
- WHOOP-Phasensummen sind keine chronologische Schlafphasen-Zeitlinie.
  Sich widersprechende HealthKit-Phasen werden nicht doppelt addiert.
- Recovery ist der WHOOP-Score, kein eigener medizinisch validierter VYRA-
  Gesundheits- oder langfristiger Fitness-Score. Kein erfundener Stresswert:
  die oeffentliche API stellt den WHOOP-Stressmonitor nicht bereit.
- WHOOP-Zykluskalorien (kJ / 4.184) und Zyklusschritte sind keine identischen
  Apple-Health-Tagesaktivwerte; sie werden gesondert dargestellt.
  RMSSD und SDNN bleiben verschiedene HRV-Messverfahren.
- Trainings werden ueber externe IDs bzw. eng uebereinstimmende Zeitintervalle
  mit Quellen-/Sportartabgleich zusammengefuehrt. WHOOP-Direktdaten haben
  Vorrang. Mehrfachimporte sind idempotent. Ohne gemeinsame IDs bleibt der
  Abgleich heuristisch; unklare Einheiten werden nicht blind verworfen.
- Pro Abruf maximal 20 Seiten je Datentyp; Fehler speichern keine Teildaten.
  WHOOP-Rate-Limits und Anbieterfehler werden angezeigt, kein Dauer-Polling.

Noch erforderlich: eigene Entwickler-App und Server-Secrets, echter OAuth-
Durchlauf inklusive Refresh/Widerruf sowie ein realer iPhone-/HealthKit-Test.
Simulator und Mock-Tests ersetzen diese Pruefung nicht.

## Offizielle Referenzen

- https://developer.whoop.com/docs/developing/oauth/
- https://developer.whoop.com/api/
- https://developer.whoop.com/docs/developing/app-approval/
- https://developer.whoop.com/docs/developing/design-guidelines/
