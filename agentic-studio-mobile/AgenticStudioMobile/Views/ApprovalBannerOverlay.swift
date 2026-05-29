//
//  ApprovalBannerOverlay.swift
//  Pauses the agent loop and shows the exact command/edit awaiting approval.
//

import SwiftUI

struct ApprovalBannerOverlay: View {
    @EnvironmentObject private var session: ChatSession
    let record: ToolCallRecord

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                        .fill(Color.warnAmber.opacity(0.18))
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.warnAmber)
                }
                .frame(width: 26, height: 26)

                VStack(alignment: .leading, spacing: 2) {
                    Text("\(displayKind) — awaiting approval")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(Color.inkPrimary)
                    Text(primaryLine)
                        .font(.monoSmall)
                        .foregroundStyle(Color.inkSecondary)
                        .lineLimit(1)
                }
                Spacer()
                Button {
                    session.resolveApproval(.deny)
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "xmark")
                        Text("Deny")
                    }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.inkPrimary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Capsule().fill(Color.surface2))
                }
                .buttonStyle(.plain)

                Button {
                    session.resolveApproval(.approve)
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark")
                        Text("Approve")
                    }
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.canvas)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        Capsule().fill(
                            LinearGradient(
                                colors: [Color.accentRust, Color.accentSoft],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    )
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            HairlineDivider()
            ScrollView {
                Text(record.argsJSON)
                    .font(.monoSmall)
                    .foregroundStyle(Color.inkSecondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxHeight: 160)
        }
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.surface1)
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.06), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.5), radius: 30, x: 0, y: 16)
        )
        .padding(.horizontal, 14)
        .padding(.bottom, 130)
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

    private var displayKind: String {
        switch record.name {
        case "shell":          return "Run shell"
        case "create_file":    return "Write file"
        case "view_file":      return "Read file"
        case "edit_file":      return "Edit file"
        case "scan_directory": return "Scan directory"
        default:               return record.name
        }
    }

    private var primaryLine: String {
        guard
            let data = record.argsJSON.data(using: .utf8),
            let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return record.argsJSON }
        if let cmd = dict["command"] as? String { return cmd }
        if let p = dict["path"] as? String { return p }
        return record.argsJSON
    }
}
