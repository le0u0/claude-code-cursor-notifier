import AppKit
import Foundation
import UserNotifications

final class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    let input: NotificationInput?

    init(input: NotificationInput?) {
        self.input = input
    }

    func applicationDidFinishLaunching(_: Notification) {
        let center = UNUserNotificationCenter.current()
        center.delegate = self

        guard let input else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                NSApplication.shared.terminate(nil)
            }
            return
        }

        center.requestAuthorization(options: [.alert, .sound]) { granted, error in
            guard granted, error == nil else {
                fputs("Notification permission denied\n", stderr)
                NSApplication.shared.terminate(nil)
                return
            }

            let content = UNMutableNotificationContent()
            content.title = input.title
            content.subtitle = input.subtitle
            content.body = input.body
            content.userInfo = ["projectPath": input.projectPath]
            if let sound = input.sound, !sound.isEmpty {
                content.sound = UNNotificationSound(
                    named: UNNotificationSoundName(rawValue: sound)
                )
            }

            let request = UNNotificationRequest(
                identifier: input.identifier,
                content: content,
                trigger: nil
            )
            center.add(request) { error in
                if let error {
                    fputs("Could not deliver notification: \(error.localizedDescription)\n", stderr)
                }
                NSApplication.shared.terminate(nil)
            }
        }
    }

    func userNotificationCenter(
        _: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        if let projectPath =
            response.notification.request.content.userInfo["projectPath"] as? String
        {
            try? openProject(projectPath)
        }
        completionHandler()
        NSApplication.shared.terminate(nil)
    }

    func userNotificationCenter(
        _: UNUserNotificationCenter,
        willPresent _: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }
}

if CommandLine.arguments.contains("--self-test") {
    print("ClaudeCursorNotifier OK")
    exit(0)
}

let application = NSApplication.shared
let delegate = AppDelegate(input: parseArguments(CommandLine.arguments))
application.delegate = delegate
application.setActivationPolicy(.accessory)
application.run()
