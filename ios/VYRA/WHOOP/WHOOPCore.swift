import Foundation

enum NativeSource: String, Codable { case whoop, healthKit }
enum NativeMetric: String, Codable, CaseIterable {
    case recovery, restingHeartRate, hrvRMSSD, hrvSDNN, strain, cycleCalories, activeCalories, steps, cycleSteps
    var title: String {
        switch self {
        case .recovery: "Recovery"
        case .restingHeartRate: "Ruhepuls"
        case .hrvRMSSD: "HRV · RMSSD"
        case .hrvSDNN: "HRV · SDNN"
        case .strain: "Belastung"
        case .cycleCalories: "Kalorien im WHOOP-Zyklus"
        case .activeCalories: "Aktivenergie"
        case .steps: "Schritte"
        case .cycleSteps: "Schritte im WHOOP-Zyklus"
        }
    }
    var unit: String {
        switch self {
        case .recovery: "/100"
        case .restingHeartRate: "bpm"
        case .hrvRMSSD, .hrvSDNN: "ms"
        case .strain: "/21"
        case .cycleCalories, .activeCalories: "kcal"
        case .steps, .cycleSteps: "Schritte"
        }
    }
}
struct NativeObservation: Codable, Identifiable {
    var id: String
    var metric: NativeMetric
    var value: Double
    var day: String
    var at: Date
    var source: NativeSource
    var sourceName: String
}
struct NativeWorkout: Codable, Identifiable {
    var id: String
    var start: Date
    var end: Date
    var minutes: Double
    var name: String
    var source: NativeSource
    var sourceName: String
    var sourceBundle: String?
    var externalID: String?
    var calories: Double?
    var averageHeartRate: Double?
    var strain: Double?
    var distanceKM: Double?
    var category: String {
        let value = name.lowercased()
        if value.contains("run") || value.contains("lauf") { return "run" }
        if value.contains("cycl") || value.contains("rad") { return "cycle" }
        if value.contains("strength") || value.contains("kraft") { return "strength" }
        if value.contains("walk") || value.contains("geh") { return "walk" }
        return value
    }
}
struct NativeSleep: Codable, Identifiable {
    var id: String
    var day: String
    var start: Date
    var end: Date
    var hours: Double
    var source: NativeSource
    var sourceName: String
    var performance: Double?
    var consistency: Double?
    var efficiency: Double?
    var lightMinutes: Double?
    var deepMinutes: Double?
    var remMinutes: Double?
    var awakeMinutes: Double?
    var unclassifiedMinutes: Double?
}
struct NativeSnapshot: Codable {
    var observations: [NativeObservation] = []
    var workouts: [NativeWorkout] = []
    var sleeps: [NativeSleep] = []
    var from: Date = .distantPast
    var to: Date = Date()

    func observation(_ metric: NativeMetric, day: String) -> NativeObservation? {
        let matches = observations.filter { $0.metric == metric && $0.day == day }
        let preferred = matches.contains { $0.source == .whoop } ? matches.filter { $0.source == .whoop } : matches
        return preferred.max { $0.at < $1.at }
    }
    func sleep(day: String) -> [NativeSleep] {
        let matches = sleeps.filter { $0.day == day }
        if matches.contains(where: { $0.source == .whoop }) { return matches.filter { $0.source == .whoop } }
        // Pick one HealthKit source, never add phone/watch copies together.
        let grouped = Dictionary(grouping: matches, by: \.sourceName)
        let source = grouped.keys.sorted().max { left, right in
            grouped[left]!.reduce(0) { $0 + $1.hours } < grouped[right]!.reduce(0) { $0 + $1.hours }
        }
        return source.flatMap { grouped[$0] } ?? []
    }
    var uniqueWorkouts: [NativeWorkout] {
        let direct = workouts.filter { $0.source == .whoop }
        return workouts.filter { candidate in
            guard candidate.source == .healthKit else { return true }
            return !direct.contains { sameWorkout($0, candidate) }
        }.sorted { $0.start > $1.start }
    }
    mutating func replace(_ incoming: NativeSnapshot, source: NativeSource) {
        observations.removeAll { $0.source == source && $0.at >= incoming.from && $0.at <= incoming.to }
        workouts.removeAll { $0.source == source && $0.start >= incoming.from && $0.start <= incoming.to }
        sleeps.removeAll { $0.source == source && $0.end >= incoming.from && $0.end <= incoming.to }
        let observationIDs = Set(incoming.observations.map(\.id)), workoutIDs = Set(incoming.workouts.map(\.id)), sleepIDs = Set(incoming.sleeps.map(\.id))
        observations.removeAll { observationIDs.contains($0.id) }
        workouts.removeAll { workoutIDs.contains($0.id) }
        sleeps.removeAll { sleepIDs.contains($0.id) }
        observations += Dictionary(incoming.observations.map { ($0.id, $0) }, uniquingKeysWith: { _, new in new }).values
        workouts += Dictionary(incoming.workouts.map { ($0.id, $0) }, uniquingKeysWith: { _, new in new }).values
        sleeps += Dictionary(incoming.sleeps.map { ($0.id, $0) }, uniquingKeysWith: { _, new in new }).values.sorted { $0.end < $1.end }
    }
    mutating func remove(_ source: NativeSource) {
        observations.removeAll { $0.source == source }; workouts.removeAll { $0.source == source }; sleeps.removeAll { $0.source == source }
    }
}
func sameWorkout(_ whoop: NativeWorkout, _ health: NativeWorkout) -> Bool {
    if let external = health.externalID, !external.isEmpty, external.lowercased() == whoop.externalID?.lowercased() { return true }
    let sameInterval = abs(whoop.start.timeIntervalSince(health.start)) <= 60 && abs(whoop.end.timeIntervalSince(health.end)) <= 120
    let isWHOOPCopy = health.sourceBundle?.lowercased().contains("whoop") == true || health.sourceName.lowercased().contains("whoop")
    return sameInterval && (isWHOOPCopy || whoop.category == health.category)
}
func nativeDay(_ date: Date, offset: String? = nil) -> String {
    let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd"
    if let offset, offset.count == 6, let hours = Int(offset.dropFirst().prefix(2)), let minutes = Int(offset.suffix(2)),
       ["+", "-"].contains(String(offset.prefix(1))), hours <= 14, minutes < 60 {
        formatter.timeZone = TimeZone(secondsFromGMT: (hours * 3600 + minutes * 60) * (offset.hasPrefix("-") ? -1 : 1))
    }
    return formatter.string(from: date)
}
func whoopDate(_ value: String) -> Date? {
    let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = formatter.date(from: value) { return date }
    formatter.formatOptions = [.withInternetDateTime]; return formatter.date(from: value)
}
func validValue(_ value: Double?, max: Double) -> Double? {
    guard let value, value.isFinite, value >= 0, value <= max else { return nil }; return value
}
struct WHOOPPage<Item: Decodable>: Decodable { var records: [Item]; var nextToken: String? }
struct WHOOPSleep: Decodable {
    var id: String; var cycleId: Int?; var start: Date; var end: Date; var timezoneOffset: String?; var nap: Bool?; var scoreState: String?; var score: Score?
    struct Score: Decodable {
        var stageSummary: Stages; var sleepPerformancePercentage: Double?; var sleepConsistencyPercentage: Double?; var sleepEfficiencyPercentage: Double?
    }
    struct Stages: Decodable {
        var totalLightSleepTimeMilli: Double; var totalSlowWaveSleepTimeMilli: Double; var totalRemSleepTimeMilli: Double; var totalAwakeTimeMilli: Double?
    }
}
struct WHOOPRecovery: Decodable {
    var cycleId: Int; var sleepId: String; var scoreState: String?; var score: Score?
    struct Score: Decodable { var userCalibrating: Bool?; var recoveryScore: Double?; var restingHeartRate: Double?; var hrvRmssdMilli: Double? }
}
struct WHOOPCycle: Decodable {
    var id: Int; var start: Date; var end: Date?; var timezoneOffset: String?; var scoreState: String?; var score: Score?; var stepCount: Double?
    struct Score: Decodable { var strain: Double?; var kilojoule: Double? }
}
struct WHOOPWorkout: Decodable {
    var id: String; var start: Date; var end: Date; var sportName: String?; var scoreState: String?; var score: Score?
    struct Score: Decodable { var strain: Double?; var averageHeartRate: Double?; var kilojoule: Double?; var distanceMeter: Double? }
}
enum WHOOPMapping {
    static func map(sleeps: [WHOOPSleep], recoveries: [WHOOPRecovery], cycles: [WHOOPCycle], workouts: [WHOOPWorkout], from: Date, to: Date) -> NativeSnapshot {
        var result = NativeSnapshot(from: from, to: to)
        let bySleep = Dictionary(sleeps.map { ($0.id, $0) }, uniquingKeysWith: { _, new in new })
        func add(_ id: String, _ metric: NativeMetric, _ value: Double?, max: Double, day: String, at: Date) {
            if let value = validValue(value, max: max) { result.observations.append(.init(id: id, metric: metric, value: value, day: day, at: at, source: .whoop, sourceName: "WHOOP")) }
        }
        for sleep in sleeps where sleep.scoreState == "SCORED" && sleep.end > sleep.start {
            guard let score = sleep.score else { continue }
            let stages = score.stageSummary
            let values = [stages.totalLightSleepTimeMilli, stages.totalSlowWaveSleepTimeMilli, stages.totalRemSleepTimeMilli]
            guard values.allSatisfy({ validValue($0, max: 86400000) != nil }) else { continue }
            let hours = values.reduce(0, +) / 3600000
            guard hours > 0 && hours <= 24 else { continue }
            result.sleeps.append(.init(id: "whoop:sleep:\(sleep.id)", day: nativeDay(sleep.end, offset: sleep.timezoneOffset), start: sleep.start, end: sleep.end, hours: hours, source: .whoop, sourceName: "WHOOP", performance: validValue(score.sleepPerformancePercentage, max: 100), consistency: validValue(score.sleepConsistencyPercentage, max: 100), efficiency: validValue(score.sleepEfficiencyPercentage, max: 100), lightMinutes: stages.totalLightSleepTimeMilli / 60000, deepMinutes: stages.totalSlowWaveSleepTimeMilli / 60000, remMinutes: stages.totalRemSleepTimeMilli / 60000, awakeMinutes: stages.totalAwakeTimeMilli.map { $0 / 60000 }))
        }
        for recovery in recoveries where recovery.scoreState == "SCORED" {
            guard let score = recovery.score, let sleep = bySleep[recovery.sleepId] else { continue }
            let day = nativeDay(sleep.end, offset: sleep.timezoneOffset), prefix = "whoop:recovery:\(recovery.cycleId)"
            if score.userCalibrating != true { add(prefix + ":score", .recovery, score.recoveryScore, max: 100, day: day, at: sleep.end) }
            add(prefix + ":heart", .restingHeartRate, score.restingHeartRate, max: 300, day: day, at: sleep.end)
            add(prefix + ":hrv", .hrvRMSSD, score.hrvRmssdMilli, max: 1000, day: day, at: sleep.end)
        }
        for cycle in cycles {
            // WHOOP cycles are physiological intervals, not midnight-based activity days.
            let stamp = cycle.start
            let day = nativeDay(stamp, offset: cycle.timezoneOffset)
            if cycle.scoreState == "SCORED", let score = cycle.score {
                add("whoop:cycle:\(cycle.id):strain", .strain, score.strain, max: 21, day: day, at: stamp)
                add("whoop:cycle:\(cycle.id):energy", .cycleCalories, score.kilojoule.map { $0 / 4.184 }, max: 30000, day: day, at: stamp)
            }
            add("whoop:cycle:\(cycle.id):steps", .cycleSteps, cycle.stepCount, max: 300000, day: day, at: stamp)
        }
        for workout in workouts where workout.end > workout.start && workout.end.timeIntervalSince(workout.start) <= 86400 {
            let score = workout.scoreState == "SCORED" ? workout.score : nil
            result.workouts.append(.init(id: "whoop:workout:\(workout.id)", start: workout.start, end: workout.end, minutes: workout.end.timeIntervalSince(workout.start) / 60, name: workout.sportName ?? "Training", source: .whoop, sourceName: "WHOOP", externalID: workout.id, calories: validValue(score?.kilojoule.map { $0 / 4.184 }, max: 30000), averageHeartRate: validValue(score?.averageHeartRate, max: 300), strain: validValue(score?.strain, max: 21), distanceKM: validValue(score?.distanceMeter.map { $0 / 1000 }, max: 500)))
        }
        return result
    }
}
