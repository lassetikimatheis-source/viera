import AuthenticationServices
import UIKit

@MainActor
final class WHOOPAuthorization: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?
    weak var anchor: UIWindow?
    func signIn(_ login: WHOOPPreparedLogin) async throws -> (code: String, state: String) {
        guard session == nil else { throw WHOOPError.invalidCallback }
        let url = try login.validatedURL()
        return try await withCheckedThrowingContinuation { continuation in
            let web = ASWebAuthenticationSession(url: url, callbackURLScheme: "vyra") { [weak self] callback, error in
                Task { @MainActor in
                    self?.session = nil
                    if let error {
                        if (error as NSError).code == ASWebAuthenticationSessionError.canceledLogin.rawValue { continuation.resume(throwing: WHOOPError.cancelled) }
                        else { continuation.resume(throwing: WHOOPError.invalidCallback) }
                        return
                    }
                    guard let callback else { continuation.resume(throwing: WHOOPError.invalidCallback); return }
                    do { continuation.resume(returning: try login.validateCallback(callback)) }
                    catch { continuation.resume(throwing: error) }
                }
            }
            web.presentationContextProvider = self; web.prefersEphemeralWebBrowserSession = true
            session = web
            if !web.start() { session = nil; continuation.resume(throwing: WHOOPError.invalidCallback) }
        }
    }
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        anchor ?? UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows).first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
}
