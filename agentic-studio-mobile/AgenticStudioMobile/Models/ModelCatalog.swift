//
//  ModelCatalog.swift
//  Same model list as the desktop app, grouped by brand for the picker.
//

import Foundation

enum Brand: String, CaseIterable, Identifiable {
    case openai, anthropic, google, alibaba, moonshot, xiaomi, xai, zai, deepseek, stepfun, openrouter

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .openai:     return "OpenAI"
        case .anthropic:  return "Anthropic"
        case .google:     return "Google"
        case .alibaba:    return "Alibaba"
        case .moonshot:   return "Moonshot"
        case .xiaomi:     return "MiMo (Xiaomi)"
        case .xai:        return "xAI"
        case .zai:        return "Z.ai (GLM)"
        case .deepseek:   return "Deepseek"
        case .stepfun:    return "StepFun"
        case .openrouter: return "OpenRouter"
        }
    }
}

struct ModelEntry: Identifiable, Hashable {
    let id: String                // OpenRouter slug, e.g. "anthropic/claude-opus-4.7"
    let label: String             // Display text, e.g. "opus-4.7"
}

struct ModelGroup: Identifiable {
    let id: Brand
    let brand: Brand
    let models: [ModelEntry]
}

enum ModelCatalog {
    static let groups: [ModelGroup] = [
        .init(id: .openai, brand: .openai, models: [
            .init(id: "openai/gpt-5.5", label: "gpt-5.5"),
            .init(id: "openai/gpt-5.4", label: "gpt-5.4"),
        ]),
        .init(id: .anthropic, brand: .anthropic, models: [
            .init(id: "anthropic/claude-opus-4.7", label: "opus-4.7"),
            .init(id: "anthropic/claude-sonnet-4.6", label: "sonnet-4.6"),
        ]),
        .init(id: .google, brand: .google, models: [
            .init(id: "google/gemini-3.5-flash", label: "gemini-3.5-flash"),
            .init(id: "google/gemini-3-flash-preview", label: "gemini-3-flash-preview"),
            .init(id: "google/gemini-3.1-pro-preview", label: "gemini-3.1-pro"),
            .init(id: "google/gemini-3.1-flash-lite", label: "gemini-3.1-flash-lite"),
        ]),
        .init(id: .alibaba, brand: .alibaba, models: [
            .init(id: "qwen/qwen3.7-max", label: "qwen-3.7-max"),
            .init(id: "qwen/qwen3.6-plus", label: "qwen-3.6-plus"),
        ]),
        .init(id: .moonshot, brand: .moonshot, models: [
            .init(id: "moonshotai/kimi-k2.6", label: "kimi-k2.6"),
            .init(id: "moonshotai/kimi-k2.5", label: "kimi-k2.5"),
        ]),
        .init(id: .xiaomi, brand: .xiaomi, models: [
            .init(id: "xiaomi/mimo-v2.5-pro", label: "mimo-v2.5-pro"),
            .init(id: "xiaomi/mimo-v2.5", label: "mimo-v2.5"),
        ]),
        .init(id: .xai, brand: .xai, models: [
            .init(id: "x-ai/grok-4.3", label: "grok-4.3"),
            .init(id: "x-ai/grok-build-0.1", label: "grok-build-0.1"),
        ]),
        .init(id: .zai, brand: .zai, models: [
            .init(id: "z-ai/glm-5.1", label: "glm-5.1"),
        ]),
        .init(id: .deepseek, brand: .deepseek, models: [
            .init(id: "deepseek/deepseek-v4-pro", label: "deepseek-v4-pro"),
            .init(id: "deepseek/deepseek-v4-flash", label: "deepseek-v4-flash"),
        ]),
        .init(id: .stepfun, brand: .stepfun, models: [
            .init(id: "stepfun/step-3.5-flash", label: "step-3.5-flash"),
            .init(id: "stepfun/step-3.7-flash", label: "step-3.7-flash"),
        ]),
        .init(id: .openrouter, brand: .openrouter, models: [
            .init(id: "openrouter/owl-alpha", label: "owl-alpha"),
        ]),
    ]

    static func find(_ slug: String) -> (entry: ModelEntry, group: ModelGroup)? {
        for g in groups {
            if let e = g.models.first(where: { $0.id == slug }) {
                return (e, g)
            }
        }
        return nil
    }
}

enum ReasoningEffort: String, CaseIterable, Identifiable, Codable {
    case minimal, low, medium, high
    var id: String { rawValue }
    var label: String { rawValue.capitalized }
    var hint: String {
        switch self {
        case .minimal: return "Fastest"
        case .low:     return "Light"
        case .medium:  return "Balanced"
        case .high:    return "Deep"
        }
    }
}
