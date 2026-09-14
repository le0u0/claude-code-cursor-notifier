---
name: sound
description: List, preview, and choose the macOS notification sound for Claude Cursor Notifier, including silence.
---

Open the picker for the user. Do not ask them to paste a command, and do not rebuild the
choice out of AskUserQuestion pages; that tool caps at 4 options and takes many turns.

1. Run `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --show` and report the saved sound.
   Empty sound means Silent; Glass is the fallback.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --pick`. It opens a Terminal window
   holding the whole list on one screen. Tell the user the controls: Up and Down move the
   highlight and play that sound, Enter saves, Esc cancels. The list opens on the saved
   sound and marks it `(saved)`. It covers the user's own `~/Library/Sounds` as well as
   `/Library/Sounds` and `/System/Library/Sounds`.
3. Wait for the user to say they are done, then run `--show` again and report the saved
   sound. A cancelled picker leaves the previous sound in place; say so rather than
   claiming a change.
4. If `--pick` fails, report the error and fall back to flags: `--list-sounds` for the
   names, `--preview "NAME"` to play one, `--sound "NAME"` to save (`Silent` mutes).
   Never run `--choose` through the Bash tool; with no terminal it exits 1.
5. Tell the user the next popup uses the saved sound and that editor and duration are
   preserved. If `CLAUDE_CURSOR_NOTIFIER_SOUND` is set in the Claude process, that
   environment override wins (empty means mute) and cannot change until Claude restarts.
   Do not remove an override without the user's instruction.

Use the exact listed name and proper shell quoting. Preview failure is not evidence that
the user heard audio; report it. Offer another preview rather than changing system volume
or output devices. Saved preferences need no restart. Finish with the user's next action.
