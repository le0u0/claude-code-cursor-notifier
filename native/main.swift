import AppKit
import Foundation

final class AppDelegate: NSObject, NSApplicationDelegate {
    let input: NotificationInput
    var panel: NSPanel?
    var sound: NSSound?
    let replacement = Notification.Name("com.le0u0.claude-code-cursor-notifier.replace-popup")

    init(input: NotificationInput) {
        self.input = input
    }

    func applicationDidFinishLaunching(_: Notification) {
        // Only the latest popup stays visible, so simultaneous hooks cannot overlap.
        DistributedNotificationCenter.default().postNotificationName(replacement, object: nil, userInfo: nil, deliverImmediately: true)
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(dismiss), name: replacement, object: nil)
        guard let screen = NSScreen.main else { NSApplication.shared.terminate(nil); return }
        let frame = screen.visibleFrame
        let panel = NSPanel(
            contentRect: NSRect(x: frame.maxX - 380, y: frame.maxY - 144, width: 360, height: 124),
            styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false
        )
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.hidesOnDeactivate = false
        panel.isReleasedWhenClosed = false

        let background = NSVisualEffectView(frame: NSRect(x: 0, y: 0, width: 360, height: 124))
        background.material = .hudWindow
        background.state = .active
        background.wantsLayer = true
        background.layer?.cornerRadius = 16
        background.layer?.masksToBounds = true
        panel.contentView = background

        let icon = NSImageView(frame: NSRect(x: 14, y: 63, width: 40, height: 40))
        icon.image = NSImage(named: NSImage.Name("NSApplicationIcon"))
        background.addSubview(icon)
        let lines: [(String, CGFloat, CGFloat, NSFont)] = [
            (input.title, 88, 20, .boldSystemFont(ofSize: 13)),
            (input.subtitle, 67, 18, .systemFont(ofSize: 12)),
            (input.body, 17, 43, .systemFont(ofSize: 13))
        ]
        for (text, y, height, font) in lines {
            let label = NSTextField(wrappingLabelWithString: text)
            label.frame = NSRect(x: 65, y: y, width: 260, height: height)
            label.font = font
            label.maximumNumberOfLines = height > 20 ? 2 : 1
            label.lineBreakMode = .byTruncatingTail
            background.addSubview(label)
        }
        let open = NSButton(frame: background.bounds)
        open.title = ""
        open.isBordered = false
        open.isTransparent = true
        open.target = self
        open.action = #selector(openOrigin)
        open.setAccessibilityLabel("\(input.title). \(input.subtitle). \(input.body). Open project in \(input.editor)")
        background.addSubview(open)

        let close = NSButton(title: "×", target: self, action: #selector(dismiss))
        close.frame = NSRect(x: 330, y: 94, width: 24, height: 24)
        close.isBordered = false
        close.font = .systemFont(ofSize: 18)
        close.setAccessibilityLabel("Dismiss notification")
        background.addSubview(close)

        self.panel = panel
        panel.orderFrontRegardless()
        if let name = input.sound, !name.isEmpty {
            sound = NSSound(named: NSSound.Name(name))
            sound?.play()
        }
        print("Popup displayed")
        fflush(stdout)
        Timer.scheduledTimer(withTimeInterval: input.duration, repeats: false) { [weak self] _ in self?.dismiss() }
    }

    @objc func openOrigin() {
        do {
            try openProject(input.projectPath, editor: input.editor)
        } catch {
            fputs("Could not open project: \(error.localizedDescription)\n", stderr)
        }
        dismiss()
    }

    @objc func dismiss() {
        panel?.close()
        NSApplication.shared.terminate(nil)
    }
}

if CommandLine.arguments.contains("--self-test") {
    print("ClaudeCursorNotifier OK")
    exit(0)
}
guard let input = parseArguments(CommandLine.arguments) else {
    fputs("Invalid popup arguments.\n", stderr)
    exit(1)
}
let application = NSApplication.shared
let delegate = AppDelegate(input: input)
application.delegate = delegate
application.setActivationPolicy(.accessory)
application.run()
