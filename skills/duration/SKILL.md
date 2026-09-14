---
name: duration
description: Choose how many seconds Claude Cursor Notifier popups stay visible on macOS; default is 5 seconds.
---

Configure this plugin's custom popup, not macOS Notification Center banners.

1. Run `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --show` and show the current
   duration. The default is 5 seconds.
2. If the user supplied a positive whole number of seconds, use it. Otherwise ask with
   the AskUserQuestion tool so they pick with the arrow keys: `5 seconds (default)`,
   `10 seconds`, `15 seconds`. Its free-text choice accepts any other positive whole
   number. A request to reset means 5. Do not silently choose for them.
3. Save with `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --duration SECONDS`.
   Run `--show` again to verify the saved value. This preserves the editor and sound
   preferences in the user's Claude configuration, outside the plugin cache.
4. Run `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --check`. If the custom popup helper
   is missing, use this plugin's init skill before testing; old terminal-notifier
   helpers cannot honor this setting. Run `node "${CLAUDE_PLUGIN_ROOT}/src/init.js" --test`
   once. Ask the user to confirm it stays visible for the selected duration.

The next popup uses the new setting; no restart is required for a preference change.
Clicking, closing, or a newer notification can dismiss a popup early. Custom popups
have no Notification Center history and do not follow macOS Focus settings.
Do not change macOS alert style or use the obsolete bannerTime setting.
Distinguish a saved preference from a visually confirmed duration.
Finish with the user's next action.
