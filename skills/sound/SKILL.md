---
name: sound
description: List, preview, and choose the macOS notification sound for Claude Cursor Notifier, including silence.
---

1. Run both commands:
   - `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --show`
   - `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --list-sounds`
   Show the current sound and the complete returned list as numbered choices.
   Empty sound means Silent; Glass is the default. List actual installed sounds,
   not a hardcoded list; the list covers the user's own `~/Library/Sounds` as well as
   `/Library/Sounds` and `/System/Library/Sounds`. Tell the user they can preview names or numbers before saving.
2. If the user has not chosen, ask which sounds they want to hear. Map numbers back
   to the displayed names. Preview requested sounds one at a time with
   `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --preview "NAME"`, identifying
   each sound before playback. Wait for playback to finish before the next preview.
   Silent produces no audio. Previewing does not change the saved preference.
3. Ask which sound to save after previews. If they explicitly requested a particular
   sound already, save it without asking again:
   `node "${CLAUDE_PLUGIN_ROOT}/src/preferences.js" --sound "NAME"`.
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
