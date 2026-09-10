#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { notifierPath, notify } = require("./notifier");
const { removeManaged, uninstallHooks } = require("./settings");

const mode = process.argv[2] || "--check";
if (mode === "--check") {
  if (process.platform !== "darwin") {
    process.stderr.write("This plugin requires macOS.\n");
    process.exitCode = 1;
  } else {
    const result = spawnSync(notifierPath(), ["-diagnose"], { encoding: "utf8", timeout: 15000 });
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    if (result.error) {
      process.stderr.write(`${result.error.message}\nInstall terminal-notifier 3+ with: brew install terminal-notifier\n`);
    }
    process.exitCode = result.error ? 1 : result.status || 0;
  }
} else if (mode === "--test") {
  const cwd = process.cwd();
  process.exitCode = notify({
    id: "init-test", cwd,
    title: "Claude Cursor Notifier: setup test",
    subtitle: path.basename(cwd),
    body: "Click this notification to open this project in Cursor."
  }) ? 0 : 1;
} else if (mode === "--migrate") {
  const settingsPath = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "settings.json");
  if (!fs.existsSync(settingsPath)) {
    process.stdout.write("No standalone hooks to migrate.\n");
  } else {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    const events = ["PermissionRequest", "PreToolUse", "Notification", "Stop"];
    const changed = events.some((event) => Array.isArray(settings.hooks?.[event]) &&
      JSON.stringify(removeManaged(settings.hooks[event])) !== JSON.stringify(settings.hooks[event]));
    if (changed) {
      const backup = `${settingsPath}.notifier-backup-${Date.now()}`;
      fs.copyFileSync(settingsPath, backup, fs.constants.COPYFILE_EXCL);
      fs.chmodSync(backup, 0o600);
      uninstallHooks(settingsPath);
      process.stdout.write(`Removed standalone notifier hooks. Backup: ${backup}\nRestart Claude Code to apply the migration.\n`);
    } else {
      process.stdout.write("No standalone hooks to migrate.\n");
    }
  }
} else {
  process.stderr.write("Usage: init.js [--check|--test|--migrate]\n");
  process.exitCode = 1;
}
