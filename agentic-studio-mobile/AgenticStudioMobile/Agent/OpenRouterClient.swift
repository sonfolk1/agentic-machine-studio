//
//  OpenRouterClient.swift
//  Minimal HTTP client for OpenRouter chat completions with tool calling.
//

import Foundation

struct ORChoice: Decodable {
    let message: ORAssistantMessage
}

struct ORAssistantMessage: Decodable {
    let role: String
    let content: String?
    let tool_calls: [ORToolCall]?
}

struct ORToolCall: Decodable {
    let id: String
    let type: String
    let function: ORToolFunction
}

struct ORToolFunction: Decodable {
    let name: String
    let arguments: String
}

struct ORUsage: Decodable {
    let total_tokens: Int?
}

struct ORResponse: Decodable {
    let choices: [ORChoice]
    let usage: ORUsage?
}

struct ORToolDef {
    let name: String
    let description: String
    let parameters: [String: Any]
}

enum OpenRouterError: LocalizedError {
    case missingKey
    case http(Int, String)
    case decode(String)

    var errorDescription: String? {
        switch self {
        case .missingKey:        return "OpenRouter API key is empty. Add one in Settings."
        case .http(let c, let m): return "OpenRouter HTTP \(c): \(m)"
        case .decode(let m):     return "Decode error: \(m)"
        }
    }
}

struct OpenRouterClient {
    var apiKey: String

    /// The tool set the iOS app advertises to the model.
    /// These match what the desktop's mobile RPC dispatcher accepts.
    static let toolDefs: [ORToolDef] = [
        .init(name: "shell", description: "Run a shell command on the remote desktop.", parameters: [
            "type": "object",
            "properties": [
                "command": ["type": "string"],
                "cwd": ["type": "string"]
            ],
            "required": ["command"]
        ]),
        .init(name: "create_file", description: "Create or overwrite a file in the desktop workspace.", parameters: [
            "type": "object",
            "properties": [
                "path": ["type": "string"],
                "contents": ["type": "string"]
            ],
            "required": ["path", "contents"]
        ]),
        .init(name: "view_file", description: "View a file or list a directory in the desktop workspace.", parameters: [
            "type": "object",
            "properties": ["path": ["type": "string"]],
            "required": ["path"]
        ]),
        .init(name: "edit_file", description: "Replace a unique substring inside a desktop workspace file.", parameters: [
            "type": "object",
            "properties": [
                "path": ["type": "string"],
                "old_string": ["type": "string"],
                "new_string": ["type": "string"]
            ],
            "required": ["path", "old_string", "new_string"]
        ]),
        .init(name: "scan_directory", description: "List the workspace tree up to a depth.", parameters: [
            "type": "object",
            "properties": [
                "path": ["type": "string"],
                "depth": ["type": "number"]
            ]
        ]),
    ]

    func completion(
        model: String,
        messages: [[String: Any]],
        reasoning: ReasoningEffort?,
        includeTools: Bool
    ) async throws -> (assistant: ORAssistantMessage, totalTokens: Int?) {
        guard !apiKey.isEmpty else { throw OpenRouterError.missingKey }

        var body: [String: Any] = [
            "model": model,
            "messages": messages,
            "stream": false,
        ]
        if includeTools {
            body["tool_choice"] = "auto"
            body["tools"] = Self.toolDefs.map { def in
                [
                    "type": "function",
                    "function": [
                        "name": def.name,
                        "description": def.description,
                        "parameters": def.parameters
                    ]
                ] as [String: Any]
            }
        }
        if let reasoning = reasoning {
            body["reasoning"] = ["effort": reasoning.rawValue]
        }

        var req = URLRequest(url: URL(string: "https://openrouter.ai/api/v1/chat/completions")!)
        req.httpMethod = "POST"
        req.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Agentic Studio Mobile", forHTTPHeaderField: "X-Title")
        req.setValue("https://agentic.studio.local", forHTTPHeaderField: "HTTP-Referer")
        req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw OpenRouterError.http(0, "no response") }
        guard (200..<300).contains(http.statusCode) else {
            let text = String(data: data, encoding: .utf8) ?? ""
            throw OpenRouterError.http(http.statusCode, String(text.prefix(400)))
        }
        do {
            let parsed = try JSONDecoder().decode(ORResponse.self, from: data)
            guard let first = parsed.choices.first else { throw OpenRouterError.decode("no choices") }
            return (first.message, parsed.usage?.total_tokens)
        } catch {
            throw OpenRouterError.decode(error.localizedDescription)
        }
    }
}
