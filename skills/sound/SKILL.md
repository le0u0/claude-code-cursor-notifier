---
name: sound
description: List, preview, and choose the macOS notification sound for Claude Cursor Notifier, including silence.
---

Drive this entirely with the AskUserQuestion tool so the user picks with the arrow keys
and Enter. Never make them type a sound name.

1. Run both commands:
   - `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --show`
   - `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --list-sounds`
   The saved sound is `sound` from `--show`; empty means Silent. List the actual returned
   sounds, never a hardcoded list; it covers the user's own `~/Library/Sounds` as well as
   `/Library/Sounds` and `/System/Library/Sounds`.
2. Present the returned list as AskUserQuestion pages. The tool allows at most 4 options
   per question, so put 3 sounds plus a 4th option `More sounds` on each page, and drop
   `More sounds` on the final page. Start the first page on the saved sound and label it
   `(saved)`. Keep the returned order. `More sounds` shows the next page; keep paging as
   long as the user asks for it, and wrap to the first page after the last one.
3. When the user picks a sound, play it once with
   `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --preview "NAME"`. Silent makes no
   audio; say so instead of claiming a sound played. Then ask with AskUserQuestion:
   `Save NAME`, `Hear it again`, `Back to the list`. Preview never changes the saved value.
4. On `Save NAME`, run `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --sound "NAME"`
   (`Silent` for no sound) and verify with `--show`.
5. Tell the user the next popup uses the saved sound and that editor and duration are
   preserved. If `CLAUDE_CURSOR_NOTIFIER_SOUND` is set in the Claude process, that
   environment override wins (empty means mute) and cannot change until Claude restarts.
   Do not remove an override without the user's instruction.

A user at a real terminal can instead run
`node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --choose`, which arrows through the whole
list in one screen and plays each sound as it is highlighted. Offer this only if they ask
for preview-as-you-move; it needs a TTY and exits 1 under the Bash tool.

Use the exact listed name and proper shell quoting. Preview failure is not evidence that
the user heard audio; report it. Offer another preview rather than changing system volume
or output devices. Saved preferences need no restart. Finish with the user's next action.
