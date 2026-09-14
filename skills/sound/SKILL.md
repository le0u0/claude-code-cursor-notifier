---
name: sound
description: List, preview, and choose the macOS notification sound for Claude Cursor Notifier, including silence.
---

1. Run `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --show` and report the saved sound.
   Empty sound means Silent; Glass is the default.
2. Offer the interactive picker first. Ask the user to run this themselves in the Claude
   Code prompt, including the leading `!`, because the picker needs a terminal and the
   Bash tool has none:

   ```
   !node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --choose
   ```

   Explain the controls: Up and Down move and play each sound, Enter saves, Esc cancels.
   The list starts on the saved sound and marks it `(saved)`. Wait for their result.
   Do not run `--choose` through the Bash tool; without a terminal it exits 1.
3. If they decline the picker or it cannot run, fall back to the non-interactive flags:
   - `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --list-sounds` shows every installed
     sound. List actual installed sounds, not a hardcoded list; the list covers the user's
     own `~/Library/Sounds` as well as `/Library/Sounds` and `/System/Library/Sounds`.
     Show them as numbered choices and map numbers back to names.
   - `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --preview "NAME"` plays one sound.
     Name each sound before playback and wait for playback to finish. Silent makes no audio.
     Previewing does not change the saved preference.
   - `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --sound "NAME"` saves the choice.
     Use `Silent` for no sound. Verify with `--show`.
4. Explain that the next popup uses the saved sound and that editor/duration settings
   are preserved. If `CLAUDE_CURSOR_NOTIFIER_SOUND` is set in the Claude process,
   explain that this environment override takes priority (empty means mute).
   Do not remove an override without the user's instruction.

Use the exact listed name and proper shell quoting. Preview failure is not evidence
that the user heard audio; report it. Offer another preview if needed rather than
changing system volume or output devices. No restart is needed for saved preferences;
changing an inherited environment override requires restarting the Claude process.
Finish with the user's next action.
