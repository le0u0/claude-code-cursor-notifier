"use strict";

const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { editorName } = require("./editor");
const { shellQuote } = require("./settings");

function notifierPath() {
  return process.env.CLAUDE_CURSOR_NOTIFIER_PATH ||
    ["/opt/homebrew/bin/terminal-notifier", "/usr/local/bin/terminal-notifier"]
      .find((candidate) => fs.existsSync(candidate)) || "terminal-notifier";
}

function notify(signal) {
  let editor;
  try {
    editor = editorName();
  } catch (error) {
    process.stderr.write(`Claude Cursor Notifier: ${error.message}\n`);
    return false;
  }
  // NSUserDefaults interprets leading punctuation as property-list syntax.
  const escape = (value) => /^[\[({"']/.test(value) ? `\\${value}` : value;
  const args = [
    "-title", escape(signal.title),
    "-subtitle", escape(signal.subtitle),
    "-message", escape(signal.body),
    "-group", `claude-${signal.sessionId || signal.id}`,
    "-execute", `/usr/bin/open -a ${shellQuote(editor)} ${shellQuote(signal.cwd)}`
  ];
  const sound = process.env.CLAUDE_CURSOR_NOTIFIER_SOUND ?? "Glass";
  if (sound) args.push("-sound", sound);
  const result = spawnSync(notifierPath(), args, { encoding: "utf8", timeout: 10000 });
  if (result.error || result.status !== 0) {
    process.stderr.write(`Claude Cursor Notifier: ${result.error?.message || result.stderr || "notification failed"}\nRun /claude-cursor-notifier:init to check setup.\n`);
    return false;
  }
  return true;
}

module.exports = { notifierPath, notify };
