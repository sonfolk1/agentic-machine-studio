//
//  Notifications.swift
//  Local-notification helper used as a stand-in for APNs.
//
//  APNs is unavailable to SideStore-installed apps (free Apple ID profiles
//  don't carry the aps-environment entitlement). Local notifications still
//  work in the background-but-not-killed window, so we use them to surface
//  approval-required tool calls when the user has the app suspended.
//
//  If you ever pay for the Apple Developer Program, swap the
//  `scheduleLocalApprovalNotification` body for a server push and keep
//  everything else the same.

import Foundation
import UserNotifications

enum NotifAuthState {
    case unknown, requested, granted, denied
}

@MainActor
final class NotificationCoordinator {
    static let shared = NotificationCoordinator()
    private init() {}

    func requestAuthorization() async {
        let center = UNUserNotificationCenter.current()
        do {
            _ = try await center.requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            // Silently swallow — the user simply hasn't granted us yet.
        }
    }

    func scheduleApprovalRequest(toolName: String, primary: String) {
        let content = UNMutableNotificationContent()
        content.title = "Approval needed"
        content.subtitle = toolName
        content.body = primary
        content.sound = .default
        content.categoryIdentifier = "approval"

        let req = UNNotificationRequest(
            identifier: "approval-\(UUID().uuidString)",
            content: content,
            trigger: nil          // fire immediately
        )
        UNUserNotificationCenter.current().add(req) { _ in }
    }
}
