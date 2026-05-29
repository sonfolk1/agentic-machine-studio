//
//  BackgroundKeepalive.swift
//  Schedules a periodic BGProcessingTask that pings the desktop bridge so
//  the WS stays warm-ish while the app is backgrounded. iOS still kills
//  the socket aggressively when fully suspended — this only helps when
//  the OS chooses to run our task (which it does opportunistically).
//

import Foundation
import BackgroundTasks
import SwiftUI

enum BackgroundKeepalive {
    static let identifier = "com.agenticstudio.mobile.keepalive"

    static func register(_ session: ChatSession, _ socket: WebSocketManager) {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: identifier, using: nil) { task in
            guard let bgTask = task as? BGProcessingTask else { task.setTaskCompleted(success: true); return }
            Task { @MainActor in
                if !socket.isConnected, !socket.lastUrl.isEmpty {
                    socket.connect(url: socket.lastUrl)
                }
                schedule()                // queue the next one before exiting
                bgTask.setTaskCompleted(success: true)
            }
        }
    }

    static func schedule() {
        let request = BGProcessingTaskRequest(identifier: identifier)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false
        request.earliestBeginDate = Date(timeIntervalSinceNow: 60)
        do { try BGTaskScheduler.shared.submit(request) } catch { /* user has bg refresh off — fine */ }
    }
}
