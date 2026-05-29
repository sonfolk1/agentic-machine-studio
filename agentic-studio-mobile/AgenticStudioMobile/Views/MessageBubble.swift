//
//  MessageBubble.swift
//

import SwiftUI

struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        Group {
            switch message.role {
            case .user:   userBubble
            case .agent:  agentBubble
            case .tool:   EmptyView()     // tool results are rendered inside the agent's tool cards
            case .system: systemNote
            }
        }
    }

    private var userBubble: some View {
        HStack {
            Spacer(minLength: 32)
            Text(message.text)
                .font(.bodyTight)
                .foregroundStyle(Color.inkPrimary)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.surface2)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.05), lineWidth: 1)
                )
                .textSelection(.enabled)
                .frame(maxWidth: 280, alignment: .trailing)
        }
    }

    @ViewBuilder
    private var agentBubble: some View {
        HStack(alignment: .top, spacing: 10) {
            avatar
            VStack(alignment: .leading, spacing: 8) {
                if !message.text.isEmpty {
                    Text(message.text)
                        .font(.bodyTight)
                        .foregroundStyle(Color.inkPrimary)
                        .textSelection(.enabled)
                }
                ForEach(message.toolCalls) { tc in
                    ToolCallCard(record: tc)
                }
            }
            Spacer(minLength: 0)
        }
    }

    private var avatar: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 7, style: .continuous)
                .fill(LinearGradient(
                    colors: [Color.accentRust, Color.accentSoft],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
            Text("AS")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(Color.canvas)
        }
        .frame(width: 26, height: 26)
    }

    private var systemNote: some View {
        Text(message.text)
            .font(.bodySmall)
            .foregroundStyle(Color.inkTertiary)
            .frame(maxWidth: .infinity, alignment: .center)
    }
}

struct ToolCallCard: View {
    let record: ToolCallRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color.inkSecondary)
                Text(record.name)
                    .font(.system(size: 11.5, weight: .semibold))
                    .foregroundStyle(Color.inkPrimary)
                Spacer()
                StatusChip(status: record.status)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            HairlineDivider()
            ScrollView(.horizontal, showsIndicators: false) {
                Text(record.argsJSON)
                    .font(.monoSmall)
                    .foregroundStyle(Color.inkSecondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            if let preview = record.resultPreview, !preview.isEmpty {
                HairlineDivider()
                Text(preview)
                    .font(.monoSmall)
                    .foregroundStyle(Color.inkTertiary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.surface1)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .strokeBorder(Color.white.opacity(0.04), lineWidth: 1)
        )
    }

    private var icon: String {
        switch record.name {
        case "shell":          return "terminal"
        case "create_file":    return "doc.badge.plus"
        case "view_file":      return "doc.text"
        case "edit_file":      return "pencil.line"
        case "scan_directory": return "folder"
        default:               return "wrench.adjustable"
        }
    }
}

private struct StatusChip: View {
    let status: ToolCallRecord.Status
    var body: some View {
        Text(label)
            .font(.system(size: 10, weight: .semibold).smallCaps())
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(
                Capsule().fill(color.opacity(0.16))
            )
            .foregroundStyle(color)
    }
    private var label: String {
        switch status {
        case .pending:  return "awaiting"
        case .approved: return "approved"
        case .denied:   return "denied"
        case .running:  return "running"
        case .done:     return "done"
        case .error:    return "error"
        }
    }
    private var color: Color {
        switch status {
        case .pending:  return .warnAmber
        case .approved: return .accentSoft
        case .denied:   return .dangerRed
        case .running:  return .warnAmber
        case .done:     return .goodGreen
        case .error:    return .dangerRed
        }
    }
}
