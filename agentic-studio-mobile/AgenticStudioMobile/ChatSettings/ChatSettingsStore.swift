//
//  ChatSettingsStore.swift
//  Persisted user preferences for the chat. Backed by UserDefaults / AppStorage,
//  with the OpenRouter API key stored separately in the iOS Keychain.
//

import Foundation
import SwiftUI
import Security

@MainActor
final class ChatSettingsStore: ObservableObject {
    // ── Persisted preferences ────────────────────────────────────────────
    @AppStorage("settings.remoteUrl")          var remoteUrl: String = "ws://192.168.1.10:8765"
    @AppStorage("settings.requireApproval")    var requireApproval: Bool = true
    @AppStorage("settings.selectedModel")      var selectedModel: String = "anthropic/claude-opus-4.7"
    @AppStorage("settings.customModel")        var customModel: String = ""
    @AppStorage("settings.reasoningRaw")       private var reasoningRaw: String = ReasoningEffort.medium.rawValue
    @AppStorage("settings.autoReconnect")      var autoReconnect: Bool = true
    @AppStorage("settings.haptics")            var hapticsEnabled: Bool = true
    @AppStorage("settings.streamingPrefix")    var streamingPrefix: Bool = true
    @AppStorage("settings.systemPromptExtra")  var systemPromptExtra: String = ""
    @AppStorage("settings.visionEnabled")      var visionEnabled: Bool = false
    @AppStorage("settings.bridgeToken")        var bridgeToken: String = ""
    @AppStorage("settings.notifyOnApproval")   var notifyOnApproval: Bool = true

    var reasoningEffort: ReasoningEffort {
        get { ReasoningEffort(rawValue: reasoningRaw) ?? .medium }
        set { reasoningRaw = newValue.rawValue }
    }

    // ── Keychain-backed API key ──────────────────────────────────────────
    private static let keyAccount = "com.agenticstudio.mobile.openrouter"

    @Published var openRouterKey: String = ""

    init() {
        openRouterKey = readKey() ?? ""
    }

    func saveOpenRouterKey(_ value: String) {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        writeKey(trimmed)
        openRouterKey = trimmed
    }

    func clearOpenRouterKey() {
        deleteKey()
        openRouterKey = ""
    }

    // MARK: - Keychain helpers ----------------------------------------------

    private func writeKey(_ value: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrAccount as String: Self.keyAccount,
        ]
        SecItemDelete(query as CFDictionary)
        var attrs = query
        attrs[kSecValueData as String] = data
        attrs[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attrs as CFDictionary, nil)
    }

    private func readKey() -> String? {
        let query: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrAccount as String: Self.keyAccount,
            kSecReturnData as String:  true,
            kSecMatchLimit as String:  kSecMatchLimitOne,
        ]
        var item: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess,
              let data = item as? Data,
              let str = String(data: data, encoding: .utf8) else { return nil }
        return str
    }

    private func deleteKey() {
        let query: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrAccount as String: Self.keyAccount,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
