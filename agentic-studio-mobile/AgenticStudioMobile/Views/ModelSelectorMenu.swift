//
//  ModelSelectorMenu.swift
//  Right-side indicator on the bottom bar. Nested native context menu grouped
//  by brand family (with custom SVG brand icons) plus a reasoning-effort slider.
//  Includes a "Custom" section for entering an arbitrary model slug.
//

import SwiftUI

struct ModelSelectorMenu: View {
    @EnvironmentObject private var settings: ChatSettingsStore

    @State private var showingCustomInput = false
    @State private var customDraft = ""

    /// A selection that isn't in the catalog is a bring-your-own ("Custom") model.
    private var isCustomSelected: Bool {
        ModelCatalog.find(settings.selectedModel) == nil
    }

    /// The custom model to surface as a row: the remembered one, or the active
    /// selection if it happens to be custom.
    private var customModelToShow: String {
        if !settings.customModel.isEmpty { return settings.customModel }
        return isCustomSelected ? settings.selectedModel : ""
    }

    var body: some View {
        Menu {
            // Reasoning effort group at the top.
            Section("Reasoning effort") {
                ForEach(ReasoningEffort.allCases) { effort in
                    Button {
                        settings.reasoningEffort = effort
                    } label: {
                        if effort == settings.reasoningEffort {
                            Label(effort.label, systemImage: "checkmark")
                        } else {
                            Text("\(effort.label) — \(effort.hint)")
                        }
                    }
                }
            }

            // One Menu per brand family.
            ForEach(ModelCatalog.groups) { group in
                Menu {
                    ForEach(group.models) { entry in
                        Button {
                            settings.selectedModel = entry.id
                        } label: {
                            if entry.id == settings.selectedModel {
                                Label(entry.label, systemImage: "checkmark")
                            } else {
                                Text(entry.label)
                            }
                        }
                    }
                } label: {
                    Label(group.brand.displayName, systemImage: "circle.grid.cross.fill")
                }
            }

            // Custom — bring-your-own model slug, sitting with the other families.
            Menu {
                if !customModelToShow.isEmpty {
                    Button {
                        settings.customModel = customModelToShow
                        settings.selectedModel = customModelToShow
                    } label: {
                        if settings.selectedModel == customModelToShow {
                            Label(customModelToShow, systemImage: "checkmark")
                        } else {
                            Text(customModelToShow)
                        }
                    }
                }
                Button {
                    customDraft = customModelToShow
                    showingCustomInput = true
                } label: {
                    Label(customModelToShow.isEmpty ? "Enter a model…" : "Change model…",
                          systemImage: "square.and.pencil")
                }
            } label: {
                Label("Custom", systemImage: "slider.horizontal.3")
            }
        } label: {
            chip
        }
        .alert("Custom model", isPresented: $showingCustomInput) {
            TextField("provider/model-id", text: $customDraft)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled(true)
            Button("Use") { applyCustom() }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Enter any model slug OpenRouter accepts.")
        }
    }

    private func applyCustom() {
        let trimmed = customDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        settings.customModel = trimmed
        settings.selectedModel = trimmed
    }

    private var chip: some View {
        HStack(spacing: 6) {
            if let found = ModelCatalog.find(settings.selectedModel) {
                BrandIcon(brand: found.group.brand, size: 12)
                Text(found.entry.label)
                    .font(.system(size: 11.5, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color.inkPrimary)
            } else {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color.inkSecondary)
                Text(settings.selectedModel)
                    .font(.system(size: 11.5, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color.inkPrimary)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
            Image(systemName: "chevron.down")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(Color.inkTertiary)
            Capsule()
                .fill(Color.surface3)
                .frame(width: 1, height: 12)
            Image(systemName: "sparkle")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Color.accentSoft)
            Text(settings.reasoningEffort.label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.inkSecondary)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Capsule().fill(Color.surface1))
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.05), lineWidth: 1))
    }
}
