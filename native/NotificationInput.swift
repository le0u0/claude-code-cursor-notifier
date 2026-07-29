import Foundation

struct NotificationInput {
    let title: String
    let subtitle: String
    let body: String
    let identifier: String
    let clickFile: String
    let sound: String?
}

func parseArguments(_ arguments: [String]) -> NotificationInput? {
    var values: [String: String] = [:]
    var index = 1

    while index + 1 < arguments.count {
        let key = arguments[index]
        guard key.hasPrefix("--") else {
            index += 1
            continue
        }
        values[String(key.dropFirst(2))] = arguments[index + 1]
        index += 2
    }

    guard
        let title = values["title"],
        let body = values["body"],
        let identifier = values["identifier"],
        let clickFile = values["click-file"]
    else {
        return nil
    }

    return NotificationInput(
        title: title,
        subtitle: values["subtitle"] ?? "",
        body: body,
        identifier: identifier,
        clickFile: clickFile,
        sound: values["sound"]
    )
}
