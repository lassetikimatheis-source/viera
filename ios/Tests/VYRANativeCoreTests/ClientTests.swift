import XCTest
@testable import VYRANativeCore

private final class StubProtocol: URLProtocol {
    static var handler: ((URLRequest) throws -> (Int, String))?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (status, body) = try Self.handler!(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: Data(body.utf8))
            client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}

final class ClientTests: XCTestCase {
    private func session() -> URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubProtocol.self]
        return URLSession(configuration: configuration)
    }
    override func tearDown() { StubProtocol.handler = nil; super.tearDown() }
    func testPaginationUsesBearerAndNextToken() async throws {
        var requests = 0
        StubProtocol.handler = { request in
            requests += 1
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test")
            let query = URLComponents(url: request.url!, resolvingAgainstBaseURL: false)!.queryItems!
            XCTAssertEqual(query.first { $0.name == "limit" }?.value, "25")
            if requests == 1 { return (200, #"{"records":[],"next_token":"second"}"#) }
            XCTAssertEqual(query.first { $0.name == "nextToken" }?.value, "second")
            return (200, #"{"records":[],"next_token":null}"#)
        }
        let records: [WHOOPCycle] = try await WHOOPClient(session: session()).pages("cycle", access: "test", from: .distantPast, to: Date())
        XCTAssertTrue(records.isEmpty); XCTAssertEqual(requests, 2)
    }
    func testRepeatedPageTokenAndRateLimitFailInsteadOfReturningPartialData() async {
        for status in [200, 429] {
            StubProtocol.handler = { _ in (status, #"{"records":[],"next_token":"repeated"}"#) }
            do {
                let _: [WHOOPCycle] = try await WHOOPClient(session: session()).pages("cycle", access: "test", from: .distantPast, to: Date())
                XCTFail("Expected failure")
            } catch {
                guard let error = error as? WHOOPError else { return XCTFail("Unexpected error: \(error)") }
                switch (status, error) {
                case (200, .tooManyPages), (429, .rateLimited): break
                default: XCTFail("Unexpected status mapping")
                }
            }
        }
    }
    func testRefreshRotationAndRevokeRequest() async throws {
        StubProtocol.handler = { request in
            XCTAssertEqual(request.httpMethod, "POST")
            let body = try JSONSerialization.jsonObject(with: request.httpBody ?? Self.body(request)) as! [String: Any]
            XCTAssertEqual(body["action"] as? String, "refresh")
            XCTAssertEqual(body["refresh"] as? String, "old-refresh")
            return (200, #"{"access":"new-access","refresh":"new-refresh","expiresAt":9999999999999,"scope":"offline","issuedAt":1}"#)
        }
        let rotated = try await WHOOPBroker(session: session()).refresh(.init(access: "old", refresh: "old-refresh", expiresAt: 0, scope: "offline", issuedAt: 1))
        XCTAssertEqual(rotated.refresh, "new-refresh"); XCTAssertFalse(rotated.needsRefresh)
        StubProtocol.handler = { request in
            XCTAssertEqual(request.httpMethod, "DELETE")
            XCTAssertEqual(request.url?.path, "/developer/v2/user/access")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer new-access")
            return (204, "")
        }
        try await WHOOPClient(session: session()).revoke(access: rotated.access)
    }
    private static func body(_ request: URLRequest) -> Data {
        guard let stream = request.httpBodyStream else { return Data() }
        stream.open(); defer { stream.close() }
        var data = Data(), buffer = [UInt8](repeating: 0, count: 1024)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            if count <= 0 { break }; data.append(contentsOf: buffer.prefix(count))
        }
        return data
    }
}
