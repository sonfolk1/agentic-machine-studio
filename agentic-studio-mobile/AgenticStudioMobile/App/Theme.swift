//
//  Theme.swift
//  Pure-OLED charcoal palette.
//

import SwiftUI

extension Color {
    /// True black — uses the panel pixel-off on OLED iPhones.
    static let canvas      = Color(red: 0.000, green: 0.000, blue: 0.000)
    /// Cards & panels (slightly elevated).
    static let surface1    = Color(red: 0.071, green: 0.071, blue: 0.078) // #121214
    /// Inputs & secondary surfaces.
    static let surface2    = Color(red: 0.110, green: 0.110, blue: 0.118) // #1C1C1E
    /// Tertiary hover / hairline.
    static let surface3    = Color(red: 0.149, green: 0.149, blue: 0.161) // #26262A

    static let inkPrimary   = Color(red: 0.918, green: 0.918, blue: 0.929)
    static let inkSecondary = Color(red: 0.604, green: 0.608, blue: 0.643)
    static let inkTertiary  = Color(red: 0.388, green: 0.392, blue: 0.439)

    static let accentRust   = Color(red: 0.788, green: 0.541, blue: 0.357)  // #c98a5b
    static let accentSoft   = Color(red: 0.878, green: 0.659, blue: 0.478)  // #e0a87a

    static let goodGreen    = Color(red: 0.290, green: 0.871, blue: 0.502)
    static let warnAmber    = Color(red: 0.984, green: 0.792, blue: 0.310)
    static let dangerRed    = Color(red: 0.949, green: 0.412, blue: 0.412)
}

extension Font {
    static let appTitle    = Font.system(size: 28, weight: .semibold, design: .default)
    static let cardTitle   = Font.system(size: 15, weight: .semibold, design: .default)
    static let bodyTight   = Font.system(size: 14, weight: .regular, design: .default)
    static let bodySmall   = Font.system(size: 12.5, weight: .regular, design: .default)
    static let labelSmall  = Font.system(size: 11, weight: .semibold, design: .default).smallCaps()
    static let monoSmall   = Font.system(size: 11.5, weight: .regular, design: .monospaced)
}

struct HairlineDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color.white.opacity(0.05))
            .frame(height: 1)
    }
}

/// Subtle elevated card material used across the app.
struct CardBackground: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 16, style: .continuous)
            .fill(Color.surface1)
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.05), lineWidth: 1)
            )
    }
}
