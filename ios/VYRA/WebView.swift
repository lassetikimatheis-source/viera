import SwiftUI
import WebKit
import AuthenticationServices

@MainActor
final class WebModel: NSObject, ObservableObject {
    @Published var loading = true
    @Published var error: String?
    @Published var showHealth = false
    @Published var importing = false
    @Published var healthMessage: String?
    @Published var colorScheme: ColorScheme?
    weak var webView: WKWebView?
    let health = HealthReader()
    static let home: URL = {
        var url = URLComponents(string: "https://viera-matheis.vercel.app/?native=ios")!
        if ProcessInfo.processInfo.arguments.contains("--test-connections") {
            url.queryItems?.append(URLQueryItem(name: "sandbox", value: "1"))
            url.fragment = "profile/connections"
        }
        return url.url!
    }()
    private var authentication: ASWebAuthenticationSession?

    func authorize(provider: String, url: URL) {
        let expected = provider == "whoop"
            ? "https://api.prod.whoop.com/oauth/oauth2/auth"
            : "https://www.strava.com/oauth/mobile/authorize"
        guard ["whoop", "strava"].contains(provider), authentication == nil,
              url.scheme == "https", "\(url.scheme!)://\(url.host ?? "")\(url.path)" == expected,
              let redirect = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "redirect_uri" })?.value,
              redirect == "vyra://\(Self.home.host!)/oauth/\(provider)" else { return }
        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "vyra") { [weak self] callback, error in
            Task { @MainActor in
                guard let self else { return }
                self.authentication = nil
                var result = ["provider": provider]
                if let callback, callback.host == Self.home.host, callback.path == "/oauth/\(provider)", callback.scheme == "vyra", error == nil {
                    let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
                    for name in ["code", "state", "error"] { result[name] = items.first(where: { $0.name == name })?.value }
                } else { result["error"] = "cancelled" }
                _ = try? await self.webView?.callAsyncJavaScript(
                    "window.dispatchEvent(new CustomEvent('vyra:oauth-result', {detail: result}));",
                    arguments: ["result": result], in: nil, contentWorld: .page)
            }
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = true
        authentication = session
        if !session.start() {
            authentication = nil
            Task { _ = try? await webView?.callAsyncJavaScript(
                "window.dispatchEvent(new CustomEvent('vyra:oauth-result', {detail: {provider, error: 'unavailable'}}));",
                arguments: ["provider": provider], in: nil, contentWorld: .page) }
        }
    }

    func reload() {
        error = nil
        loading = true
        webView?.load(URLRequest(url: Self.home))
    }

    func importHealth() async {
        guard !importing else { return }
        importing = true
        healthMessage = nil
        defer { importing = false }
        do {
            let payload = try await health.read()
            guard let webView, webView.url?.host == Self.home.host else { return }
            let received = try await webView.callAsyncJavaScript(
                "if (!window.vyraNativeHealthReady) return false; window.dispatchEvent(new CustomEvent('vyra:native-health', {detail: payload})); return true;",
                arguments: ["payload": payload], in: nil, contentWorld: .page
            )
            if received as? Bool == true { showHealth = false }
            else { healthMessage = "Bitte öffne in VYRA zuerst Health-Verbindungen und starte den Import dort erneut." }
        } catch {
            healthMessage = "Health-Daten konnten nicht gelesen werden. Prüfe die Freigaben und versuche es erneut. \(error.localizedDescription)"
        }
    }
}

extension WebModel: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        webView?.window ?? ASPresentationAnchor()
    }
}

struct VYRAWebView: UIViewRepresentable {
    @ObservedObject var model: WebModel
    func makeCoordinator() -> Coordinator { Coordinator(model) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.userContentController.add(context.coordinator, name: "vyraHealth")
        config.userContentController.addUserScript(WKUserScript(source: "window.vyraNativeOAuth = true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.allowsInlineMediaPlayback = true
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.isOpaque = false
        view.backgroundColor = .systemBackground
        view.scrollView.isScrollEnabled = false
        view.allowsBackForwardNavigationGestures = false
        model.webView = view
        view.load(URLRequest(url: WebModel.home))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "vyraHealth")
        uiView.navigationDelegate = nil
        uiView.uiDelegate = nil
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, WKUIDelegate, WKDownloadDelegate {
        let model: WebModel
        private var downloads: [ObjectIdentifier: URL] = [:]
        init(_ model: WebModel) { self.model = model }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame,
                  message.frameInfo.securityOrigin.protocol == "https",
                  message.frameInfo.securityOrigin.host == WebModel.home.host,
                  message.name == "vyraHealth",
                  let body = message.body as? [String: String] else { return }
            if body["action"] == "theme" {
                if body["theme"] == "dark" { model.colorScheme = .dark }
                else if body["theme"] == "light" { model.colorScheme = .light }
                return
            }
            if body["action"] == "oauth", let provider = body["provider"], let raw = body["url"], let url = URL(string: raw) {
                model.authorize(provider: provider, url: url)
                return
            }
            guard body["action"] == "import" else { return }
            model.healthMessage = nil
            model.showHealth = true
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            if navigationAction.shouldPerformDownload &&
                (url.absoluteString.hasPrefix("blob:https://viera-matheis.vercel.app/") ||
                 (url.scheme == "https" && url.host == WebModel.home.host)) {
                decisionHandler(.download)
                return
            }
            if url.scheme == "https" && url.host == WebModel.home.host {
                decisionHandler(.allow)
            } else {
                decisionHandler(.cancel)
                if navigationAction.navigationType == .linkActivated && ["https", "mailto"].contains(url.scheme ?? "") {
                    UIApplication.shared.open(url)
                }
            }
        }
        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
        func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
            let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
            do {
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                let file = folder.appendingPathComponent(URL(fileURLWithPath: suggestedFilename).lastPathComponent)
                downloads[ObjectIdentifier(download)] = file
                completionHandler(file)
            } catch { completionHandler(nil) }
        }
        func downloadDidFinish(_ download: WKDownload) {
            guard let file = downloads.removeValue(forKey: ObjectIdentifier(download)),
                  let controller = model.webView?.window?.rootViewController else { return }
            let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
            share.popoverPresentationController?.sourceView = controller.view
            share.popoverPresentationController?.sourceRect = CGRect(x: controller.view.bounds.midX, y: controller.view.bounds.midY, width: 1, height: 1)
            share.completionWithItemsHandler = { _, _, _, _ in try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
            controller.present(share, animated: true)
        }
        func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
            if let file = downloads.removeValue(forKey: ObjectIdentifier(download)) {
                try? FileManager.default.removeItem(at: file.deletingLastPathComponent())
            }
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { model.loading = false; model.error = nil }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed(error) }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed(error) }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            model.loading = false
            model.error = "Die Ansicht wurde beendet. Deine gespeicherten Einträge bleiben erhalten."
        }
        private func failed(_ error: Error) {
            guard (error as NSError).code != NSURLErrorCancelled else { return }
            model.loading = false
            model.error = "Für den Start ist eine Internetverbindung nötig."
        }
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            guard let controller = webView.window?.rootViewController else { completionHandler(false); return }
            let alert = UIAlertController(title: "VYRA", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Abbrechen", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "Bestätigen", style: .default) { _ in completionHandler(true) })
            controller.present(alert, animated: true)
        }
    }
}
