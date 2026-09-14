# Claude Cursor Notifier

A Claude Code plugin for macOS notifications while working in Cursor or VS Code's terminal.

- Alerts for approvals, interactive questions, MCP input, and finished responses.
- Shows Claude Code and the selected editor, the project name, and the action needed.
- Plays a sound; clicking opens the originating project in your selected editor.
- Includes `/claude-cursor-notifier:init` for setup and migration.
- Custom popup duration: 5 seconds by default; choose any positive whole number.
- List and preview installed macOS sounds, including your own `~/Library/Sounds`.

Requires macOS 13+, Node.js 18+, Cursor or VS Code, and Apple Command Line Tools
(`xcode-select --install`) to build the popup. Windows is unsupported.

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

The init skill builds the custom popup, lets you choose Cursor or VS Code, sends a
sound and click test, then backs up settings and removes this notifier's old
standalone hooks. No macOS notification permission or Persistent alert style is needed.
Custom popups do not appear in Notification Center and do not follow Focus settings.
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

Restart Claude Code, then run `/claude-cursor-notifier:init` to refresh the compiled
popup. The installer checks source and icon contents and skips unchanged builds.
Maintainers must publish changes and bump `.claude-plugin/plugin.json` before
marketplace users can receive a new version.

## Duration and sound

- `/claude-cursor-notifier:duration`: choose seconds (positive whole number; default **5**).
- `/claude-cursor-notifier:sound`: pick a sound (default **Glass**; **Silent** mutes).
  The list covers `~/Library/Sounds`, `/Library/Sounds`, and `/System/Library/Sounds`,
  in the order macOS resolves them, so a personal sound of the same name wins.

Run the picker yourself, keeping the leading `!`, because it needs a terminal:

```
!node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --choose
```

Up and Down move and play each sound, Enter saves, Esc cancels.

These preferences use the same `claude-cursor-notifier.json` as the editor choice,
respect `CLAUDE_CONFIG_DIR`, and survive plugin updates. The next popup uses the new
values without restarting. Clicking, closing, or a newer notification dismisses a
popup early; only the latest popup remains visible.

## Troubleshooting

Run `/claude-cursor-notifier:init` again. Hook delivery errors appear on stderr with
a setup hint; delivery failure never blocks approval or keeps a Stop hook running.
The default sound is `Glass`. Set `CLAUDE_CURSOR_NOTIFIER_SOUND` to another system
sound, or an empty string to mute. `CLAUDE_CURSOR_NOTIFIER_PATH` can point to a custom
popup helper executable accepting the native `--title`, `--body`, and related arguments.
Old terminal-notifier overrides must be removed when migrating. No runtime files are written inside the plugin cache.

## Uninstall

```text
/plugin uninstall claude-cursor-notifier@claude-cursor-notifier-marketplace
```

Restart Claude Code. This leaves terminal-notifier installed for other applications.
The custom helper and saved preferences remain on disk. The legacy standalone
installer remains for compatibility; use the init skill for plugin setup.

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
It builds the bundled Swift sources and installs a signed local app. Existing branded
terminal-notifier helpers are replaced only after the new build passes verification;
Homebrew's copy is left unchanged. Re-run init after updates. Homebrew terminal-notifier
is no longer a dependency, but other software may still use it.

## Alert text

Titles use `Claude Code · Cursor` or `Claude Code · VS Code`; subtitles show only
the project name. Actions are `Response finished`, `Approval required`,
`Waiting for your answer` (interactive questions), and
`Connected tool needs your input` (MCP prompts). A plain-text question at the end
of a response still triggers `Response finished`; Stop does not prove task completion.
