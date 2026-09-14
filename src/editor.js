"use strict";

const { preferences, savePreference } = require("./preferences");

const editors = { cursor: "Cursor", vscode: "Visual Studio Code" };

function editorName() {
  const editor = preferences().editor;
  if (!Object.hasOwn(editors, editor)) throw new Error("Invalid editor setting. Run /claude-cursor-notifier:init.");
  return editors[editor];
}

function saveEditor(editor) {
  if (!Object.hasOwn(editors, editor)) throw new Error("Choose cursor or vscode.");
  savePreference("editor", editor);
  return editors[editor];
}

module.exports = { editorName, saveEditor };
