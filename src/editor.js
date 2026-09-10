"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const editors = { cursor: "Cursor", vscode: "Visual Studio Code" };

function configPath() {
  return path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "claude-cursor-notifier.json");
}

function editorName() {
  const file = configPath();
  const editor = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).editor : "cursor";
  if (!Object.hasOwn(editors, editor)) throw new Error("Invalid editor setting. Run /claude-cursor-notifier:init.");
  return editors[editor];
}

function saveEditor(editor) {
  if (!Object.hasOwn(editors, editor)) throw new Error("Choose cursor or vscode.");
  const file = configPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ editor }, null, 2)}\n`, { mode: 0o600 });
  return editors[editor];
}

module.exports = { editorName, saveEditor };
