//
//  AgentLoop.swift
//  Multi-turn OpenRouter loop. Tool calls are forwarded over the WebSocket
//  to the desktop bridge for execution; results are fed back to the model.
//

import Foundation
import SwiftUI

@MainActor
final class AgentLoop {
    let session: ChatSession
    let socket: WebSocketManager
    let settings: ChatSettingsStore

    /// Used when a desktop is paired over WS — full agent loop with tools.
    private static let systemPromptTethered = """
    You are Agentic Studio Mobile, an autonomous agent running on the user's iPhone.
    The user has paired the phone with a desktop computer over WebSocket.

    You can drive the desktop with these tools:
      shell, create_file, view_file, edit_file, scan_directory.

    Be decisive: scan before assuming structure, prefer focused edits, and verify with shell when useful.
    Keep replies short. Always call a tool instead of describing what you would do.
    """

    /// Used in standalone mode — no desktop, no tools, just chat.
    private static let systemPromptStandalone = """
    You are Agentic Studio Mobile, a helpful AI assistant running on the user's iPhone.
    There is no desktop paired right now, so you have no shell, filesystem, or browser tools — you're a chat-only assistant for this conversation.

    Be concise, friendly, and helpful. Use Markdown for code blocks and lists when it improves clarity.
    If the user asks for something that would require running code or touching files, say so plainly and suggest they pair a desktop in Settings to enable those tools.
    """

    init(session: ChatSession, socket: WebSocketManager, settings: ChatSettingsStore) {
        self.session = session
        self.socket = socket
        self.settings = settings
    }

    func run(userMessage: String) async {
        session.appendUser(userMessage)
        session.thinking = true

        let client = OpenRouterClient(apiKey: settings.openRouterKey)

        // Build the wire history. Switch system prompt + tool surface based
        // on whether a desktop is paired *right now*.
        let tethered = socket.isConnected
        var wire: [[String: Any]] = []
        wire.append([
            "role": "system",
            "content": tethered ? Self.systemPromptTethered : Self.systemPromptStandalone,
        ])
        for m in session.messages where m.role != .tool {
            switch m.role {
            case .user:   wire.append(["role": "user", "content": m.text])
            case .agent:  wire.append(["role": "assistant", "content": m.text])
            case .system: wire.append(["role": "system", "content": m.text])
            default: break
            }
        }

        var safety = 0
        do {
            while safety < 18 {
                safety += 1
                let supportsReasoning = supportsReasoning(model: settings.selectedModel)
                let (assistant, totalTokens) = try await client.completion(
                    model: settings.selectedModel,
                    messages: wire,
                    reasoning: supportsReasoning ? settings.reasoningEffort : nil,
                    includeTools: socket.isConnected
                )
                if let total = totalTokens {
                    session.totalTokens = max(session.totalTokens, total)
                }

                // Show any assistant text.
                let toolCalls = assistant.tool_calls ?? []
                if let content = assistant.content, !content.isEmpty {
                    session.appendAssistant(
                        text: content,
                        toolCalls: toolCalls.map(toRecord(_:))
                    )
                } else if !toolCalls.isEmpty {
                    session.appendAssistant(text: "", toolCalls: toolCalls.map(toRecord(_:)))
                }

                // Push the assistant turn into wire history (with tool_calls).
                var assistantWire: [String: Any] = ["role": "assistant", "content": assistant.content ?? ""]
                if !toolCalls.isEmpty {
                    assistantWire["tool_calls"] = toolCalls.map { c in
                        [
                            "id": c.id,
                            "type": "function",
                            "function": [
                                "name": c.function.name,
                                "arguments": c.function.arguments
                            ]
                        ] as [String: Any]
                    }
                }
                wire.append(assistantWire)

                if toolCalls.isEmpty { break }

                // Execute each tool call sequentially.
                for call in toolCalls {
                    let args = parseArgs(call.function.arguments)
                    var status: ToolCallRecord.Status = .running
                    if settings.requireApproval {
                        status = .pending
                        updateToolStatus(callId: call.id, to: .pending)
                        // Wait for the user.
                        let decision = await waitForApproval(callId: call.id, name: call.function.name, args: args)
                        if decision == .deny {
                            let result = "User denied this tool call."
                            updateToolStatus(callId: call.id, to: .denied, result: result)
                            wire.append([
                                "role": "tool",
                                "tool_call_id": call.id,
                                "name": call.function.name,
                                "content": result
                            ])
                            continue
                        } else {
                            updateToolStatus(callId: call.id, to: .running)
                            status = .running
                        }
                    } else {
                        updateToolStatus(callId: call.id, to: .running)
                    }

                    // Send over the WebSocket to the desktop.
                    do {
                        guard socket.isConnected else {
                            throw WSError.notConnected
                        }
                        let result = try await socket.sendCommandAndAwait(
                            type: call.function.name,
                            payload: args
                        )
                        let resultData = try JSONSerialization.data(withJSONObject: result, options: [])
                        let resultText = String(data: resultData, encoding: .utf8) ?? "{}"
                        updateToolStatus(callId: call.id, to: .done, result: resultText)
                        wire.append([
                            "role": "tool",
                            "tool_call_id": call.id,
                            "name": call.function.name,
                            "content": resultText
                        ])
                    } catch {
                        let errStr = error.localizedDescription
                        updateToolStatus(callId: call.id, to: .error, result: errStr)
                        wire.append([
                            "role": "tool",
                            "tool_call_id": call.id,
                            "name": call.function.name,
                            "content": "{\"error\":\"\(errStr.replacingOccurrences(of: "\"", with: "\\\""))\"}"
                        ])
                    }
                }
            }
        } catch {
            session.appendAssistant(text: "**Error:** \(error.localizedDescription)")
        }
        session.thinking = false
    }

    // MARK: - Helpers ---------------------------------------------------------

    private func supportsReasoning(model: String) -> Bool {
        let m = model.lowercased()
        let patterns = ["gpt-5", "opus", "sonnet", "claude-4", "gemini-3", "grok-4", "deepseek-v4", "glm-5", "kimi-k2", "qwen3", "mimo", "owl"]
        return patterns.contains { m.contains($0) }
    }

    private func toRecord(_ c: ORToolCall) -> ToolCallRecord {
        ToolCallRecord(
            id: c.id,
            name: c.function.name,
            argsJSON: prettyJSON(c.function.arguments),
            status: settings.requireApproval ? .pending : .running,
            resultPreview: nil
        )
    }

    private func prettyJSON(_ s: String) -> String {
        guard
            let data = s.data(using: .utf8),
            let obj = try? JSONSerialization.jsonObject(with: data),
            let prettyData = try? JSONSerialization.data(withJSONObject: obj, options: [.prettyPrinted, .sortedKeys]),
            let pretty = String(data: prettyData, encoding: .utf8)
        else { return s }
        return pretty
    }

    private func parseArgs(_ s: String) -> [String: Any] {
        guard
            let data = s.data(using: .utf8),
            let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return [:] }
        return obj
    }

    private func updateToolStatus(callId: String, to status: ToolCallRecord.Status, result: String? = nil) {
        for (i, m) in session.messages.enumerated() where m.role == .agent {
            if let j = m.toolCalls.firstIndex(where: { $0.id == callId }) {
                var copy = m
                copy.toolCalls[j].status = status
                if let result { copy.toolCalls[j].resultPreview = String(result.prefix(800)) }
                session.messages[i] = copy
            }
        }
    }

    private enum Decision { case approve, deny }
    private func waitForApproval(callId: String, name: String, args: [String: Any]) async -> Decision {
        let record = ToolCallRecord(
            id: callId,
            name: name,
            argsJSON: (try? String(data: JSONSerialization.data(withJSONObject: args, options: [.prettyPrinted]), encoding: .utf8)) ?? "{}",
            status: .pending,
            resultPreview: nil
        )
        session.pendingApproval = record
        // Local notification — wakes the user if the app is backgrounded.
        if settings.notifyOnApproval {
            let primary = (args["command"] as? String)
                ?? (args["path"] as? String)
                ?? "tool call awaiting approval"
            NotificationCoordinator.shared.scheduleApprovalRequest(toolName: name, primary: primary)
        }
        // Poll the pendingApproval value until cleared or replaced.
        while session.pendingApproval?.id == callId {
            if session.pendingApproval?.status == .approved { break }
            if session.pendingApproval?.status == .denied { break }
            try? await Task.sleep(nanoseconds: 80_000_000)
        }
        let decision: Decision = session.pendingApproval?.status == .denied ? .deny : .approve
        session.pendingApproval = nil
        return decision
    }
}

extension ChatSession {
    /// Called by the approval banner buttons.
    func resolveApproval(_ decision: AgentApprovalDecision) {
        guard var current = pendingApproval else { return }
        current.status = (decision == .approve) ? .approved : .denied
        pendingApproval = current
    }
}

enum AgentApprovalDecision {
    case approve, deny
}
