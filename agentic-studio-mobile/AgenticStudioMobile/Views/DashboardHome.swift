//
//  DashboardHome.swift
//  State A — connection box on top, analytics card grid below.
//

import SwiftUI

struct DashboardHome: View {
    @EnvironmentObject private var socket: WebSocketManager
    @EnvironmentObject private var session: ChatSession
    @EnvironmentObject private var settings: ChatSettingsStore

    @State private var ipDraft: String = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                titleBlock
                connectionBox
                analyticsGrid
                quickPrompts
            }
            .padding(.horizontal, 18)
            .padding(.top, 6)
            .padding(.bottom, 24)
        }
        .scrollIndicators(.hidden)
        .onAppear {
            if ipDraft.isEmpty { ipDraft = settings.remoteUrl }
        }
    }

    // MARK: - Title -----------------------------------------------------------

    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Ask anything.")
                .font(.appTitle)
                .foregroundStyle(Color.inkPrimary)
            Text(socket.isConnected
                 ? "Desktop paired — shell, files, and chat all enabled."
                 : "Chat with the AI now. Pair a desktop below to unlock shell + files.")
                .font(.bodyTight)
                .foregroundStyle(Color.inkSecondary)
        }
    }

    // MARK: - Connection box --------------------------------------------------

    private var connectionBox: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Circle()
                    .fill(socket.isConnected ? Color.goodGreen : Color.inkTertiary)
                    .frame(width: 8, height: 8)
                    .shadow(color: socket.isConnected ? Color.goodGreen.opacity(0.5) : .clear, radius: 6)
                Text(socket.isConnected ? "Remote desktop connected" : "Pair a desktop (optional)")
                    .font(.cardTitle)
                    .foregroundStyle(Color.inkPrimary)
                Spacer()
                if !socket.lastUrl.isEmpty {
                    Text(socket.lastUrl)
                        .font(.monoSmall)
                        .foregroundStyle(Color.inkTertiary)
                        .lineLimit(1)
                }
            }
            if !socket.isConnected {
                Text("Chat works without pairing. Pair to enable shell + filesystem + browser tools on your Mac.")
                    .font(.bodySmall)
                    .foregroundStyle(Color.inkTertiary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 8) {
                Image(systemName: "wifi.router")
                    .foregroundStyle(Color.inkTertiary)
                TextField("ws://192.168.1.X:8765", text: $ipDraft)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
                    .font(.monoSmall)
                    .foregroundStyle(Color.inkPrimary)
                    .submitLabel(.go)
                    .onSubmit { tryConnect() }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Color.surface2)
            )

            HStack(spacing: 8) {
                Button {
                    tryConnect()
                } label: {
                    Text(socket.isConnected ? "Reconnect" : "Connect")
                        .font(.system(size: 13, weight: .semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(LinearGradient(
                                    colors: [Color.accentRust, Color.accentSoft],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ))
                        )
                        .foregroundStyle(Color.canvas)
                }
                .buttonStyle(.plain)

                if socket.isConnected {
                    Button {
                        socket.disconnect()
                    } label: {
                        Text("Disconnect")
                            .font(.system(size: 13, weight: .medium))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(Color.surface2)
                            )
                            .foregroundStyle(Color.inkPrimary)
                    }
                    .buttonStyle(.plain)
                }

                Spacer()

                if let err = socket.connectionError, !socket.isConnected {
                    Text(err)
                        .font(.bodySmall)
                        .foregroundStyle(Color.dangerRed.opacity(0.9))
                        .lineLimit(2)
                }
            }
        }
        .padding(16)
        .background(CardBackground())
    }

    private func tryConnect() {
        let trimmed = ipDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        settings.remoteUrl = trimmed
        socket.connect(url: trimmed)
    }

    // MARK: - Analytics grid --------------------------------------------------

    private var analyticsGrid: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Activity")
                .font(.labelSmall)
                .foregroundStyle(Color.inkTertiary)
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                AnalyticsCard(
                    title: "Total tokens",
                    value: formatted(session.totalTokens),
                    iconSystem: "circle.hexagongrid.fill"
                )
                AnalyticsCard(
                    title: "Active days",
                    value: "\(session.activeDays)",
                    iconSystem: "calendar"
                )
                AnalyticsCard(
                    title: "Streak",
                    value: "\(session.streak)",
                    iconSystem: "flame.fill"
                )
            }
        }
    }

    private func formatted(_ n: Int) -> String {
        if n >= 1_000_000 { return String(format: "%.1fM", Double(n) / 1_000_000) }
        if n >= 1_000     { return String(format: "%.1fK", Double(n) / 1_000) }
        return "\(n)"
    }

    // MARK: - Quick prompts ---------------------------------------------------

    private var quickPrompts: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Try")
                .font(.labelSmall)
                .foregroundStyle(Color.inkTertiary)
            VStack(spacing: 8) {
                // Always-available chat prompts — useful in standalone mode.
                quickRow(icon: "bubble.left.and.bubble.right", title: "Explain something", subtitle: "Ask the model any question") {
                    session.composer = "Explain how WebSocket keepalives work, simply."
                }
                quickRow(icon: "wand.and.stars", title: "Brainstorm", subtitle: "Bounce ideas around") {
                    session.composer = "I want to build a side project this weekend. Help me pick something fun."
                }
                quickRow(icon: "doc.plaintext", title: "Draft a snippet", subtitle: "Generate code or text") {
                    session.composer = "Write a Swift extension on Color for a calm OLED-dark palette."
                }
                // Tool-using prompts — only meaningful with the desktop paired.
                if socket.isConnected {
                    quickRow(icon: "terminal", title: "Audit the workspace", subtitle: "Scan files, surface top three issues") {
                        session.composer = "Scan the workspace and tell me the top three problems."
                    }
                    quickRow(icon: "shippingbox", title: "Install + run", subtitle: "Detect package manager, install, build") {
                        session.composer = "Install dependencies and run the build on the desktop."
                    }
                    quickRow(icon: "doc.text", title: "Write a README", subtitle: "From the source tree") {
                        session.composer = "Read the workspace and write a clean README.md."
                    }
                }
            }
        }
    }

    private func quickRow(icon: String, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.accentSoft)
                    .frame(width: 30, height: 30)
                    .background(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(Color.accentRust.opacity(0.10))
                    )
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 13.5, weight: .medium))
                        .foregroundStyle(Color.inkPrimary)
                    Text(subtitle)
                        .font(.bodySmall)
                        .foregroundStyle(Color.inkSecondary)
                }
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.inkTertiary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.surface1)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(Color.white.opacity(0.04), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

private struct AnalyticsCard: View {
    let title: String
    let value: String
    let iconSystem: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: iconSystem)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.accentSoft)
                Spacer()
            }
            Text(value)
                .font(.system(size: 22, weight: .semibold, design: .rounded))
                .foregroundStyle(Color.inkPrimary)
                .monospacedDigit()
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.inkTertiary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, minHeight: 96, alignment: .topLeading)
        .background(CardBackground())
    }
}
