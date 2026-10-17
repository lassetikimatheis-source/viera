import SwiftUI

@main
struct VYRAApp: App {
    var body: some Scene {
        WindowGroup { NativeRootView() }
    }
}

struct ContentView: View {
    @StateObject private var model = WebModel()

    var body: some View {
        ZStack {
            Color(uiColor: .systemBackground).ignoresSafeArea()
            VYRAWebView(model: model)
            if model.loading {
                VStack(spacing: 16) {
                    Text("VYRA").font(.largeTitle.bold())
                    ProgressView("Deine Übersicht wird geladen")
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(uiColor: .systemBackground))
            }
            if let error = model.error {
                ContentUnavailableView {
                    Label("VYRA ist gerade nicht erreichbar", systemImage: "wifi.slash")
                } description: {
                    Text(error)
                } actions: {
                    Button("Erneut versuchen") { model.reload() }.buttonStyle(.borderedProminent)
                }
                .background(Color(uiColor: .systemBackground))
            }
        }
        .preferredColorScheme(model.colorScheme)
        .sheet(isPresented: $model.showHealth) {
            NavigationStack {
                Form {
                    Section {
                        Label("Apple Health", systemImage: "heart.fill").foregroundStyle(.pink)
                        Text("Übernimm freigegebene Daten der letzten 30 Tage, aktuelle Pulsmessungen der letzten 12 Stunden. Anschließend wählst du in VYRA die Quelle aus und bestätigst den Import.")
                    }
                    Section("Du entscheidest") {
                        Text("Schritte, Schlaf, Puls, Ruhepuls, HRV, Aktivenergie, Gewicht und Trainings. VYRA schreibt keine Daten in Apple Health.")
                        Text("Importierte Werte werden im lokalen Speicher dieser App abgelegt. Eine Weitergabe an KI erfolgt nur nach separater Freigabe in VYRA.")
                    }
                    Section {
                        Button {
                            Task { await model.importHealth() }
                        } label: {
                            HStack {
                                Text(model.importing ? "Health-Daten werden gelesen …" : "Freigabe auswählen & Daten lesen")
                                if model.importing { Spacer(); ProgressView() }
                            }
                        }.disabled(model.importing)
                        if let message = model.healthMessage { Text(message).foregroundStyle(.secondary) }
                    } footer: {
                        Text("Keine Live-Synchronisierung oder automatische Stressdiagnose. Fehlende Werte können auch bedeuten, dass du den Zugriff nicht freigegeben hast.")
                    }
                }
                .navigationTitle("Health verbinden")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) {
                    Button("Fertig") { model.showHealth = false }.disabled(model.importing)
                } }
            }
            .interactiveDismissDisabled(model.importing)
        }
    }
}
