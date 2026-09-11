# Claude Cursor Notifier

A Claude Code plugin for macOS notifications while working in Cursor or VS Code's terminal.

- Alerts for approvals, interactive questions, MCP input, and finished responses.
- Shows the project, original task, and relevant command or response.
- Plays a sound; clicking opens the originating project in your selected editor.
- Includes `/claude-cursor-notifier:init` for setup and migration.

Requires macOS, Node.js 18+, Cursor or VS Code, and terminal-notifier 3+.

## Install

After this version is published to GitHub, run inside Claude Code:

```text
/plugin marketplace add le0u0/claude-code-cursor-notifier
/plugin install claude-cursor-notifier@claude-cursor-notifier-marketplace
```

Restart Claude Code, then run:

```text
/claude-cursor-notifier:init
```

The init skill lets you choose Cursor or VS Code, checks dependencies and notification permission, sends a banner,
sound, and click test, then backs up settings and removes this notifier's old
standalone hooks. The skill opens System Settings when permission or alert style needs attention,
guides you to allow notifications and choose Persistent/Alerts, then rechecks.
macOS permission must be granted by you. It preserves unrelated hooks.
Do not use the legacy `install.sh` for plugin installation.

## Test this checkout before publishing

From this repository in Cursor's terminal:

```bash
claude --plugin-dir "$PWD"
```

Run `/claude-cursor-notifier:init`. This loads the local checkout without publishing.
Restart with the same flag for local development; a marketplace installation is
required for normal plugin update management.

## Update

For a GitHub marketplace installation:

```text
/plugin marketplace update claude-cursor-notifier-marketplace
/plugin update claude-cursor-notifier@claude-cursor-notifier-marketplace
```

Restart Claude Code. Plugin updates replace the hooks and skill; they do not upgrade
terminal-notifier or change macOS permissions. Maintainers must publish their changes
and bump `.claude-plugin/plugin.json` before users can receive a new plugin version.

## Troubleshooting

Run `/claude-cursor-notifier:init` again. Hook delivery errors appear on stderr with
a setup hint; delivery failure never blocks approval or keeps a Stop hook running.
The default sound is `Glass`. Set `CLAUDE_CURSOR_NOTIFIER_SOUND` to another system
sound, or an empty string to mute. `CLAUDE_CURSOR_NOTIFIER_PATH` can point to a custom
terminal-notifier executable. No runtime files are written inside the plugin cache.

## Uninstall

```text
/plugin uninstall claude-cursor-notifier@claude-cursor-notifier-marketplace
```

Restart Claude Code. This leaves terminal-notifier installed for other applications.
The legacy standalone installer and native sources remain for compatibility; the
plugin uses terminal-notifier and does not build the native helper.

## License

MIT

## Editor preference

Run `/claude-cursor-notifier:init` to choose Cursor or VS Code. The choice applies
to all sessions using the same Claude configuration; it does not automatically
switch with the terminal host. Cursor is the default until configured. The choice
is saved in `~/.claude/claude-cursor-notifier.json` (or under `CLAUDE_CONFIG_DIR`)
and survives plugin updates.

## Notification icon

The init skill installs the original black bell-and-terminal icon in a dedicated
`Claude Code Notifier.app` under `~/Library/Application Support/ClaudeCursorNotifierIcon`.
It copies the installed terminal-notifier app, preserves its license, and leaves
Homebrew's copy unchanged. Enable notifications for **Claude Code Notifier** when
asked. Select **Persistent** (or **Alerts**) in macOS notification settings to keep
notifications visible until dismissed. Re-run init after icon or helper updates.
