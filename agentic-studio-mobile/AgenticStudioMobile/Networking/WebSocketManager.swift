//
//  WebSocketManager.swift
//  Native URLSessionWebSocketTask wrapper used to talk to the
//  Agentic Studio desktop bridge (ws://<computer-ip>:8765).
//

import Foundation
import Combine

@MainActor
final class WebSocketManager: NSObject, ObservableObject {
    // MARK: - Published state -------------------------------------------------
    @Published var isConnected: Bool = false
    @Published var connectionError: String? = nil
    @Published var lastResponse: String = ""
    @Published var lastUrl: String = ""

    // MARK: - Private ---------------------------------------------------------
    private var task: URLSessionWebSocketTask?
    private lazy var session: URLSession = {
        let cfg = URLSessionConfiguration.default
        // WS connections are long-lived; do NOT impose a per-request timeout
        // or it'll silently kill an idle connection after ~30 s.
        cfg.timeoutIntervalForRequest = .greatestFiniteMagnitude
        cfg.timeoutIntervalForResource = .greatestFiniteMagnitude
        cfg.waitsForConnectivity = false
        return URLSession(configuration: cfg, delegate: self, delegateQueue: .main)
    }()

    /// Per-id pending continuations for request/response correlation.
    private var pending: [String: CheckedContinuation<[String: Any], Error>] = [:]

    /// Reconnection bookkeeping.
    private var reconnectWorkItem: DispatchWorkItem?
    private var manuallyClosed = false
    private var lastAttemptUrl: String?

    /// Heartbeat to keep the WS alive (URLSession + ws library both default
    /// to no keepalive; without this, iOS closes the idle socket).
    private var pingTimer: Timer?

    // MARK: - Public API ------------------------------------------------------

    /// The bridge token to send in `client_hello`. Read from settings on connect.
    var bridgeToken: String = ""

    /// Connect to a `ws://host:port` URL.
    /// If the URL doesn't contain a scheme, `ws://` is prepended automatically.
    func connect(url: String) {
        manuallyClosed = false
        connectionError = nil
        // Cancel any pending reconnect so we don't end up with two parallel
        // open attempts racing each other.
        reconnectWorkItem?.cancel()
        reconnectWorkItem = nil
        let normalized = normalize(url)
        guard let parsed = URL(string: normalized) else {
            connectionError = "Invalid URL: \(url)"
            return
        }
        disconnectInternal()
        lastAttemptUrl = normalized
        lastUrl = normalized
        let req = URLRequest(url: parsed)
        let new = session.webSocketTask(with: req)
        task = new
        new.resume()
        receiveLoop(for: new)
        // Send a client identification so the desktop can route correctly.
        let token = bridgeToken
        Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 100_000_000)
            var hello: [String: Any] = ["type": "client_hello", "role": "mobile"]
            if !token.isEmpty { hello["token"] = token }
            self?.fireAndForget(hello)
        }
    }

    /// Tear down the connection. No automatic reconnection.
    func disconnect() {
        manuallyClosed = true
        reconnectWorkItem?.cancel()
        reconnectWorkItem = nil
        stopPings()
        disconnectInternal()
        isConnected = false
    }

    /// Fire-and-forget command. The server's reply will surface in `lastResponse`.
    /// Spec-matching signature.
    func sendCommand(type: String, payload: [String: Any]) {
        let id = UUID().uuidString
        var msg = payload
        msg["id"] = id
        msg["type"] = type
        fireAndForget(msg)
    }

    /// Async overload that resolves with the matching server response.
    /// Tools should use this for the request/response loop.
    func sendCommandAndAwait(
        type: String,
        payload: [String: Any],
        timeout: TimeInterval = 60
    ) async throws -> [String: Any] {
        guard isConnected else {
            throw WSError.notConnected
        }
        let id = UUID().uuidString
        var msg = payload
        msg["id"] = id
        msg["type"] = type
        return try await withCheckedThrowingContinuation { (cont: CheckedContinuation<[String: Any], Error>) in
            pending[id] = cont
            do {
                try writeJSON(msg)
            } catch {
                pending.removeValue(forKey: id)
                cont.resume(throwing: error)
                return
            }
            Task { [weak self] in
                try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                guard let self else { return }
                if let waiting = self.pending.removeValue(forKey: id) {
                    waiting.resume(throwing: WSError.timeout(type))
                }
            }
        }
    }

    // MARK: - Internals -------------------------------------------------------

    private func normalize(_ raw: String) -> String {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.hasPrefix("ws://") || trimmed.hasPrefix("wss://") { return trimmed }
        if trimmed.hasPrefix("http://") {
            return "ws://" + trimmed.dropFirst("http://".count)
        }
        if trimmed.hasPrefix("https://") {
            return "wss://" + trimmed.dropFirst("https://".count)
        }
        return "ws://" + trimmed
    }

    private func disconnectInternal() {
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
        // Fail any pending requests.
        let inflight = pending
        pending.removeAll()
        for (_, cont) in inflight {
            cont.resume(throwing: WSError.disconnected)
        }
    }

    private func fireAndForget(_ obj: [String: Any]) {
        do {
            try writeJSON(obj)
        } catch {
            // Surface but don't crash; the user will see "Disconnected".
            connectionError = error.localizedDescription
        }
    }

    private func writeJSON(_ obj: [String: Any]) throws {
        guard let task else { throw WSError.notConnected }
        let data = try JSONSerialization.data(withJSONObject: obj, options: [])
        guard let text = String(data: data, encoding: .utf8) else { throw WSError.encoding }
        task.send(.string(text)) { [weak self] error in
            if let error = error {
                Task { @MainActor [weak self] in
                    self?.connectionError = error.localizedDescription
                }
            }
        }
    }

    /// Receive loop scoped to a specific task — events from a previous task
    /// no longer flip state on the new one.
    private func receiveLoop(for owner: URLSessionWebSocketTask) {
        owner.receive { [weak self] result in
            Task { @MainActor [weak self] in
                guard let self else { return }
                // Stale callback for a task we've already replaced — ignore.
                guard self.task === owner else { return }
                switch result {
                case .success(let msg):
                    switch msg {
                    case .string(let text):  self.handleIncoming(text: text)
                    case .data(let data):    self.handleIncoming(text: String(data: data, encoding: .utf8) ?? "")
                    @unknown default: break
                    }
                    self.receiveLoop(for: owner)
                case .failure(let err):
                    self.connectionError = err.localizedDescription
                    self.isConnected = false
                    self.stopPings()
                    self.scheduleReconnect()
                }
            }
        }
    }

    // MARK: - Keepalive pings ------------------------------------------------

    private func startPings() {
        stopPings()
        let timer = Timer(timeInterval: 20, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in self?.sendPing() }
        }
        RunLoop.main.add(timer, forMode: .common)
        pingTimer = timer
    }

    private func stopPings() {
        pingTimer?.invalidate()
        pingTimer = nil
    }

    private func sendPing() {
        guard let task else { return }
        task.sendPing { [weak self] error in
            if let error = error {
                Task { @MainActor [weak self] in
                    self?.connectionError = "ping failed: \(error.localizedDescription)"
                    self?.isConnected = false
                    self?.stopPings()
                    self?.scheduleReconnect()
                }
            }
        }
    }

    private func handleIncoming(text: String) {
        lastResponse = text
        guard
            let data = text.data(using: .utf8),
            let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        else { return }

        // Server's hello message confirms we're connected.
        if let t = obj["type"] as? String, t == "hello" {
            isConnected = true
            connectionError = nil
            return
        }
        if let t = obj["type"] as? String, t == "ack" {
            isConnected = true
            return
        }

        if let id = obj["id"] as? String, let cont = pending.removeValue(forKey: id) {
            if let errStr = obj["error"] as? String {
                cont.resume(throwing: WSError.remote(errStr))
            } else if let result = obj["result"] {
                if let dict = result as? [String: Any] {
                    cont.resume(returning: dict)
                } else {
                    cont.resume(returning: ["value": result])
                }
            } else {
                cont.resume(returning: obj)
            }
        }
    }

    private func scheduleReconnect() {
        guard !manuallyClosed, let url = lastAttemptUrl else { return }
        reconnectWorkItem?.cancel()
        let work = DispatchWorkItem { [weak self] in
            guard let self else { return }
            // If a different code path already brought us back up, no-op.
            if self.isConnected { return }
            self.connect(url: url)
        }
        reconnectWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0, execute: work)
    }
}

extension WebSocketManager: URLSessionWebSocketDelegate {
    nonisolated func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?
    ) {
        Task { @MainActor [weak self] in
            guard let self else { return }
            // Only react if this is our current task (avoid stale opens).
            guard self.task === webSocketTask else { return }
            self.reconnectWorkItem?.cancel()
            self.reconnectWorkItem = nil
            self.isConnected = true
            self.connectionError = nil
            self.startPings()
        }
    }

    nonisolated func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) {
        Task { @MainActor [weak self] in
            guard let self else { return }
            // Ignore close events for tasks we've already replaced.
            guard self.task === webSocketTask else { return }
            self.isConnected = false
            self.stopPings()
            self.connectionError = "closed (code=\(closeCode.rawValue))"
            self.scheduleReconnect()
        }
    }

    nonisolated func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: Error?
    ) {
        guard let error else { return }
        Task { @MainActor [weak self] in
            guard let self else { return }
            guard let wsTask = task as? URLSessionWebSocketTask, self.task === wsTask else { return }
            self.connectionError = error.localizedDescription
            self.isConnected = false
            self.stopPings()
            self.scheduleReconnect()
        }
    }
}

enum WSError: LocalizedError {
    case notConnected
    case disconnected
    case encoding
    case timeout(String)
    case remote(String)

    var errorDescription: String? {
        switch self {
        case .notConnected:  return "Not connected to a remote desktop."
        case .disconnected:  return "Disconnected during request."
        case .encoding:      return "Failed to encode the message."
        case .timeout(let t): return "Remote '\(t)' timed out."
        case .remote(let m): return m
        }
    }
}
