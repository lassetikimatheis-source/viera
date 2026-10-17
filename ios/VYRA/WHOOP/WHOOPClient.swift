import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

enum WHOOPError: LocalizedError {
    case notConfigured, cancelled, invalidCallback, invalidResponse, unauthorized, rateLimited, server, tooManyPages
    var errorDescription: String? {
        switch self {
        case .notConfigured: "Der WHOOP-Entwicklerzugang ist auf dem Server noch nicht eingerichtet. Der Testmodus funktioniert ohne Anmeldung."
        case .cancelled: "Anmeldung abgebrochen."
        case .invalidCallback: "Die Anmeldung konnte nicht sicher bestätigt werden. Bitte erneut verbinden."
        case .invalidResponse: "WHOOP hat eine unerwartete Antwort geliefert. Es wurden keine unvollständigen Daten übernommen."
        case .unauthorized: "Die WHOOP-Freigabe ist abgelaufen oder wurde widerrufen. Bitte erneut verbinden."
        case .rateLimited: "WHOOP begrenzt gerade die Abrufe. Bitte später erneut versuchen."
        case .server: "Der Verbindungsdienst ist gerade nicht erreichbar. Deine gespeicherten Daten bleiben erhalten."
        case .tooManyPages: "Der Abruf ist zu groß. Es wurden keine Teildaten gespeichert."
        }
    }
}
struct WHOOPTokens: Codable {
    var access: String
    var refresh: String?
    var expiresAt: Double
    var scope: String
    var issuedAt: Double
    var needsRefresh: Bool { expiresAt / 1000 <= Date().timeIntervalSince1970 + 60 }
}
struct WHOOPPreparedLogin: Decodable {
    var authorizationURL: URL
    var state: String
    var transaction: String
    var redirectURI: String
    func validatedURL() throws -> URL {
        let components = URLComponents(url: authorizationURL, resolvingAgainstBaseURL: false)
        let items = components?.queryItems ?? []
        func field(_ key: String) -> String? {
            let values = items.filter { $0.name == key }; return values.count == 1 ? values[0].value : nil
        }
        guard authorizationURL.scheme == "https", authorizationURL.host == "api.prod.whoop.com",
              authorizationURL.path == "/oauth/oauth2/auth", field("state") == state, !state.isEmpty,
              field("redirect_uri") == redirectURI, field("response_type") == "code",
              field("code_challenge_method") == "S256", field("code_challenge")?.isEmpty == false,
              redirectURI == "vyra://viera-matheis.vercel.app/oauth/whoop" else { throw WHOOPError.invalidCallback }
        return authorizationURL
    }
    func validateCallback(_ url: URL) throws -> (code: String, state: String) {
        let actual = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let expected = URLComponents(string: redirectURI)
        let items = actual?.queryItems ?? []
        let codes = items.filter { $0.name == "code" }, states = items.filter { $0.name == "state" }
        guard actual?.scheme == expected?.scheme, actual?.host == expected?.host, actual?.path == expected?.path,
              states.count == 1, states[0].value == state, !items.contains(where: { $0.name == "error" }),
              codes.count == 1, let code = codes[0].value, !code.isEmpty else { throw WHOOPError.invalidCallback }
        return (code, state)
    }
}
func whoopDecoder() -> JSONDecoder {
    let decoder = JSONDecoder(); decoder.keyDecodingStrategy = .convertFromSnakeCase
    decoder.dateDecodingStrategy = .custom { decoder in
        let container = try decoder.singleValueContainer(), value = try container.decode(String.self)
        guard let date = whoopDate(value) else { throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid ISO date") }
        return date
    }
    return decoder
}
func checkWHOOPResponse(_ response: URLResponse) throws {
    guard let http = response as? HTTPURLResponse else { throw WHOOPError.invalidResponse }
    switch http.statusCode {
    case 200..<300: return
    case 401, 403: throw WHOOPError.unauthorized
    case 429: throw WHOOPError.rateLimited
    case 503: throw WHOOPError.server
    default: throw WHOOPError.invalidResponse
    }
}
struct WHOOPClient {
    var session: URLSession = .shared
    var base = URL(string: "https://api.prod.whoop.com/developer/v2/")!
    func fetchSnapshot(access: String, from: Date, to: Date) async throws -> NativeSnapshot {
        async let sleeps: [WHOOPSleep] = pages("activity/sleep", access: access, from: from, to: to)
        async let recoveries: [WHOOPRecovery] = pages("recovery", access: access, from: from, to: to)
        async let cycles: [WHOOPCycle] = pages("cycle", access: access, from: from, to: to)
        async let workouts: [WHOOPWorkout] = pages("activity/workout", access: access, from: from, to: to)
        return try await WHOOPMapping.map(sleeps: sleeps, recoveries: recoveries, cycles: cycles, workouts: workouts, from: from, to: to)
    }
    func pages<Item: Decodable>(_ path: String, access: String, from: Date, to: Date) async throws -> [Item] {
        var records: [Item] = [], next: String?, seen = Set<String>()
        for _ in 0..<20 {
            var url = URLComponents(url: base.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
            let formatter = ISO8601DateFormatter()
            url.queryItems = [URLQueryItem(name: "start", value: formatter.string(from: from)), URLQueryItem(name: "end", value: formatter.string(from: to)), URLQueryItem(name: "limit", value: "25")]
            if let next { url.queryItems!.append(URLQueryItem(name: "nextToken", value: next)) }
            var request = URLRequest(url: url.url!); request.timeoutInterval = 30
            request.setValue("Bearer \(access)", forHTTPHeaderField: "Authorization")
            request.cachePolicy = .reloadIgnoringLocalCacheData
            let (data, response) = try await session.data(for: request); try checkWHOOPResponse(response)
            let page: WHOOPPage<Item>
            do { page = try whoopDecoder().decode(WHOOPPage<Item>.self, from: data) } catch { throw WHOOPError.invalidResponse }
            records += page.records
            guard let token = page.nextToken, !token.isEmpty else { return records }
            guard seen.insert(token).inserted else { throw WHOOPError.tooManyPages }; next = token
        }
        throw WHOOPError.tooManyPages
    }
    func revoke(access: String) async throws {
        var request = URLRequest(url: base.appendingPathComponent("user/access")); request.httpMethod = "DELETE"; request.timeoutInterval = 30
        request.setValue("Bearer \(access)", forHTTPHeaderField: "Authorization")
        let (_, response) = try await session.data(for: request); try checkWHOOPResponse(response)
    }
}
struct WHOOPBroker {
    var session: URLSession = .shared
    var url = URL(string: "https://viera-matheis.vercel.app/api/native/whoop")!
    struct Status: Decodable { var configured: Bool }
    func configured() async throws -> Bool {
        var request = URLRequest(url: url); request.cachePolicy = .reloadIgnoringLocalCacheData; request.timeoutInterval = 20
        let (data, response) = try await session.data(for: request); try checkWHOOPResponse(response)
        return try JSONDecoder().decode(Status.self, from: data).configured
    }
    func prepare() async throws -> WHOOPPreparedLogin { try await post(["action": "prepare"]) }
    func exchange(_ login: WHOOPPreparedLogin, code: String, state: String) async throws -> WHOOPTokens {
        try await post(["action": "exchange", "transaction": login.transaction, "code": code, "state": state])
    }
    func refresh(_ tokens: WHOOPTokens) async throws -> WHOOPTokens {
        guard let refresh = tokens.refresh else { throw WHOOPError.unauthorized }
        return try await post(["action": "refresh", "refresh": refresh, "issuedAt": tokens.issuedAt])
    }
    private func post<Result: Decodable>(_ body: [String: Any]) async throws -> Result {
        var request = URLRequest(url: url); request.httpMethod = "POST"; request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await session.data(for: request)
        if (response as? HTTPURLResponse)?.statusCode == 503 { throw WHOOPError.notConfigured }
        try checkWHOOPResponse(response)
        return try JSONDecoder().decode(Result.self, from: data)
    }
}
