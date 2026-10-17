import Foundation
import Security

struct WHOOPKeychain {
    private let service = "de.vyra.native.whoop"
    private var query: [String: Any] { [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: "tokens"] }
    func load() throws -> WHOOPTokens? {
        var request = query; request[kSecReturnData as String] = true; request[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(request as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else { throw keychainError(status) }
        return try JSONDecoder().decode(WHOOPTokens.self, from: data)
    }
    func save(_ tokens: WHOOPTokens) throws {
        guard !tokens.access.isEmpty, tokens.expiresAt.isFinite, tokens.expiresAt > 0 else { throw WHOOPError.invalidResponse }
        let data = try JSONEncoder().encode(tokens)
        let changes: [String: Any] = [kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let status = SecItemUpdate(query as CFDictionary, changes as CFDictionary)
        if status == errSecItemNotFound {
            var entry = query; changes.forEach { entry[$0.key] = $0.value }
            let added = SecItemAdd(entry as CFDictionary, nil); guard added == errSecSuccess else { throw keychainError(added) }
        } else if status != errSecSuccess { throw keychainError(status) }
    }
    func clear() throws {
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw keychainError(status) }
    }
    private func keychainError(_ status: OSStatus) -> NSError {
        NSError(domain: "VYRA.Keychain", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "Die geschützte Speicherung ist gerade nicht verfügbar. Entsperre dein Gerät und versuche es erneut."])
    }
}
