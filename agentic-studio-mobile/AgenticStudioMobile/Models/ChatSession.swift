//
//  ChatSession.swift
//  In-memory chat state, slide-away trigger, and analytics for the dashboard.
//

import Foundation
import SwiftUI

@MainActor
final class ChatSession: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isActive: Bool = false              // drives slide-away
    @Published var thinking: Bool = false
    @Published var pendingApproval: ToolCallRecord? = nil
    @Published var composer: String = ""

    // ── Analytics (Total Tokens, Active Days, Current Streak) ──────────────
    @AppStorage("analytics.totalTokens") var totalTokens: Int = 0
    @AppStorage("analytics.lastActiveDay") private var lastActiveDay: String = ""
    @AppStorage("analytics.activeDays") var activeDays: Int = 0
    @AppStorage("analytics.streak") var streak: Int = 0

    func appendUser(_ text: String) {
        messages.append(.init(role: .user, text: text))
        if !isActive {
            withAnimation(.spring(response: 0.55, dampingFraction: 0.78)) {
                isActive = true
            }
        }
        recordActivityForToday()
    }

    func appendAssistant(text: String, toolCalls: [ToolCallRecord] = []) {
        messages.append(.init(role: .agent, text: text, toolCalls: toolCalls))
    }

    func appendTool(name: String, callId: String, result: String) {
        if let last = messages.last, last.role == .agent {
            if let idx = messages.indices.last {
                var msg = messages[idx]
                if let tcIdx = msg.toolCalls.firstIndex(where: { $0.id == callId }) {
                    msg.toolCalls[tcIdx].status = .done
                    msg.toolCalls[tcIdx].resultPreview = String(result.prefix(800))
                    messages[idx] = msg
                }
            }
        }
        messages.append(.init(role: .tool, text: result))
    }

    func reset() {
        withAnimation(.spring(response: 0.55, dampingFraction: 0.78)) {
            messages.removeAll()
            isActive = false
            thinking = false
            pendingApproval = nil
            composer = ""
        }
    }

    private func recordActivityForToday() {
        let today = ISO8601DateFormatter.dayOnly.string(from: Date())
        if today != lastActiveDay {
            // New active day. Bump streak if yesterday matches.
            let yesterday = ISO8601DateFormatter.dayOnly.string(
                from: Calendar.current.date(byAdding: .day, value: -1, to: Date()) ?? Date()
            )
            streak = (lastActiveDay == yesterday) ? streak + 1 : 1
            activeDays += 1
            lastActiveDay = today
        } else if streak == 0 {
            streak = 1
        }
    }
}

private extension ISO8601DateFormatter {
    static let dayOnly: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withYear, .withMonth, .withDay, .withDashSeparatorInDate]
        return f
    }()
}
