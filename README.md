# Claude Code Cursor Notification

Context-rich macOS notifications for Claude Code running in Cursor terminals.

- Approval notifications show the requested tool and command/path.
- Completion notifications show Claude's final response summary.
- Notification subtitle shows project and original task.
- Clicking returns to the originating Cursor project window and terminal.
- Existing Claude hooks are preserved during setup.
- The two legacy `osascript` hooks shown in this project's original setup are migrated to avoid duplicate alerts.
- Native click handling uses Apple's `UNUserNotificationCenter`; no Homebrew notification dependency.

## Requirements

- macOS
- Cursor
- Node.js
- Apple Swift toolchain (`xcode-select --install`)

## Install for development

```bash
npm install
npm test
npm run package
cursor --install-extension claude-code-cursor-notification-0.2.0.vsix
```

Reload Cursor. Run these commands from the Command Palette:

1. `Claude Notification: Install Hooks`
2. `Claude Notification: Test Notification`

Open a **new integrated terminal** after installing. Environment routing is injected when a terminal starts. Run Claude Code in that terminal.

The installed Claude hooks use `PermissionRequest` and `Stop`:

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/env node '/absolute/extension/path/src/hook.js'"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/env node '/absolute/extension/path/src/hook.js'"
          }
        ]
      }
    ]
  }
}
```

## How focus routing works

Each Cursor window injects a unique private channel into new integrated terminals. Claude's hook writes its event and process ancestry to that channel. The extension matches the ancestry against Cursor's terminal process IDs.

After notification click:

1. The bundled Swift helper writes a click marker.
2. Correct Cursor extension window receives it.
3. Matching terminal is revealed.
4. Cursor project window is raised through macOS Accessibility.

macOS asks once for notification permission. Grant Cursor Automation/Accessibility permission if macOS requests it while raising project windows.

## Known limitation

Exact routing targets Claude Code **terminal sessions**. Anthropic's public Cursor/VS Code URI can open Claude Code, but cannot select a specific IDE conversation. Hooks originating from Claude's IDE chat therefore fall back to the matching project window.

Project names identify native Cursor windows. Two Cursor windows showing the same workspace name are best-effort; terminal selection remains exact inside whichever matching project window macOS raises.

## Development

```bash
npm test
```

Extension JavaScript runs without transpilation. Setup compiles and ad-hoc signs the small Swift helper for the current Mac.

## License

MIT
