//
//  ConnectionStatusCapsule.swift
//  Left-side indicator on the bottom bar.
//

import SwiftUI

struct ConnectionStatusCapsule: View {
    @EnvironmentObject private var socket: WebSocketManager

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 7, height: 7)
                .shadow(color: color.opacity(0.6), radius: 5)
            Text(label)
                .font(.system(size: 11.5, weight: .medium))
                .foregroundStyle(Color.inkPrimary)
                .lineLimit(1)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(
            Capsule().fill(Color.surface1)
        )
        .overlay(
            Capsule().strokeBorder(Color.white.opacity(0.05), lineWidth: 1)
        )
    }

    private var color: Color {
        if socket.isConnected { return .goodGreen }
        if socket.connectionError != nil { return .dangerRed }
        return .inkTertiary                       // neutral, not an error
    }

    private var label: String {
        if socket.isConnected { return "Remote Active" }
        if socket.connectionError != nil { return "Connection error" }
        return "Chat only"                        // standalone is a valid mode, not an error
    }
}
