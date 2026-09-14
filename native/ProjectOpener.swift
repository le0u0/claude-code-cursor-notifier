import Foundation

func openProject(
    _ projectPath: String,
    editor: String = "Cursor",
    launcherPath: String = "/usr/bin/open"
) throws {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: launcherPath)
    process.arguments = ["-a", editor, projectPath]
    try process.run()
    process.waitUntilExit()
}
