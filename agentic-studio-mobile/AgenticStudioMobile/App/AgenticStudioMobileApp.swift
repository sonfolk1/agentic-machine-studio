//
//  AgenticStudioMobileApp.swift
//  Agentic Studio Mobile
//
//  Premium dark-themed iOS companion to the Agentic Studio desktop app.
//

import SwiftUI

@main
struct AgenticStudioMobileApp: App {
    @StateObject private var socket = WebSocketManager()
    @StateObject private var session = ChatSession()
    @StateObject private var settings = ChatSettingsStore()

    init() {
        // Force every navigation bar to render against the pure OLED black.
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = UIColor.black
        appearance.titleTextAttributes = [.foregroundColor: UIColor.white]
        appearance.largeTitleTextAttributes = [.foregroundColor: UIColor.white]
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance

        // Register the background keepalive task ID with iOS so we can submit
        // it from .task below. Must run before applicationDidFinishLaunching
        // completes — calling it in init() satisfies that.
    }

    var body: some Scene {
        WindowGroup {
            MainWorkspaceView()
                .environmentObject(socket)
                .environmentObject(session)
                .environmentObject(settings)
                .preferredColorScheme(.dark)
                .tint(Color.accentRust)
                .background(Color.black.ignoresSafeArea())
                .task {
                    socket.bridgeToken = settings.bridgeToken
                    await NotificationCoordinator.shared.requestAuthorization()
                    BackgroundKeepalive.register(session, socket)
                    BackgroundKeepalive.schedule()
                }
                .onChange(of: settings.bridgeToken) { newValue in
                    socket.bridgeToken = newValue
                }
        }
    }
}
