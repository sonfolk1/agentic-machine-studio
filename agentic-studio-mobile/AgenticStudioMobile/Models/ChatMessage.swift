//
//  ChatMessage.swift
//

import Foundation

enum ChatRole: String, Codable {
    case user
    case agent       // assistant text
    case system
    case tool        // tool result
}

struct ToolCallRecord: Identifiable, Codable, Equatable {
    let id: String
    let name: String
    let argsJSON: String        // pretty-printed for display
    var status: Status
    var resultPreview: String?

    enum Status: String, Codable {
        case pending             // awaiting approval
        case approved
        case denied
        case running
        case done
        case error
    }
}

struct ChatMessage: Identifiable, Equatable {
    let id: UUID
    let role: ChatRole
    var text: String
    var toolCalls: [ToolCallRecord] = []
    let createdAt: Date

    init(id: UUID = UUID(), role: ChatRole, text: String, toolCalls: [ToolCallRecord] = []) {
        self.id = id
        self.role = role
        self.text = text
        self.toolCalls = toolCalls
        self.createdAt = Date()
    }
}

/// Wire-format message ready to feed back into OpenRouter on the next turn.
struct WireMessage: Codable {
    let role: String                                  // user / assistant / tool / system
    let content: String?
    let tool_calls: [WireToolCall]?
    let tool_call_id: String?
    let name: String?
}

struct WireToolCall: Codable {
    let id: String
    let type: String                                  // always "function"
    let function: WireFunction
}

struct WireFunction: Codable {
    let name: String
    let arguments: String
}
