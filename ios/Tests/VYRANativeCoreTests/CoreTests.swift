import XCTest
@testable import VYRANativeCore

final class CoreTests: XCTestCase {
    func testWHOOPDecodeMappingAndUnits() throws {
        let sleepData = Data(#"{"records":[{"id":"s1","cycle_id":1,"start":"2026-10-16T20:00:00Z","end":"2026-10-17T04:00:00.000Z","timezone_offset":"+02:00","nap":false,"score_state":"SCORED","score":{"stage_summary":{"total_light_sleep_time_milli":14400000,"total_slow_wave_sleep_time_milli":5400000,"total_rem_sleep_time_milli":7200000,"total_awake_time_milli":1800000},"sleep_performance_percentage":94}}],"next_token":null}"#.utf8)
        let recoveryData = Data(#"{"records":[{"cycle_id":1,"sleep_id":"s1","score_state":"SCORED","score":{"user_calibrating":false,"recovery_score":82,"resting_heart_rate":57,"hrv_rmssd_milli":48}}]}"#.utf8)
        let cycleData = Data(#"{"records":[{"id":1,"start":"2026-10-17T04:00:00Z","timezone_offset":"+02:00","score_state":"SCORED","score":{"strain":10.2,"kilojoule":4184},"step_count":7200}]}"#.utf8)
        let sleeps = try whoopDecoder().decode(WHOOPPage<WHOOPSleep>.self, from: sleepData).records
        let recoveries = try whoopDecoder().decode(WHOOPPage<WHOOPRecovery>.self, from: recoveryData).records
        let cycles = try whoopDecoder().decode(WHOOPPage<WHOOPCycle>.self, from: cycleData).records
        let snapshot = WHOOPMapping.map(sleeps: sleeps, recoveries: recoveries, cycles: cycles, workouts: [], from: .distantPast, to: Date())
        XCTAssertEqual(snapshot.sleeps[0].hours, 7.5)
        XCTAssertEqual(snapshot.sleeps[0].performance, 94)
        XCTAssertEqual(snapshot.observation(.hrvRMSSD, day: "2026-10-17")?.value, 48)
        XCTAssertNil(snapshot.observation(.hrvSDNN, day: "2026-10-17"))
        XCTAssertEqual(snapshot.observation(.cycleCalories, day: "2026-10-17")!.value, 1000, accuracy: 0.001)
        XCTAssertEqual(snapshot.observation(.recovery, day: "2026-10-17")?.value, 82)
    }
    func testCallbackValidationRejectsStateHostAndDuplicateParameters() throws {
        let prepared = WHOOPPreparedLogin(authorizationURL: URL(string: "https://api.prod.whoop.com/oauth/oauth2/auth?state=expected&redirect_uri=vyra%3A%2F%2Fviera-matheis.vercel.app%2Foauth%2Fwhoop&response_type=code&code_challenge_method=S256&code_challenge=test")!, state: "expected", transaction: "sealed", redirectURI: "vyra://viera-matheis.vercel.app/oauth/whoop")
        XCTAssertNoThrow(try prepared.validatedURL())
        XCTAssertEqual(try prepared.validateCallback(URL(string: prepared.redirectURI + "?code=good&state=expected")!).code, "good")
        XCTAssertThrowsError(try prepared.validateCallback(URL(string: prepared.redirectURI + "?code=good&state=wrong")!))
        XCTAssertThrowsError(try prepared.validateCallback(URL(string: "vyra://other.example/oauth/whoop?code=good&state=expected")!))
        XCTAssertThrowsError(try prepared.validateCallback(URL(string: prepared.redirectURI + "?code=one&code=two&state=expected")!))
        XCTAssertThrowsError(try prepared.validateCallback(URL(string: prepared.redirectURI + "?error=denied&state=expected")!))
    }
    func testHealthKitAndDirectWHOOPWorkoutsAreNotDoubleCounted() {
        let start = Date(timeIntervalSince1970: 1700000000), end = start.addingTimeInterval(2400)
        let direct = NativeWorkout(id: "whoop:1", start: start, end: end, minutes: 40, name: "running", source: .whoop, sourceName: "WHOOP", externalID: "uuid")
        let copy = NativeWorkout(id: "hk:1", start: start, end: end, minutes: 40, name: "Laufen", source: .healthKit, sourceName: "WHOOP", sourceBundle: "com.whoop.app", externalID: "uuid")
        let other = NativeWorkout(id: "hk:2", start: end.addingTimeInterval(3600), end: end.addingTimeInterval(5400), minutes: 30, name: "Gehen", source: .healthKit, sourceName: "Watch")
        var snapshot = NativeSnapshot(workouts: [direct, copy, other])
        XCTAssertEqual(snapshot.uniqueWorkouts.count, 2)
        var incoming = NativeSnapshot(workouts: [direct]); incoming.from = .distantPast; incoming.to = .distantFuture
        snapshot.replace(incoming, source: .whoop); snapshot.replace(incoming, source: .whoop)
        XCTAssertEqual(snapshot.uniqueWorkouts.count, 2)
        XCTAssertEqual(snapshot.workouts.count, 3)
    }
    func testSleepSourcesAreSelectedNotSummedAndDatesUseProviderOffset() {
        let date = whoopDate("2026-10-16T23:30:00Z")!
        XCTAssertEqual(nativeDay(date, offset: "+02:00"), "2026-10-17")
        let direct = NativeSleep(id: "direct", day: "2026-10-17", start: date.addingTimeInterval(-27000), end: date, hours: 7.5, source: .whoop, sourceName: "WHOOP")
        let copy = NativeSleep(id: "copy", day: "2026-10-17", start: direct.start, end: date, hours: 7.5, source: .healthKit, sourceName: "WHOOP HealthKit")
        XCTAssertEqual(NativeSnapshot(sleeps: [direct, copy]).sleep(day: "2026-10-17").reduce(0) { $0 + $1.hours }, 7.5)
    }
    func testHealthKitSleepOverlapAndSourceIdentity() throws {
        let raw = Data(#"{"records":[{"type":"HKCategoryTypeIdentifierSleepAnalysis","value":"HKCategoryValueSleepAnalysisAsleepCore","startDate":"2026-10-17T00:00:00Z","endDate":"2026-10-17T02:00:00Z","sourceName":"Watch","sourceBundle":"apple"},{"type":"HKCategoryTypeIdentifierSleepAnalysis","value":"HKCategoryValueSleepAnalysisAsleepDeep","startDate":"2026-10-17T01:00:00Z","endDate":"2026-10-17T03:00:00Z","sourceName":"Watch","sourceBundle":"apple"}],"workouts":[]}"#.utf8)
        let payload = try JSONDecoder().decode(NativeHealthKitPayload.self, from: raw)
        let snapshot = NativeHealthKitMapper.map(payload, from: .distantPast, to: .distantFuture)
        XCTAssertEqual(snapshot.sleeps[0].hours, 3)
        XCTAssertEqual(snapshot.sleeps[0].lightMinutes, 60)
        XCTAssertEqual(snapshot.sleeps[0].deepMinutes, 60)
        XCTAssertEqual(snapshot.sleeps[0].unclassifiedMinutes, 60)
        XCTAssertEqual(snapshot.sleeps[0].source, .healthKit)
        let roundtrip = try JSONDecoder().decode(NativeSnapshot.self, from: JSONEncoder().encode(snapshot))
        XCTAssertEqual(roundtrip.sleeps[0].hours, 3)
    }
    func testHealthKitKeepsCrossMidnightPhasesInOneEpisode() throws {
        let raw = Data(#"{"records":[{"type":"HKCategoryTypeIdentifierSleepAnalysis","value":"HKCategoryValueSleepAnalysisAsleepCore","startDate":"2026-10-16T22:00:00Z","endDate":"2026-10-16T23:00:00Z","sourceName":"Watch"},{"type":"HKCategoryTypeIdentifierSleepAnalysis","value":"HKCategoryValueSleepAnalysisAsleepDeep","startDate":"2026-10-16T23:00:00Z","endDate":"2026-10-17T06:00:00Z","sourceName":"Watch"}],"workouts":[]}"#.utf8)
        let snapshot = NativeHealthKitMapper.map(try JSONDecoder().decode(NativeHealthKitPayload.self, from: raw), from: .distantPast, to: .distantFuture)
        XCTAssertEqual(snapshot.sleeps.count, 1)
        XCTAssertEqual(snapshot.sleeps[0].hours, 8)
        XCTAssertEqual(snapshot.sleeps[0].lightMinutes, 60)
        XCTAssertEqual(snapshot.sleeps[0].deepMinutes, 420)
    }
}
