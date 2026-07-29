import Foundation

func openProject(
    _ projectPath: String,
    launcherPath: String = "/usr/bin/open"
) throws {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: launcherPath)
    process.arguments = ["-a", "Cursor", projectPath]
    try process.run()
    process.waitUntilExit()
}
