//
//  BottomInputBar.swift
//  Persistent bottom control panel — status capsule (left), text field (center),
//  model menu + send (right).
//

import SwiftUI

struct BottomInputBar: View {
    @EnvironmentObject private var socket: WebSocketManager
    @EnvironmentObject private var session: ChatSession
    @EnvironmentObject private var settings: ChatSettingsStore

    @FocusState private var focused: Bool

    var body: some View {
        VStack(spacing: 8) {
            // Top row: status capsule (left) — model menu (right)
            HStack(spacing: 8) {
                ConnectionStatusCapsule()
                Spacer()
                ModelSelectorMenu()
            }
            .padding(.horizontal, 14)

            // Floating composer
            HStack(alignment: .center, spacing: 10) {
                TextField(placeholder, text: $session.composer, axis: .vertical)
                    .focused($focused)
                    .lineLimit(1...4)
                    .font(.bodyTight)
                    .foregroundStyle(Color.inkPrimary)
                    .tint(Color.accentSoft)
                    .submitLabel(.send)
                    .onSubmit(submit)

                Button(action: submit) {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color.canvas)
                        .frame(width: 32, height: 32)
                        .background(
                            Circle().fill(
                                LinearGradient(
                                    colors: [Color.accentRust, Color.accentSoft],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                        )
                        .opacity((session.composer.trimmingCharacters(in: .whitespaces).isEmpty || session.thinking) ? 0.35 : 1)
                }
                .buttonStyle(.plain)
                .disabled(session.composer.trimmingCharacters(in: .whitespaces).isEmpty || session.thinking)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.surface1)
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .strokeBorder(Color.white.opacity(0.07), lineWidth: 1)
                    )
                    .shadow(color: .black.opacity(0.5), radius: 18, x: 0, y: 10)
            )
            .padding(.horizontal, 14)
        }
        .padding(.bottom, 12)
        .background(
            LinearGradient(
                colors: [Color.canvas.opacity(0), Color.canvas.opacity(0.65), Color.canvas],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea(edges: .bottom)
        )
    }

    private var placeholder: String {
        if settings.openRouterKey.isEmpty {
            return "Add your OpenRouter key in Settings to begin…"
        }
        if !socket.isConnected {
            return "Ask anything. Pair a desktop in Settings for shell + files."
        }
        return "Describe a task — files, shell commands, full builds…"
    }

    private func submit() {
        let text = session.composer.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        guard !session.thinking else { return }
        guard !settings.openRouterKey.isEmpty else { return }
        session.composer = ""
        focused = false

        let loop = AgentLoop(session: session, socket: socket, settings: settings)
        Task { await loop.run(userMessage: text) }
    }
}
