---
name: init
description: Set up or diagnose Claude Cursor Notifier's custom macOS popup, editor clicks, and migration from standalone hooks.
---

Keep the working directory at the user's project so the test opens that folder.

1. Check macOS 13+, Node.js 18+, and Apple Command Line Tools (`xcrun --find swiftc`).
   If tools are missing, guide the user through `xcode-select --install` and wait
   for installation. Windows is unsupported. Homebrew and terminal-notifier are
   no longer required.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --icon` to build or refresh
   `~/Library/Application Support/ClaudeCursorNotifierIcon/Claude Code Notifier.app`.
   This replaces this plugin's old branded terminal-notifier helper with its custom
   popup, retaining the black icon. It leaves Homebrew's app alone. Source and icon
   changes trigger rebuilding; unchanged builds are reused. Then run
   `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --check`.
   Report build/check failures; do not infer visible delivery from exit code zero.
3. Ask which editor notification clicks should open: Cursor or VS Code, unless the
   user has already chosen. Save using
   `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --editor cursor` or `--editor vscode`.
   Confirm the selected app is installed. This global Claude preference survives
   plugin updates and preserves sound/duration preferences.
4. Run `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --show` and explain the current
   preferences (defaults: 5 seconds, Glass). The custom popup needs no macOS
   notification permission or Persistent alert style. It has no Notification Center
   history and does not follow Focus settings. A newer popup replaces the previous
   popup. Offer `/claude-cursor-notifier:duration` and `/claude-cursor-notifier:sound`
   to change duration or list/preview sounds.
5. Run `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --test` once. Ask the user to confirm
   the popup, black icon, expected duration/sound, and that clicking opens this project
   in their selected editor. Respect intentional silence. Investigate failures before
   marking setup verified.
6. Once the test succeeds and the plugin is enabled, run
   `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --migrate`. This backs up settings and
   removes only this notifier's marked standalone hooks, respecting `CLAUDE_CONFIG_DIR`.
   Preserve unrelated hooks; do not run the legacy installer or uninstall Homebrew
   packages. Restart Claude Code after plugin installation/update and verify `/hooks`
   includes PermissionRequest, AskUserQuestion PreToolUse, MCP Notification, and Stop.
   Ask the user to trigger a real question and completed response. Distinguish a setup
   popup from verified live hook events.

Re-run init after plugin updates to refresh the compiled helper. Preference-only changes
need no restart. Finish with the user's next action and identify any unverified UI behavior.
