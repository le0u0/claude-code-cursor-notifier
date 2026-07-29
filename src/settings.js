"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MARKER = "claude-code-cursor-notifier";

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function hookCommand(hookPath) {
  return `/usr/bin/env node ${shellQuote(hookPath)} # ${MARKER}`;
}

function managedHook(command) {
  return {
    hooks: [
      {
        type: "command",
        command
      }
    ]
  };
}

function removeManaged(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (entry) =>
      !entry ||
      !Array.isArray(entry.hooks) ||
      !entry.hooks.some((hook) => String(hook.command || "").includes(MARKER))
  );
}

function removeLegacyOsascript(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (entry) =>
      !entry ||
      !Array.isArray(entry.hooks) ||
      !entry.hooks.some((hook) =>
        /osascript.*display notification.*Claude Code: (approval required|task complete)/.test(
          String(hook.command || "")
        )
      )
  );
}

function mergeHooks(settings, hookPath) {
  const next = JSON.parse(JSON.stringify(settings || {}));
  next.hooks = next.hooks || {};
  const command = hookCommand(hookPath);

  next.hooks.Notification = removeLegacyOsascript(next.hooks.Notification);
  if (next.hooks.Notification.length === 0) delete next.hooks.Notification;

  next.hooks.PermissionRequest = [
    ...removeManaged(removeLegacyOsascript(next.hooks.PermissionRequest)),
    managedHook(command)
  ];
  next.hooks.Stop = [
    ...removeManaged(removeLegacyOsascript(next.hooks.Stop)),
    managedHook(command)
  ];
  return next;
}

function installHooks(hookPath, settingsPath = path.join(os.homedir(), ".claude", "settings.json")) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

  let current = {};
  if (fs.existsSync(settingsPath)) {
    current = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  }

  const next = mergeHooks(current, hookPath);
  const temporary = `${settingsPath}.claude-cursor-notification.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, settingsPath);
}

module.exports = {
  hookCommand,
  installHooks,
  MARKER,
  mergeHooks,
  removeLegacyOsascript,
  removeManaged,
  shellQuote
};
