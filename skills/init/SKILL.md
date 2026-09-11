---
name: init
description: Set up or diagnose Claude Cursor Notifier dependencies, macOS notification permission, click-to-open Cursor or VS Code, and migration from its standalone hooks.
---

Initialize this plugin in the user's current project. Use the plugin scripts below;
keep the working directory at that project so the test opens the correct folder.

1. Check macOS and Node.js 18+. If Node is missing, guide the user through installing
   Node before running scripts. Check `terminal-notifier` (Homebrew paths include
   `/opt/homebrew/bin` and `/usr/local/bin`). If missing, offer
   `brew install terminal-notifier`; install after the user agrees. Version 3+ is
   required for `-diagnose`; offer `brew upgrade terminal-notifier` for older versions.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --icon` to install or refresh the
   dedicated helper with the black bell-and-terminal icon. This preserves Homebrew's
   original app. The dedicated app is named **Claude Code Notifier** and requires
   separate macOS permission. Re-run after icon or terminal-notifier updates.
   Run `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --check`. Read the authorization,
   banner, sound, and notification-centre status. If permission is denied, ask the
   user to enable Claude Code Notifier in System Settings > Notifications. If not yet
   determined, run the test below to request permission. Let the user answer the
   macOS prompt, then rerun the check. Do not reset permissions, change notification
   preferences, or infer that exit code zero proves a visible banner.
3. Ask which editor notification clicks should open: Cursor or VS Code. Explain
   that this is a global preference for this Claude configuration, not automatic
   detection of the current terminal. Save their choice with
   `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --editor cursor` or
   `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --editor vscode`. Confirm the selected
   application is installed. The preference persists outside the plugin cache.
   Run `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --test`. Ask the user to confirm
   the banner, sound, and whether the black bell-and-terminal icon appears and clicking it opened this project in the selected editor.
   If any part fails, investigate that result before migrating. Respect an
   intentionally muted sound setting; do not call audible delivery verified.
4. Once the test succeeds and this plugin is enabled, run
   `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --migrate`. This backs up user settings
   and removes only this notifier's marked standalone hooks, preserving unrelated
   commands even inside shared hook entries. It honors `CLAUDE_CONFIG_DIR`.
   Do not delete old application files or run the legacy installer. Inspect any
   project-level hook overrides if duplicates remain; do not remove unmarked hooks.
5. Tell the user to restart Claude Code. Verify `/hooks` includes this plugin's
   PermissionRequest, AskUserQuestion PreToolUse, MCP Notification, and Stop hooks.
   Ask them to trigger a real question and a completed response. Distinguish the
   setup notification test from verified live Claude events.

Initialization is repeatable. Updates do not need reinstalling the external helper
or repeating migration unless checks show a problem. Always finish with the user's
next action. Do not claim setup is complete while permission or click confirmation
is pending.

For longer visibility, guide the user to select Persistent (or Alerts) for
Claude Code Notifier in System Settings > Notifications. Do not change it automatically.
