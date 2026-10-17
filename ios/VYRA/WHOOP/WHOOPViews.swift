import SwiftUI
import Charts

private let vyraSleep = Color(red: 0.47, green: 0.39, blue: 0.71)
private let vyraGreen = Color(red: 0.13, green: 0.45, blue: 0.35)
private let vyraLoad = Color(red: 0.28, green: 0.50, blue: 0.68)

struct NativeRootView: View {
    @StateObject private var store: NativeHealthStore
    init(isDemo: Bool = ProcessInfo.processInfo.arguments.contains("--test-connections")) {
        _store = StateObject(wrappedValue: NativeHealthStore(isDemo: isDemo))
    }
    var body: some View {
        TabView {
            NavigationStack { NativeDashboard(store: store) }
                .tabItem { Label("Home", systemImage: "house") }
            NavigationStack { NativeWorkouts(store: store) }
                .tabItem { Label("Training", systemImage: "figure.run") }
            NavigationStack { NativeConnections(store: store) }
                .tabItem { Label("Einstellungen", systemImage: "gearshape") }
            ContentView().tabItem { Label("Weitere Bereiche", systemImage: "square.grid.2x2") }
        }
        .tint(vyraGreen)
    }
}

struct NativeDashboard: View {
    @ObservedObject var store: NativeHealthStore
    @State private var date = Date()
    private var day: String { nativeDay(date) }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("DEIN TAGESÜBERBLICK").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                        Text("Dein Tag im Blick.").font(.system(size: 27, weight: .bold))
                    }
                    Spacer()
                    NavigationLink { NativeConnections(store: store) } label: { Image(systemName: "link").frame(width: 40, height: 40) }
                        .accessibilityLabel("Verbindungen öffnen")
                }
                HStack {
                    Button { date = Calendar.current.date(byAdding: .day, value: -1, to: date)! } label: { Image(systemName: "chevron.left").frame(width: 40, height: 40) }.accessibilityLabel("Vorheriger Tag")
                    Spacer()
                    Text(Calendar.current.isDateInToday(date) ? "Heute" : date.formatted(date: .abbreviated, time: .omitted)).font(.subheadline.weight(.semibold))
                    Spacer()
                    Button { date = Calendar.current.date(byAdding: .day, value: 1, to: date)! } label: { Image(systemName: "chevron.right").frame(width: 40, height: 40) }.accessibilityLabel("Nächster Tag").disabled(Calendar.current.isDateInToday(date))
                }
                Divider()
                let sleeps = store.snapshot.sleep(day: day)
                let hours = sleeps.reduce(0) { $0 + $1.hours }
                let performance = sleeps.compactMap(\.performance).first
                let recovery = store.snapshot.observation(.recovery, day: day)
                let strain = store.snapshot.observation(.strain, day: day)
                HStack(alignment: .top, spacing: 12) {
                    NavigationLink { NativeSleepDetail(sleeps: sleeps) } label: {
                        NativeRing(title: "Schlaf", icon: "moon", value: performance.map { $0 / 100 }, text: performance.map { "\(Int($0))%" } ?? (sleeps.isEmpty ? "–" : hours.formatted(.number.precision(.fractionLength(1)))), unit: performance == nil ? "Stunden" : "Schlafleistung", color: vyraSleep)
                    }
                    NavigationLink { NativeMetricDetail(metric: .recovery, snapshot: store.snapshot) } label: {
                        NativeRing(title: "Recovery", icon: "heart", value: recovery.map { $0.value / 100 }, text: recovery.map { String(Int($0.value)) } ?? "–", unit: "von 100", color: vyraGreen)
                    }
                    NavigationLink { NativeMetricDetail(metric: .strain, snapshot: store.snapshot) } label: {
                        NativeRing(title: "Belastung", icon: "waveform.path.ecg", value: strain.map { $0.value / 21 }, text: strain.map { $0.value.formatted(.number.precision(.fractionLength(1))) } ?? "–", unit: "WHOOP · 0–21", color: vyraLoad)
                    }
                }.buttonStyle(.plain)
                Text("Schlafleistung und Recovery sind WHOOP-Bewertungen. Ohne passende Daten bleibt der Wert offen.").font(.caption).foregroundStyle(.secondary)
                Divider()
                Text("Deine Messwerte").font(.headline)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach([NativeMetric.restingHeartRate, .hrvRMSSD, .hrvSDNN, .cycleCalories, .activeCalories, .steps, .cycleSteps], id: \.self) { metric in
                        let observation = store.snapshot.observation(metric, day: day)
                        NavigationLink { NativeMetricDetail(metric: metric, snapshot: store.snapshot) } label: {
                            VStack(alignment: .leading, spacing: 9) {
                                Text(metric.title).font(.caption).foregroundStyle(.secondary)
                                HStack(alignment: .firstTextBaseline, spacing: 4) {
                                    Text(observation.map { $0.value.formatted(.number.precision(.fractionLength(metric == .hrvRMSSD || metric == .hrvSDNN ? 1 : 0))) } ?? "–").font(.title2.bold()).minimumScaleFactor(0.7)
                                    if observation != nil { Text(metric.unit).font(.caption2).foregroundStyle(.secondary) }
                                }
                                Text(observation?.sourceName ?? "Keine Daten").font(.caption2).foregroundStyle(.secondary).lineLimit(2)
                            }.frame(maxWidth: .infinity, minHeight: 100, alignment: .leading).padding(12)
                                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 8))
                        }.buttonStyle(.plain)
                    }
                }
                Text("WHOOP-Kalorien und -Schritte beziehen sich auf einen physiologischen Zyklus. Sie werden nicht zu Apple-Health-Tageswerten addiert. HRV-Verfahren bleiben getrennt.").font(.caption).foregroundStyle(.secondary)
                HStack { Text("Deine Trainings").font(.headline); Spacer(); NavigationLink("Alle") { NativeWorkouts(store: store) }.font(.subheadline) }
                let workouts = store.snapshot.uniqueWorkouts.filter { nativeDay($0.start) == day }
                if workouts.isEmpty { Text("Keine Trainingseinheit für diesen Tag vorhanden.").font(.subheadline).foregroundStyle(.secondary) }
                ForEach(workouts) { workout in NavigationLink { NativeWorkoutDetail(workout: workout) } label: { NativeWorkoutRow(workout: workout) }.buttonStyle(.plain) }
                if let sync = store.lastSync { Text("WHOOP zuletzt abgerufen: \(sync.formatted(date: .abbreviated, time: .shortened))").font(.caption).foregroundStyle(.secondary) }
                if let message = store.message { Text(message).font(.caption).foregroundStyle(.secondary) }
            }.padding(20)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle(store.isDemo ? "VYRA · Testmodus" : "VYRA").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarTrailing) {
            if store.working { ProgressView() }
            else if store.connected { Button { Task { await store.sync() } } label: { Image(systemName: "arrow.clockwise") }.accessibilityLabel("WHOOP aktualisieren") }
        } }
        .refreshable { if store.connected { await store.sync() } }
    }
}

private struct NativeRing: View {
    var title: String; var icon: String; var value: Double?; var text: String; var unit: String; var color: Color
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon).font(.subheadline).foregroundStyle(.secondary)
            ZStack {
                Circle().stroke(Color.secondary.opacity(0.15), lineWidth: 7)
                Circle().trim(from: 0, to: min(1, max(0, value ?? 0))).stroke(color, style: StrokeStyle(lineWidth: 7, lineCap: .round)).rotationEffect(.degrees(-90))
                VStack(spacing: 3) { Text(text).font(.system(size: 25, weight: .bold)).minimumScaleFactor(0.7); Text(unit).font(.system(size: 9)).foregroundStyle(.secondary) }.padding(8)
            }.aspectRatio(1, contentMode: .fit).frame(maxWidth: 108)
            Text(title).font(.caption.weight(.semibold))
        }.frame(maxWidth: .infinity)
    }
}

struct NativeConnections: View {
    @ObservedObject var store: NativeHealthStore
    @State private var showDisconnect = false
    @State private var showForget = false
    @State private var showHealth = false
    var body: some View {
        Form {
            Section {
                LabeledContent("WHOOP", value: store.isDemo ? "Testdaten" : store.connected ? "Verbunden" : "Nicht verbunden")
                if let sync = store.lastSync { LabeledContent("Letzter Abruf", value: sync.formatted(date: .abbreviated, time: .shortened)) }
                if store.isDemo { Text("Der Testmodus verwendet ausschließlich Beispieldaten. Es wird kein WHOOP-Konto verbunden.").font(.subheadline).foregroundStyle(.secondary) }
                else {
                    Button(store.connected ? "Erneut mit WHOOP verbinden" : "Mit WHOOP verbinden") { Task { await store.connect() } }
                        .disabled(store.working || store.configured != true)
                    if store.connected {
                        Button("WHOOP-Daten aktualisieren") { Task { await store.sync() } }.disabled(store.working)
                        Button("WHOOP trennen", role: .destructive) { showDisconnect = true }.disabled(store.working)
                    }
                    if store.configured == false { Text("Der Entwicklerzugang ist noch nicht auf dem Server hinterlegt. Die Registrierungsschritte stehen in der Xcode-Projektdokumentation.").font(.footnote).foregroundStyle(.secondary) }
                    if store.configured == nil || store.configured == false { Button("Verfügbarkeit erneut prüfen") { Task { await store.checkConfiguration() } }.disabled(store.working) }
                }
            } header: { Text("WHOOP-Verbindung") } footer: {
                Text("Freigaben: Schlaf, Recovery, Trainings und Zyklen. Kein Profil, keine E-Mail und keine Schreibberechtigung. Tokens liegen geschützt in der iPhone-Keychain.")
            }
            if store.working { Section { HStack { ProgressView(); Text("Verbindung wird verarbeitet …") } } }
            if let message = store.message { Section("Hinweis") { Text(message).font(.subheadline) } }
            Section {
                Button("Apple Health verbinden / importieren") { showHealth = true }.disabled(store.working || store.isDemo)
                Text("WHOOP-Direktdaten und Apple-Health-Kopien werden nach Quelle, externer ID und Trainingszeit abgeglichen.").font(.footnote).foregroundStyle(.secondary)
                let removed = store.snapshot.workouts.count - store.snapshot.uniqueWorkouts.count
                if removed > 0 { Text("\(removed) doppelte Trainingskopie(n) werden gemeinsam angezeigt.").font(.footnote) }
            } header: { Text("Apple Health") }
            Section("Datenquellen") {
                let sources = Set(store.snapshot.observations.map(\.sourceName) + store.snapshot.workouts.map(\.sourceName) + store.snapshot.sleeps.map(\.sourceName)).sorted()
                if sources.isEmpty { Text("Noch keine Messwerte importiert.").foregroundStyle(.secondary) }
                ForEach(sources, id: \.self) { Text($0) }
            }
            if !store.isDemo && store.connected {
                Section { Button("WHOOP nur von diesem Gerät entfernen", role: .destructive) { showForget = true }.disabled(store.working) }
                footer: { Text("Falls der Widerruf nicht erreichbar ist, kannst du lokale Tokens und WHOOP-Daten entfernen. Die Freigabe im WHOOP-Konto bleibt dann bestehen, bis du sie dort widerrufst.") }
            }
        }
        .navigationTitle("Verbindungen")
        .task { await store.checkConfiguration() }
        .confirmationDialog("WHOOP-Freigabe widerrufen und direkte WHOOP-Daten auf diesem Gerät entfernen?", isPresented: $showDisconnect, titleVisibility: .visible) {
            Button("Trennen und Daten entfernen", role: .destructive) { Task { await store.disconnect() } }
        }
        .confirmationDialog("Nur lokale WHOOP-Verbindung entfernen? Die Freigabe im WHOOP-Konto wird dabei nicht widerrufen.", isPresented: $showForget, titleVisibility: .visible) {
            Button("Lokal entfernen", role: .destructive) { store.forgetLocal() }
        }
        .sheet(isPresented: $showHealth) {
            NavigationStack {
                Form {
                    Section { Text("VYRA liest freigegebene Schlafdaten, Trainings, Schritte, Ruhepuls, HRV und Aktivenergie der letzten 30 Tage. Es werden keine Daten in Apple Health geschrieben.") }
                    Section { Button("Apple Health freigeben") { Task { await store.importHealth(); if store.message == nil { showHealth = false } } }.disabled(store.working) }
                    if store.working { ProgressView("Health-Daten werden gelesen …") }
                    if let message = store.message { Text(message).foregroundStyle(.secondary) }
                    Section { Text("Diese Daten bleiben im lokalen, durch iOS-Dateischutz geschützten Datenbestand. Eine Weitergabe an den VYRA-Assistenten erfolgt aus diesem Bereich nicht.").font(.footnote) }
                }
                .navigationTitle("Apple Health").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Fertig") { showHealth = false }.disabled(store.working) } }
            }.interactiveDismissDisabled(store.working)
        }
    }
}

struct NativeWorkouts: View {
    @ObservedObject var store: NativeHealthStore
    var body: some View {
        List {
            if store.snapshot.uniqueWorkouts.isEmpty {
                ContentUnavailableView("Noch keine Trainings", systemImage: "figure.run", description: Text("Importiere HealthKit-Daten oder verbinde dein WHOOP-Konto."))
            }
            ForEach(store.snapshot.uniqueWorkouts) { workout in
                NavigationLink { NativeWorkoutDetail(workout: workout) } label: { NativeWorkoutRow(workout: workout) }
            }
        }.navigationTitle("Deine Trainings")
    }
}
private struct NativeWorkoutRow: View {
    var workout: NativeWorkout
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "figure.run").foregroundStyle(vyraGreen).frame(width: 28)
            VStack(alignment: .leading, spacing: 5) {
                Text(workout.name.capitalized).font(.subheadline.weight(.semibold))
                Text("\(workout.start.formatted(date: .abbreviated, time: .shortened)) · \(workout.sourceName)").font(.caption).foregroundStyle(.secondary)
            }
            Spacer(); Text("\(Int(workout.minutes.rounded())) Min.").font(.subheadline.monospacedDigit())
        }.padding(.vertical, 7)
    }
}
private struct NativeWorkoutDetail: View {
    var workout: NativeWorkout
    var body: some View {
        Form {
            Section {
                LabeledContent("Quelle", value: workout.sourceName)
                LabeledContent("Beginn", value: workout.start.formatted(date: .abbreviated, time: .shortened))
                LabeledContent("Ende", value: workout.end.formatted(date: .abbreviated, time: .shortened))
                LabeledContent("Trainingsdauer", value: "\(workout.minutes.formatted(.number.precision(.fractionLength(1)))) Min.")
            }
            Section("Messwerte") {
                value("Kalorienverbrauch", workout.calories, "kcal")
                value("Herzfrequenz im Schnitt", workout.averageHeartRate, "bpm")
                value("WHOOP-Belastung", workout.strain, "/21")
                value("Distanz", workout.distanceKM, "km")
            }
        }.navigationTitle(workout.name.capitalized)
    }
    private func value(_ title: String, _ value: Double?, _ unit: String) -> some View {
        LabeledContent(title, value: value.map { "\($0.formatted(.number.precision(.fractionLength(1)))) \(unit)" } ?? "Keine Daten")
    }
}
private struct NativeSleepDetail: View {
    var sleeps: [NativeSleep]
    var body: some View {
        List {
            if sleeps.isEmpty { ContentUnavailableView("Keine Schlafdaten", systemImage: "moon", description: Text("Verbinde WHOOP oder importiere freigegebene Apple-Health-Daten.")) }
            ForEach(sleeps) { sleep in
                Section {
                    LabeledContent("Schlafdauer", value: "\(sleep.hours.formatted(.number.precision(.fractionLength(1)))) h")
                    if let performance = sleep.performance { LabeledContent("Schlafleistung", value: "\(Int(performance)) %") }
                    if let consistency = sleep.consistency { LabeledContent("Regelmäßigkeit", value: "\(Int(consistency)) %") }
                    if let efficiency = sleep.efficiency { LabeledContent("Schlafeffizienz", value: "\(Int(efficiency)) %") }
                    minutes("Leichtschlaf", sleep.lightMinutes); minutes("Tiefschlaf", sleep.deepMinutes); minutes("REM", sleep.remMinutes); minutes("Wach", sleep.awakeMinutes)
                    minutes("Nicht eindeutig zugeordnet", sleep.unclassifiedMinutes)
                    Text("Phasendauern aus der Quelle. Eine chronologische Phasen-Zeitlinie liegt hier nicht vor.").font(.caption).foregroundStyle(.secondary)
                } header: { Text("\(sleep.sourceName) · \(sleep.end.formatted(date: .abbreviated, time: .omitted))") }
            }
        }.navigationTitle("Schlaf & Erholung")
    }
    @ViewBuilder private func minutes(_ title: String, _ value: Double?) -> some View {
        if let value { LabeledContent(title, value: "\(Int(value.rounded())) Min.") }
    }
}
private struct NativeMetricDetail: View {
    var metric: NativeMetric; var snapshot: NativeSnapshot
    private var points: [NativeObservation] {
        Set(snapshot.observations.filter { $0.metric == metric }.map(\.day)).sorted().suffix(14).compactMap { snapshot.observation(metric, day: $0) }
    }
    var body: some View {
        List {
            if points.isEmpty { ContentUnavailableView("Noch keine Messwerte", systemImage: "chart.xyaxis.line", description: Text("Fehlende Daten werden nicht als Null oder als Schätzung dargestellt.")) }
            else {
                Section("Verlauf") {
                    Chart(points) { point in LineMark(x: .value("Tag", whoopDate(point.day + "T12:00:00Z") ?? point.at), y: .value(metric.unit, point.value)).foregroundStyle(vyraGreen).symbol(.circle) }
                        .frame(height: 190).chartXAxis { AxisMarks(values: .automatic(desiredCount: 4)) }
                }
                ForEach(points.reversed()) { point in
                    VStack(alignment: .leading, spacing: 6) {
                        LabeledContent(point.day, value: "\(point.value.formatted(.number.precision(.fractionLength(1)))) \(metric.unit)")
                        Text("\(point.sourceName) · \(point.at.formatted(date: .abbreviated, time: .shortened))").font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }.navigationTitle(metric.title)
    }
}
