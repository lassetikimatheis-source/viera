import SwiftUI

@MainActor
final class NativeHealthStore: ObservableObject {
    @Published private(set) var snapshot = NativeSnapshot()
    @Published private(set) var connected = false
    @Published private(set) var configured: Bool?
    @Published private(set) var working = false
    @Published private(set) var lastSync: Date?
    @Published var message: String?
    let isDemo: Bool
    private var tokens: WHOOPTokens?
    private let vault = WHOOPKeychain()
    private let api = WHOOPClient()
    private let broker = WHOOPBroker()
    private let authorization = WHOOPAuthorization()
    private let health = HealthReader()
    private let file: URL
    private struct Saved: Codable { var snapshot: NativeSnapshot; var lastSync: Date? }

    init(isDemo: Bool = false) {
        self.isDemo = isDemo
        file = URL.applicationSupportDirectory.appendingPathComponent("VYRA/native-health.json")
        if isDemo { snapshot = Self.demo(); return }
        do {
            tokens = try vault.load(); connected = tokens != nil
            if FileManager.default.fileExists(atPath: file.path) {
                let saved = try JSONDecoder().decode(Saved.self, from: Data(contentsOf: file)); snapshot = saved.snapshot; lastSync = saved.lastSync
            }
        } catch { message = "Gespeicherte Daten konnten nicht vollständig geladen werden. \(error.localizedDescription)" }
    }
    func checkConfiguration() async {
        guard !isDemo else { return }
        do { configured = try await broker.configured() }
        catch { configured = nil; message = "Der WHOOP-Verbindungsstatus ist gerade nicht erreichbar." }
    }
    func connect() async {
        guard !working, !isDemo else { return }
        working = true; message = nil; defer { working = false }
        do {
            let prepared = try await broker.prepare()
            let callback = try await authorization.signIn(prepared)
            let received = try await broker.exchange(prepared, code: callback.code, state: callback.state)
            try vault.save(received); tokens = received; connected = true
            try await fetchWHOOP()
        } catch { message = error.localizedDescription }
    }
    func sync() async {
        guard !working, !isDemo else { return }
        working = true; message = nil; defer { working = false }
        do { try await fetchWHOOP() } catch { message = error.localizedDescription }
    }
    private func validTokens() async throws -> WHOOPTokens {
        guard var current = tokens else { throw WHOOPError.unauthorized }
        if current.needsRefresh {
            current = try await broker.refresh(current)
            try vault.save(current); tokens = current
        }
        return current
    }
    private func fetchWHOOP() async throws {
        let current = try await validTokens(), now = Date(), from = Calendar.current.date(byAdding: .day, value: -30, to: now)!
        let incoming = try await api.fetchSnapshot(access: current.access, from: from, to: now)
        var updated = snapshot; updated.replace(incoming, source: .whoop)
        let stamp = Date(); try persist(updated, sync: stamp); snapshot = updated; lastSync = stamp
    }
    func disconnect() async {
        guard !working, !isDemo else { return }
        working = true; message = nil; defer { working = false }
        do {
            let current = try await validTokens(); try await api.revoke(access: current.access)
            try removeLocalWHOOP()
        } catch { message = "Die Freigabe konnte nicht vollständig widerrufen werden. \(error.localizedDescription)" }
    }
    func forgetLocal() {
        guard !isDemo, !working else { return }
        do { try removeLocalWHOOP(); message = "Lokale WHOOP-Verbindung entfernt. Prüfe die Freigabe zusätzlich in deinem WHOOP-Konto." }
        catch { message = error.localizedDescription }
    }
    private func removeLocalWHOOP() throws {
        var updated = snapshot; updated.remove(.whoop)
        try persist(updated, sync: nil); try vault.clear()
        tokens = nil; connected = false; snapshot = updated; lastSync = nil
    }
    func importHealth() async {
        guard !working, !isDemo else { return }
        working = true; message = nil; defer { working = false }
        do {
            let raw = try await health.read(includeMetadata: true)
            let payload = try JSONDecoder().decode(NativeHealthKitPayload.self, from: JSONSerialization.data(withJSONObject: raw))
            let now = Date(), from = Calendar.current.date(byAdding: .day, value: -30, to: now)!
            let incoming = NativeHealthKitMapper.map(payload, from: from, to: now)
            guard !incoming.observations.isEmpty || !incoming.sleeps.isEmpty || !incoming.workouts.isEmpty else {
                message = "Keine freigegebenen Health-Daten verfügbar. Prüfe deine Auswahl in Apple Health."; return
            }
            var updated = snapshot; updated.replace(incoming, source: .healthKit)
            try persist(updated, sync: lastSync); snapshot = updated
        } catch { message = error.localizedDescription }
    }
    private func persist(_ updated: NativeSnapshot, sync: Date?) throws {
        try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(Saved(snapshot: updated, lastSync: sync))
        try data.write(to: file, options: [.atomic, .completeFileProtection])
        var resource = file; var values = URLResourceValues(); values.isExcludedFromBackup = true; try resource.setResourceValues(values)
    }
    static func demo() -> NativeSnapshot {
        let now = Date(), today = Calendar.current.startOfDay(for: now), end = today.addingTimeInterval(7 * 3600)
        var result = NativeSnapshot(from: today.addingTimeInterval(-7 * 86400), to: now)
        for index in 0..<7 {
            let date = end.addingTimeInterval(Double(-index) * 86400), day = nativeDay(date)
            result.sleeps.append(.init(id: "demo-sleep-\(index)", day: day, start: date.addingTimeInterval(-7.5 * 3600), end: date, hours: 7.5, source: .whoop, sourceName: "WHOOP · Testdaten", performance: 94, consistency: 88, efficiency: 91, lightMinutes: 240, deepMinutes: 90, remMinutes: 120, awakeMinutes: 20))
            for (metric, value) in [(NativeMetric.recovery, 82.0 - Double(index)), (.restingHeartRate, 57.0), (.hrvRMSSD, 48.0), (.strain, 10.2), (.cycleCalories, 2160.0)] {
                result.observations.append(.init(id: "demo-\(metric.rawValue)-\(index)", metric: metric, value: value, day: day, at: date, source: .whoop, sourceName: "WHOOP · Testdaten"))
            }
        }
        let start = today.addingTimeInterval(8 * 3600), finish = start.addingTimeInterval(40 * 60)
        result.workouts = [
            .init(id: "demo-whoop-workout", start: start, end: finish, minutes: 40, name: "running", source: .whoop, sourceName: "WHOOP · Testdaten", externalID: "same-workout", calories: 410, averageHeartRate: 138, strain: 9.4, distanceKM: 5.2),
            .init(id: "demo-healthkit-copy", start: start, end: finish, minutes: 40, name: "Laufen", source: .healthKit, sourceName: "WHOOP via Apple Health · Testdaten", sourceBundle: "com.whoop.app", externalID: "same-workout")
        ]
        return result
    }
}
