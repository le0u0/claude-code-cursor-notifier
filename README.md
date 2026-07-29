# Claude Cursor Notifier

Standalone macOS notifications for Claude Code running in Cursor.

- See when Claude needs approval or finishes a task.
- See the project, original task, and relevant command or response.
- Click a notification to open its project in Cursor.
- Keep existing Claude hooks.

## Requirements

macOS, Cursor, Node.js, and Apple Swift toolchain:

```bash
xcode-select --install
```

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/le0u0/claude-code-cursor-notifier/main/install.sh | sh
```

Done. Run `claude` normally. Allow macOS notification permission when prompted.

## Development

```bash
npm test
```

## License

MIT
