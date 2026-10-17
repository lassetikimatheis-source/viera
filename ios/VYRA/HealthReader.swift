import Foundation
import HealthKit

final class HealthReader {
    private let store = HKHealthStore()
    private let quantities: [(HKQuantityTypeIdentifier, HKUnit)] = [
        (.stepCount, .count()), (.heartRate, HKUnit.count().unitDivided(by: .minute())),
        (.restingHeartRate, HKUnit.count().unitDivided(by: .minute())),
        (.heartRateVariabilitySDNN, .secondUnit(with: .milli)),
        (.activeEnergyBurned, .kilocalorie()), (.bodyMass, .gramUnit(with: .kilo))
    ]

    func read() async throws -> [String: Any] {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw NSError(domain: "VYRA", code: 1, userInfo: [NSLocalizedDescriptionKey: "Apple Health ist auf diesem Gerät nicht verfügbar."])
        }
        let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        let workout = HKObjectType.workoutType()
        let quantityTypes = quantities.compactMap { HKObjectType.quantityType(forIdentifier: $0.0) }
        var types = Set<HKObjectType>(quantityTypes)
        types.insert(sleep)
        types.insert(workout)
        try await store.requestAuthorization(toShare: [], read: types)
        let now = Date()
        let start = Calendar.current.date(byAdding: .day, value: -30, to: now)!
        let predicate = HKQuery.predicateForSamples(withStart: start, end: now, options: .strictStartDate)
        let formatter = ISO8601DateFormatter()
        formatter.timeZone = .current
        var records: [[String: String]] = []
        var workouts: [[String: String]] = []
        for (identifier, unit) in quantities {
            let type = HKObjectType.quantityType(forIdentifier: identifier)!
            // Dense pulse readings need a shorter window to keep the preview bounded.
            let selectedPredicate = identifier == .heartRate
                ? HKQuery.predicateForSamples(withStart: now.addingTimeInterval(-12 * 3600), end: now, options: .strictStartDate)
                : predicate
            for case let sample as HKQuantitySample in try await samples(type, selectedPredicate) {
                records.append([
                    "type": identifier.rawValue, "sourceName": sample.sourceRevision.source.name,
                    "value": String(sample.quantity.doubleValue(for: unit)), "unit": unit.unitString,
                    "startDate": formatter.string(from: sample.startDate), "endDate": formatter.string(from: sample.endDate)
                ])
            }
        }
        let phases: [Int: String] = [
            HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue: "HKCategoryValueSleepAnalysisAsleepUnspecified",
            HKCategoryValueSleepAnalysis.asleepCore.rawValue: "HKCategoryValueSleepAnalysisAsleepCore",
            HKCategoryValueSleepAnalysis.asleepDeep.rawValue: "HKCategoryValueSleepAnalysisAsleepDeep",
            HKCategoryValueSleepAnalysis.asleepREM.rawValue: "HKCategoryValueSleepAnalysisAsleepREM",
            HKCategoryValueSleepAnalysis.awake.rawValue: "HKCategoryValueSleepAnalysisAwake"
        ]
        for case let sample as HKCategorySample in try await samples(sleep, predicate) {
            guard let phase = phases[sample.value] else { continue }
            records.append(["type": HKCategoryTypeIdentifier.sleepAnalysis.rawValue,
                "sourceName": sample.sourceRevision.source.name, "value": phase,
                "startDate": formatter.string(from: sample.startDate), "endDate": formatter.string(from: sample.endDate)])
        }
        for case let sample as HKWorkout in try await samples(workout, predicate) {
            workouts.append(["sourceName": sample.sourceRevision.source.name,
                "duration": String(sample.duration / 60), "durationUnit": "min",
                "startDate": formatter.string(from: sample.startDate), "endDate": formatter.string(from: sample.endDate),
                "workoutActivityType": workoutName(sample.workoutActivityType)])
        }
        return ["records": records, "workouts": workouts]
    }

    private func samples(_ type: HKSampleType, _ predicate: NSPredicate) async throws -> [HKSample] {
        try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: 10001,
                                      sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]) { _, samples, error in
                if let error { continuation.resume(throwing: error) }
                else if (samples?.count ?? 0) > 10000 {
                    continuation.resume(throwing: NSError(domain: "VYRA", code: 2, userInfo: [NSLocalizedDescriptionKey: "Zu viele Messungen für diesen Import. Bitte nutze vorerst einen Health-Dateiexport."]))
                } else { continuation.resume(returning: samples ?? []) }
            }
            store.execute(query)
        }
    }

    private func workoutName(_ type: HKWorkoutActivityType) -> String {
        switch type {
        case .running: "Laufen"
        case .walking: "Gehen"
        case .cycling: "Radfahren"
        case .traditionalStrengthTraining, .functionalStrengthTraining: "Krafttraining"
        case .swimming: "Schwimmen"
        case .yoga: "Yoga"
        default: "Training"
        }
    }
}
