import Foundation

struct NativeHealthKitPayload: Decodable {
    var records: [Record]
    var workouts: [Workout]
    struct Record: Decodable {
        var type: String; var value: String; var unit: String?; var startDate: String; var endDate: String?
        var sourceName: String; var sourceBundle: String?; var uuid: String?
    }
    struct Workout: Decodable {
        var startDate: String; var endDate: String; var duration: String; var durationUnit: String?
        var sourceName: String; var sourceBundle: String?; var uuid: String?; var externalID: String?; var workoutActivityType: String?
    }
}
enum NativeHealthKitMapper {
    static func map(_ payload: NativeHealthKitPayload, from: Date, to: Date) -> NativeSnapshot {
        var result = NativeSnapshot(from: from, to: to)
        var totals: [String: NativeObservation] = [:]
        var sleepGroups: [String: [NativeHealthKitPayload.Record]] = [:]
        for record in payload.records {
            guard let at = whoopDate(record.startDate) else { continue }
            let day = nativeDay(at), sourceID = "\(record.sourceBundle ?? record.sourceName):\(record.sourceName)"
            if record.type == "HKCategoryTypeIdentifierSleepAnalysis", let end = record.endDate.flatMap(whoopDate) {
                if end > at { sleepGroups[sourceID, default: []].append(record) }; continue
            }
            let metric: NativeMetric
            switch record.type {
            case "HKQuantityTypeIdentifierStepCount": metric = .steps
            case "HKQuantityTypeIdentifierRestingHeartRate": metric = .restingHeartRate
            case "HKQuantityTypeIdentifierHeartRateVariabilitySDNN": metric = .hrvSDNN
            case "HKQuantityTypeIdentifierActiveEnergyBurned": metric = .activeCalories
            default: continue
            }
            guard var value = Double(record.value), validValue(value, max: 1000000) != nil else { continue }
            if metric == .hrvSDNN && record.unit == "s" { value *= 1000 }
            if metric == .activeCalories && record.unit == "kJ" { value /= 4.184 }
            let id = "healthkit:\(record.uuid ?? "\(sourceID):\(record.type):\(record.startDate)")"
            let observation = NativeObservation(id: id, metric: metric, value: value, day: day, at: at, source: .healthKit, sourceName: record.sourceName)
            if metric == .steps || metric == .activeCalories {
                let key = "healthkit:\(sourceID):\(metric.rawValue):\(day)"
                if var total = totals[key] { total.value += value; total.at = max(total.at, at); totals[key] = total }
                else { var total = observation; total.id = key; totals[key] = total }
            } else { result.observations.append(observation) }
        }
        result.observations += totals.values
        var episodes: [(String, [NativeHealthKitPayload.Record])] = []
        for (key, records) in sleepGroups {
            let ordered = records.sorted { $0.startDate < $1.startDate }
            var episode: [NativeHealthKitPayload.Record] = [], episodeEnd: Date?
            for record in ordered {
                guard let start = whoopDate(record.startDate), let end = record.endDate.flatMap(whoopDate) else { continue }
                if let last = episodeEnd, start.timeIntervalSince(last) > 3 * 3600 {
                    episodes.append((key, episode)); episode = []; episodeEnd = nil
                }
                episode.append(record); episodeEnd = max(episodeEnd ?? end, end)
            }
            if !episode.isEmpty { episodes.append((key, episode)) }
        }
        for (sourceKey, records) in episodes {
            let asleep = records.filter { $0.value.contains("Asleep") }
            let intervals = asleep.compactMap { record -> (Date, Date)? in
                guard let start = whoopDate(record.startDate), let end = record.endDate.flatMap(whoopDate), end > start else { return nil }; return (start, end)
            }
            guard let start = intervals.map(\.0).min(), let end = intervals.map(\.1).max(), let source = asleep.first else { continue }
            let key = "\(sourceKey):\(start.timeIntervalSince1970)"
            func minutes(_ suffix: String) -> Double? {
                let matching = records.filter { $0.value.hasSuffix(suffix) }.compactMap { record -> (Date, Date)? in
                    guard let start = whoopDate(record.startDate), let end = record.endDate.flatMap(whoopDate), end > start else { return nil }; return (start, end)
                }
                return matching.isEmpty ? nil : unionSeconds(matching) / 60
            }
            // Assign each segment once; contradictory phase labels remain unclassified.
            let boundaries = Array(Set(intervals.flatMap { [$0.0, $0.1] })).sorted()
            var phases: [String: Double] = [:]
            for (a, b) in zip(boundaries, boundaries.dropFirst()) {
                let active = asleep.filter { record in
                    guard let s = whoopDate(record.startDate), let e = record.endDate.flatMap(whoopDate) else { return false }
                    return s <= a && e >= b
                }
                guard !active.isEmpty else { continue }
                let labels = Set(active.compactMap { record in
                    ["AsleepCore", "AsleepDeep", "AsleepREM"].first { record.value.hasSuffix($0) }
                })
                let phase = labels.count == 1 ? labels.first! : "Unclassified"
                phases[phase, default: 0] += b.timeIntervalSince(a) / 60
            }
            result.sleeps.append(.init(id: "healthkit:sleep:\(key)", day: nativeDay(end), start: start, end: end, hours: unionSeconds(intervals) / 3600, source: .healthKit, sourceName: source.sourceName, lightMinutes: phases["AsleepCore"], deepMinutes: phases["AsleepDeep"], remMinutes: phases["AsleepREM"], awakeMinutes: minutes("Awake"), unclassifiedMinutes: phases["Unclassified"]))
        }
        for record in payload.workouts {
            guard let start = whoopDate(record.startDate), let end = whoopDate(record.endDate), end > start,
                  var minutes = Double(record.duration), minutes.isFinite, minutes > 0 else { continue }
            if record.durationUnit == "s" { minutes /= 60 }
            guard minutes <= 1440 else { continue }
            result.workouts.append(.init(id: "healthkit:workout:\(record.uuid ?? record.startDate + record.sourceName)", start: start, end: end, minutes: minutes, name: record.workoutActivityType ?? "Training", source: .healthKit, sourceName: record.sourceName, sourceBundle: record.sourceBundle, externalID: record.externalID))
        }
        return result
    }
    static func unionSeconds(_ intervals: [(Date, Date)]) -> Double {
        let sorted = intervals.filter { $0.1 > $0.0 }.sorted { $0.0 < $1.0 }
        guard let first = sorted.first else { return 0 }
        var start = first.0, end = first.1, total = 0.0
        for next in sorted.dropFirst() {
            if next.0 <= end { end = max(end, next.1) }
            else { total += end.timeIntervalSince(start); start = next.0; end = next.1 }
        }
        return total + end.timeIntervalSince(start)
    }
}
