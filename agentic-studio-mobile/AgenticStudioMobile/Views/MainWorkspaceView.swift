//
//  MainWorkspaceView.swift
//  The sliding-view state machine. State A (Dashboard) → State B (Workspace)
//  driven by `ChatSession.isActive`.
//

import SwiftUI

struct MainWorkspaceView: View {
    @EnvironmentObject private var socket: WebSocketManager
    @EnvironmentObject private var session: ChatSession
    @EnvironmentObject private var settings: ChatSettingsStore

    @State private var showingChatSettings = false

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.canvas.ignoresSafeArea()

            // Main slide-away container.
            VStack(spacing: 0) {
                topBar
                ZStack {
                    if session.isActive {
                        ChatScrollView()
                            .transition(.asymmetric(
                                insertion: .opacity.combined(with: .move(edge: .bottom)),
                                removal: .move(edge: .top).combined(with: .opacity)
                            ))
                    } else {
                        DashboardHome()
                            .transition(.asymmetric(
                                insertion: .opacity.combined(with: .move(edge: .top)),
                                removal: .move(edge: .top).combined(with: .opacity)
                            ))
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipped()
            }
            .padding(.bottom, 110)        // room for the floating input bar

            // Floating bottom control bar.
            BottomInputBar()
                .ignoresSafeArea(.keyboard, edges: .bottom)

            // Approval overlay sits above everything but below the keyboard.
            if let pending = session.pendingApproval {
                ApprovalBannerOverlay(record: pending)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(10)
            }
        }
        .animation(.spring(response: 0.55, dampingFraction: 0.78), value: session.isActive)
        .animation(.spring(response: 0.45, dampingFraction: 0.82), value: session.pendingApproval)
        .sheet(isPresented: $showingChatSettings) {
            ChatSettingsView()
                .environmentObject(settings)
                .environmentObject(socket)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
                .presentationBackground(Color.canvas)
        }
        .background(Color.canvas)
    }

    private var topBar: some View {
        HStack(spacing: 10) {
            Button {
                session.reset()
            } label: {
                HStack(spacing: 8) {
                    LogoMark()
                    Text("Agentic Studio")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.inkPrimary)
                }
            }
            .buttonStyle(.plain)

            Spacer()

            Button {
                showingChatSettings = true
            } label: {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Color.inkSecondary)
                    .padding(8)
                    .background(Circle().fill(Color.surface2))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 18)
        .padding(.top, 8)
        .padding(.bottom, 12)
    }
}

private struct LogoMark: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 7, style: .continuous)
                .fill(LinearGradient(
                    colors: [Color.accentRust, Color.accentSoft],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
            Image(systemName: "sparkle")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(Color.canvas)
        }
        .frame(width: 22, height: 22)
    }
}

#Preview {
    MainWorkspaceView()
        .environmentObject(WebSocketManager())
        .environmentObject(ChatSession())
        .environmentObject(ChatSettingsStore())
}
