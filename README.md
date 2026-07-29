# Claude Cursor Notifier

Standalone macOS notifications for Claude Code running in Cursor.

- See when Claude needs approval or finishes a task.
- See the project, original task, and relevant command or response.
- Click a notification to open its project in Cursor.
- Keep existing Claude hooks.

## Install

Requires macOS 13+, Cursor, and Node.js.

```bash
curl -fsSL https://raw.githubusercontent.com/le0u0/claude-code-cursor-notifier/main/install.sh | sh
```

The installer builds the native notifier and adds `PermissionRequest` and `Stop`
hooks to `~/.claude/settings.json`. Existing hooks are preserved.

If the Apple Swift toolchain is missing, the installer tells you how to install it.
Then run the command again.

Done. Run `claude` normally and allow notifications when macOS asks.

## Update

Run the install command again.

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/le0u0/claude-code-cursor-notifier/main/uninstall.sh | sh
```

## License

MIT
