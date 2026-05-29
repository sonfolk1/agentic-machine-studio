//
//  BrandIcon.swift
//  Per-brand custom SVG-style indicators, expressed as SwiftUI Path shapes.
//

import SwiftUI

struct BrandIcon: View {
    let brand: Brand
    var size: CGFloat = 14

    var body: some View {
        Group {
            switch brand {
            case .anthropic:  AnthropicShape()
            case .openai:     OpenAIShape()
            case .google:     GeminiShape()
            case .xai:        XAIShape()
            case .deepseek:   DeepseekShape()
            case .alibaba:    QwenShape()
            case .moonshot:   MoonshotShape()
            case .xiaomi:     MimoShape()
            case .zai:        GLMShape()
            case .stepfun:    StepFunShape()
            case .openrouter: OwlShape()
            }
        }
        .frame(width: size, height: size)
        .foregroundStyle(Color.inkPrimary)
    }
}

/// 24×24 canvas, drawn into the supplied frame.
private func remap(_ rect: CGRect, x: CGFloat, y: CGFloat) -> CGPoint {
    CGPoint(x: rect.minX + (x / 24) * rect.width,
            y: rect.minY + (y / 24) * rect.height)
}

private struct AnthropicShape: View {
    var body: some View {
        Canvas { ctx, size in
            let rect = CGRect(origin: .zero, size: size)
            var path = Path()
            // Stylized A made of three lines through origin.
            path.move(to: remap(rect, x: 7.4, y: 19.5))
            path.addLine(to: remap(rect, x: 10.2, y: 4.5))
            path.addLine(to: remap(rect, x: 13.0, y: 4.5))
            path.addLine(to: remap(rect, x: 16.6, y: 13.9))
            path.addLine(to: remap(rect, x: 20.3, y: 4.5))
            path.addLine(to: remap(rect, x: 22.7, y: 4.5))
            path.addLine(to: remap(rect, x: 18.4, y: 19.5))
            path.addLine(to: remap(rect, x: 15.8, y: 19.5))
            path.addLine(to: remap(rect, x: 12.0, y: 9.6))
            path.addLine(to: remap(rect, x: 8.2, y: 19.5))
            path.closeSubpath()
            ctx.fill(path, with: .color(Color.inkPrimary))
        }
    }
}

private struct OpenAIShape: View {
    var body: some View {
        Canvas { ctx, size in
            let rect = CGRect(origin: .zero, size: size)
            // Approximated knot — interlocking hex.
            let path = Path { p in
                let cx = rect.midX, cy = rect.midY
                let r = rect.width * 0.42
                for i in 0..<6 {
                    let a = Double(i) * (.pi / 3) - .pi / 2
                    let pt = CGPoint(x: cx + cos(a) * r, y: cy + sin(a) * r)
                    if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
                }
                p.closeSubpath()
                let r2 = r * 0.55
                p.move(to: CGPoint(x: cx + r2, y: cy))
                p.addArc(center: CGPoint(x: cx, y: cy), radius: r2, startAngle: .zero, endAngle: .degrees(360), clockwise: false)
            }
            ctx.stroke(path, with: .color(Color.inkPrimary), lineWidth: 1.4)
        }
    }
}

private struct GeminiShape: View {
    var body: some View {
        Canvas { ctx, size in
            let rect = CGRect(origin: .zero, size: size)
            var path = Path()
            // 4-point sparkle.
            path.move(to: remap(rect, x: 12, y: 2))
            path.addQuadCurve(to: remap(rect, x: 20, y: 10),    control: remap(rect, x: 14, y: 8))
            path.addQuadCurve(to: remap(rect, x: 12, y: 18),    control: remap(rect, x: 14, y: 14))
            path.addQuadCurve(to: remap(rect, x: 4, y: 10),     control: remap(rect, x: 10, y: 14))
            path.addQuadCurve(to: remap(rect, x: 12, y: 2),     control: remap(rect, x: 10, y: 8))
            path.closeSubpath()
            ctx.fill(path, with: .color(Color.inkPrimary))
        }
    }
}

private struct XAIShape: View {
    var body: some View {
        Canvas { ctx, size in
            let rect = CGRect(origin: .zero, size: size)
            let w = rect.width * 0.16
            // Diagonal 1 \
            var p1 = Path()
            p1.move(to: remap(rect, x: 4, y: 4))
            p1.addLine(to: remap(rect, x: 20, y: 20))
            ctx.stroke(p1, with: .color(Color.inkPrimary), style: StrokeStyle(lineWidth: w, lineCap: .round))
            // Diagonal 2 /
            var p2 = Path()
            p2.move(to: remap(rect, x: 20, y: 4))
            p2.addLine(to: remap(rect, x: 4, y: 20))
            ctx.stroke(p2, with: .color(Color.inkPrimary), style: StrokeStyle(lineWidth: w, lineCap: .round))
        }
    }
}

private struct DeepseekShape: View {
    var body: some View {
        Canvas { ctx, size in
            let rect = CGRect(origin: .zero, size: size)
            // D + dot (whale eye).
            var p = Path()
            p.move(to: remap(rect, x: 6, y: 4))
            p.addLine(to: remap(rect, x: 13, y: 4))
            p.addCurve(
                to: remap(rect, x: 13, y: 20),
                control1: remap(rect, x: 22, y: 6),
                control2: remap(rect, x: 22, y: 18)
            )
            p.addLine(to: remap(rect, x: 6, y: 20))
            p.closeSubpath()
            ctx.fill(p, with: .color(Color.inkPrimary))
            let eyeR: CGFloat = rect.width * 0.06
            let eye = Path(ellipseIn: CGRect(
                x: remap(rect, x: 15.5, y: 11).x - eyeR,
                y: remap(rect, x: 15.5, y: 11).y - eyeR,
                width: eyeR * 2, height: eyeR * 2
            ))
            ctx.fill(eye, with: .color(Color.canvas))
        }
    }
}

private struct QwenShape: View {
    var body: some View {
        Canvas { ctx, size in
            let rect = CGRect(origin: .zero, size: size)
            let circle = Path(ellipseIn: rect.insetBy(dx: rect.width * 0.12, dy: rect.height * 0.12))
            ctx.stroke(circle, with: .color(Color.inkPrimary), lineWidth: 1.6)
            // Tail
            var tail = Path()
            tail.move(to: remap(rect, x: 14.5, y: 14.5))
            tail.addLine(to: remap(rect, x: 19, y: 19))
            ctx.stroke(tail, with: .color(Color.inkPrimary), style: StrokeStyle(lineWidth: 1.8, lineCap: .round))
            let dot = Path(ellipseIn: CGRect(
                x: rect.midX - rect.width * 0.06,
                y: rect.midY - rect.height * 0.06,
                width: rect.width * 0.12,
                height: rect.height * 0.12
            ))
            ctx.fill(dot, with: .color(Color.inkPrimary))
        }
    }
}

private struct MoonshotShape: View {
    var body: some View {
        Canvas { ctx, size in
            let rect = CGRect(origin: .zero, size: size)
            var p = Path()
            // Outer disk
            p.addArc(center: CGPoint(x: rect.midX, y: rect.midY),
                     radius: rect.width * 0.38,
                     startAngle: .degrees(0),
                     endAngle: .degrees(360),
                     clockwise: false)
            // Inner cut-out (shifted)
            let cutCenter = CGPoint(x: rect.midX + rect.width * 0.15, y: rect.midY - rect.height * 0.10)
            p.addEllipse(in: CGRect(
                x: cutCenter.x - rect.width * 0.32,
                y: cutCenter.y - rect.height * 0.32,
                width: rect.width * 0.64,
                height: rect.height * 0.64
            ))
            ctx.fill(p, with: .color(Color.inkPrimary), style: FillStyle(eoFill: true))
        }
    }
}

private struct MimoShape: View {
    var body: some View {
        Canvas { ctx, size in
            let rect = CGRect(origin: .zero, size: size)
            var p = Path()
            // M strokes
            p.move(to: remap(rect, x: 5, y: 19))
            p.addLine(to: remap(rect, x: 5, y: 5))
            p.addLine(to: remap(rect, x: 12, y: 13))
            p.addLine(to: remap(rect, x: 19, y: 5))
            p.addLine(to: remap(rect, x: 19, y: 19))
            ctx.stroke(p, with: .color(Color.inkPrimary), style: StrokeStyle(lineWidth: 1.8, lineJoin: .round))
        }
    }
}

private struct GLMShape: View {
    var body: some View {
        Canvas { ctx, size in
            let rect = CGRect(origin: .zero, size: size)
            // Hexagon
            var hex = Path()
            for i in 0..<6 {
                let a = Double(i) * (.pi / 3) - .pi / 2
                let pt = CGPoint(x: rect.midX + cos(a) * rect.width * 0.42,
                                 y: rect.midY + sin(a) * rect.height * 0.42)
                if i == 0 { hex.move(to: pt) } else { hex.addLine(to: pt) }
            }
            hex.closeSubpath()
            ctx.stroke(hex, with: .color(Color.inkPrimary), lineWidth: 1.6)
            // Cross
            var cross = Path()
            cross.move(to: remap(rect, x: 8, y: 12))
            cross.addLine(to: remap(rect, x: 16, y: 12))
            cross.move(to: remap(rect, x: 12, y: 8))
            cross.addLine(to: remap(rect, x: 12, y: 16))
            ctx.stroke(cross, with: .color(Color.inkPrimary), style: StrokeStyle(lineWidth: 1.6, lineCap: .round))
        }
    }
}

private struct StepFunShape: View {
    var body: some View {
        Canvas { ctx, size in
            let rect = CGRect(origin: .zero, size: size)
            // Three ascending steps (rounded squares), matching the desktop icon.
            let blocks: [(CGFloat, CGFloat)] = [(3, 14.5), (9.25, 9.25), (15.5, 4)]
            let side: CGFloat = 5.5
            for (x, y) in blocks {
                let origin = remap(rect, x: x, y: y)
                let far = remap(rect, x: x + side, y: y + side)
                let r = CGRect(x: origin.x, y: origin.y,
                               width: far.x - origin.x, height: far.y - origin.y)
                let path = Path(roundedRect: r, cornerRadius: (far.x - origin.x) * 0.22)
                ctx.fill(path, with: .color(Color.inkPrimary))
            }
        }
    }
}

private struct OwlShape: View {
    var body: some View {
        Canvas { ctx, size in
            let rect = CGRect(origin: .zero, size: size)
            // Head outline (rounded triangle).
            var head = Path()
            head.move(to: remap(rect, x: 5, y: 4))
            head.addLine(to: remap(rect, x: 7.6, y: 7.4))
            head.addQuadCurve(to: remap(rect, x: 16.4, y: 7.4), control: remap(rect, x: 12, y: 5))
            head.addLine(to: remap(rect, x: 19, y: 4))
            head.addLine(to: remap(rect, x: 18.3, y: 8.2))
            // Bottom body arc
            head.addArc(center: CGPoint(x: rect.midX, y: rect.midY + rect.height * 0.10),
                        radius: rect.width * 0.42,
                        startAngle: .degrees(-30),
                        endAngle: .degrees(210),
                        clockwise: true)
            ctx.stroke(head, with: .color(Color.inkPrimary), style: StrokeStyle(lineWidth: 1.4, lineJoin: .round))

            // Eyes
            let eyeR: CGFloat = rect.width * 0.10
            for cx in [9.2, 14.8] {
                let c = remap(rect, x: CGFloat(cx), y: 13)
                let outer = Path(ellipseIn: CGRect(x: c.x - eyeR, y: c.y - eyeR, width: eyeR * 2, height: eyeR * 2))
                ctx.stroke(outer, with: .color(Color.inkPrimary), lineWidth: 1.4)
                let innerR = eyeR * 0.4
                let inner = Path(ellipseIn: CGRect(x: c.x - innerR, y: c.y - innerR, width: innerR * 2, height: innerR * 2))
                ctx.fill(inner, with: .color(Color.inkPrimary))
            }
            // Beak
            var beak = Path()
            beak.move(to: remap(rect, x: 11.2, y: 16.4))
            beak.addLine(to: remap(rect, x: 12, y: 17.8))
            beak.addLine(to: remap(rect, x: 12.8, y: 16.4))
            beak.closeSubpath()
            ctx.fill(beak, with: .color(Color.inkPrimary))
        }
    }
}
