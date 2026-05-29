//
//  ChatPreferencesSection.swift
//  Sub-section used inside ChatSettingsView. Encapsulates the chat-behaviour
//  toggles (approval gate, auto-reconnect, haptics, streaming prefix) and
//  the optional system-prompt extension.
//

import SwiftUI

struct ChatPreferencesSection: View {
    @EnvironmentObject private var settings: ChatSettingsStore

    var body: some View {
        VStack(spacing: 0) {
            SettingsRow(
                title: "Require manual approval",
                subtitle: "Every shell/file call pauses for your okay.",
                trailing: AnyView(
                    Toggle("", isOn: $settings.requireApproval)
                        .labelsHidden()
                        .toggleStyle(SwitchToggleStyle(tint: Color.accentRust))
                )
            )
            HairlineDivider().padding(.leading, 16)
            SettingsRow(
                title: "Auto-reconnect WebSocket",
                subtitle: "Retry the desktop every couple of seconds.",
                trailing: AnyView(
                    Toggle("", isOn: $settings.autoReconnect)
                        .labelsHidden()
                        .toggleStyle(SwitchToggleStyle(tint: Color.accentRust))
                )
            )
            HairlineDivider().padding(.leading, 16)
            SettingsRow(
                title: "Haptics",
                subtitle: "Subtle taps on send / approval.",
                trailing: AnyView(
                    Toggle("", isOn: $settings.hapticsEnabled)
                        .labelsHidden()
                        .toggleStyle(SwitchToggleStyle(tint: Color.accentRust))
                )
            )
            HairlineDivider().padding(.leading, 16)
            SettingsRow(
                title: "Streaming prefix",
                subtitle: "Show partial assistant tokens as they arrive.",
                trailing: AnyView(
                    Toggle("", isOn: $settings.streamingPrefix)
                        .labelsHidden()
                        .toggleStyle(SwitchToggleStyle(tint: Color.accentRust))
                )
            )

            HairlineDivider().padding(.leading, 16)

            VStack(alignment: .leading, spacing: 8) {
                Text("Extra system prompt")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.inkPrimary)
                Text("Appended to the agent's system prompt for every turn.")
                    .font(.bodySmall)
                    .foregroundStyle(Color.inkSecondary)
                TextEditor(text: $settings.systemPromptExtra)
                    .font(.monoSmall)
                    .foregroundStyle(Color.inkPrimary)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 90)
                    .padding(8)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Color.surface2)
                    )
            }
            .padding(16)
        }
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.surface1)
        )
    }
}

struct SettingsRow: View {
    let title: String
    let subtitle: String
    let trailing: AnyView

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13.5, weight: .medium))
                    .foregroundStyle(Color.inkPrimary)
                Text(subtitle)
                    .font(.bodySmall)
                    .foregroundStyle(Color.inkSecondary)
                    .lineLimit(2)
            }
            Spacer()
            trailing
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
