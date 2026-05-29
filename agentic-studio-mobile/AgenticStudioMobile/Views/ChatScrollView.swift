//
//  ChatScrollView.swift
//  State B — vertical conversation, message bubbles, tool-call cards.
//

import SwiftUI

struct ChatScrollView: View {
    @EnvironmentObject private var session: ChatSession

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 14) {
                    ForEach(session.messages) { msg in
                        MessageBubble(message: msg)
                            .id(msg.id)
                    }
                    if session.thinking {
                        ThinkingShimmer()
                            .padding(.top, 4)
                            .id("thinking-row")
                    }
                    Color.clear.frame(height: 24).id("bottom-spacer")
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 12)
            }
            .scrollIndicators(.hidden)
            .onChange(of: session.messages.count) { _ in
                withAnimation(.easeOut(duration: 0.25)) {
                    proxy.scrollTo("bottom-spacer", anchor: .bottom)
                }
            }
            .onChange(of: session.thinking) { _ in
                withAnimation(.easeOut(duration: 0.25)) {
                    proxy.scrollTo("bottom-spacer", anchor: .bottom)
                }
            }
        }
    }
}

private struct ThinkingShimmer: View {
    @State private var shift: CGFloat = -0.2
    var body: some View {
        HStack {
            Circle()
                .fill(Color.surface3)
                .frame(width: 26, height: 26)
                .overlay(Text("AS").font(.system(size: 9, weight: .bold)).foregroundStyle(Color.inkSecondary))
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(LinearGradient(
                    colors: [Color.surface2, Color.surface3, Color.surface2],
                    startPoint: .leading,
                    endPoint: .trailing
                ))
                .frame(width: 140, height: 10)
                .opacity(0.85)
            Spacer()
        }
        .onAppear {
            withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                shift = 1.2
            }
        }
    }
}
