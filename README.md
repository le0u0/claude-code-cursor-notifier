# Claude Code Cursor Notification

macOS notifications for Claude Code running in Cursor terminals.

- See when Claude needs approval or finishes a task.
- See the project, original task, and relevant command or response.
- Click a notification to return to the correct Cursor terminal.
- Keep existing Claude hooks.

## Requirements

macOS, Cursor, Node.js, and Apple Swift toolchain:

```bash
xcode-select --install
```

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/le0u0/claude-code-cursor-notification/main/install.sh | sh
```

Then:

1. Reload Cursor.
2. Run `Claude Notification: Install Hooks` from the Command Palette.
3. Open a new integrated terminal and run `claude`.

Optional: run `Claude Notification: Test Notification` from the Command Palette.

Allow macOS notification and Cursor Accessibility permissions when prompted.

## Development

```bash
npm install
npm test
npm run package
```

## License

MIT
