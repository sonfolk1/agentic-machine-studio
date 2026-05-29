//
//  ChatSettingsView.swift
//  Slide-up settings sheet — API key, remote URL, model, reasoning, and the
//  ChatPreferencesSection sub-section for behavioural toggles.
//

import SwiftUI

struct ChatSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var settings: ChatSettingsStore
    @EnvironmentObject private var socket: WebSocketManager

    @State private var keyDraft: String = ""
    @State private var urlDraft: String = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    keySection
                    remoteSection
                    modelSection
                    ChatPreferencesSection()
                    aboutSection
                }
                .padding(16)
            }
            .scrollIndicators(.hidden)
            .background(Color.canvas)
            .navigationTitle("Chat settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Color.accentSoft)
                }
            }
            .onAppear {
                urlDraft = settings.remoteUrl
            }
        }
    }

    // MARK: - Sections --------------------------------------------------------

    private var keySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("OpenRouter API key")
                .font(.labelSmall)
                .foregroundStyle(Color.inkTertiary)

            HStack(spacing: 8) {
                SecureField(
                    settings.openRouterKey.isEmpty ? "sk-or-v1-…" : "•••••••••••• (saved)",
                    text: $keyDraft
                )
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .font(.monoSmall)
                .foregroundStyle(Color.inkPrimary)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.surface2)
                )

                Button {
                    settings.saveOpenRouterKey(keyDraft)
                    keyDraft = ""
                } label: {
                    Text("Save")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.canvas)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(
                                    keyDraft.isEmpty
                                    ? AnyShapeStyle(Color.surface3)
                                    : AnyShapeStyle(LinearGradient(
                                        colors: [Color.accentRust, Color.accentSoft],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ))
                                )
                        )
                }
                .buttonStyle(.plain)
                .disabled(keyDraft.isEmpty)
            }

            if !settings.openRouterKey.isEmpty {
                Button(role: .destructive) {
                    settings.clearOpenRouterKey()
                } label: {
                    Text("Remove saved key")
                        .font(.bodySmall)
                        .foregroundStyle(Color.dangerRed)
                }
            }

            Text("Stored in the iOS Keychain on this device only.")
                .font(.bodySmall)
                .foregroundStyle(Color.inkTertiary)
        }
        .padding(16)
        .background(CardBackground())
    }

    private var remoteSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Remote desktop")
                .font(.labelSmall)
                .foregroundStyle(Color.inkTertiary)

            TextField("ws://192.168.1.X:8765", text: $urlDraft)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
                .font(.monoSmall)
                .foregroundStyle(Color.inkPrimary)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.surface2)
                )

            HStack {
                Button {
                    settings.remoteUrl = urlDraft
                    socket.connect(url: urlDraft)
                } label: {
                    Text(socket.isConnected ? "Reconnect" : "Connect")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.canvas)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(LinearGradient(
                                    colors: [Color.accentRust, Color.accentSoft],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ))
                        )
                }
                .buttonStyle(.plain)

                if socket.isConnected {
                    Button {
                        socket.disconnect()
                    } label: {
                        Text("Disconnect")
                            .font(.system(size: 13, weight: .medium))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 9)
                            .background(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .fill(Color.surface2)
                            )
                            .foregroundStyle(Color.inkPrimary)
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
                HStack(spacing: 6) {
                    Circle()
                        .fill(socket.isConnected ? Color.goodGreen : Color.dangerRed)
                        .frame(width: 7, height: 7)
                    Text(socket.isConnected ? "Connected" : "Offline")
                        .font(.bodySmall)
                        .foregroundStyle(Color.inkSecondary)
                }
            }
        }
        .padding(16)
        .background(CardBackground())
    }

    private var modelSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Default model + reasoning")
                .font(.labelSmall)
                .foregroundStyle(Color.inkTertiary)
            HStack {
                ModelSelectorMenu()
                Spacer()
            }
            Text("You can also pick a model from the bar at the bottom of the chat.")
                .font(.bodySmall)
                .foregroundStyle(Color.inkTertiary)
        }
        .padding(16)
        .background(CardBackground())
    }

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Agentic Studio Mobile")
                .font(.system(size: 12.5, weight: .semibold))
                .foregroundStyle(Color.inkPrimary)
            Text("Pairs with the Agentic Studio desktop app over LAN WebSocket. Tool calls run on the desktop; the agent loop runs on your phone.")
                .font(.bodySmall)
                .foregroundStyle(Color.inkSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(CardBackground())
    }
}
