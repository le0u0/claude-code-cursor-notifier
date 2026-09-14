"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { editorName } = require("./editor");
const { preferences, durationSeconds, soundName } = require("./preferences");

function notifierPath() {
  return process.env.CLAUDE_CURSOR_NOTIFIER_PATH ||
    path.join(os.homedir(), "Library/Application Support/ClaudeCursorNotifierIcon/Claude Code Notifier.app/Contents/MacOS/ClaudeCursorNotifier");
}

function notify(signal) {
  let args;
  try {
    const editor = editorName();
    const config = preferences();
    args = [
      "--title", signal.title === "Claude Code"
        ? `Claude Code · ${editor === "Visual Studio Code" ? "VS Code" : "Cursor"}` : signal.title,
      "--subtitle", signal.subtitle,
      "--body", signal.body,
      "--identifier", `claude-${signal.sessionId || signal.id}`,
      "--project-path", signal.cwd,
      "--editor", editor,
      "--duration", String(durationSeconds(config.duration)),
      "--sound", soundName(process.env.CLAUDE_CURSOR_NOTIFIER_SOUND ?? config.sound)
    ];
    if (!fs.existsSync(notifierPath())) throw new Error("Popup helper missing. Run /claude-cursor-notifier:init.");
  } catch (error) {
    process.stderr.write(`Claude Cursor Notifier: ${error.message}\n`);
    return false;
  }
  // LaunchServices returns immediately; the popup owns its timer, not the hook.
  const result = process.env.CLAUDE_CURSOR_NOTIFIER_PATH
    ? spawnSync(notifierPath(), args, { encoding: "utf8", timeout: 10000 })
    : spawnSync("/usr/bin/open", ["-g", "-n", "-a", path.resolve(notifierPath(), "../../.."), "--args", ...args],
      { encoding: "utf8", timeout: 10000 });
  if (result.error || result.status !== 0) {
    process.stderr.write(`Claude Cursor Notifier: ${result.error?.message || result.stderr || "notification failed"}\nRun /claude-cursor-notifier:init to check setup.\n`);
    return false;
  }
  return true;
}

module.exports = { notifierPath, notify };
