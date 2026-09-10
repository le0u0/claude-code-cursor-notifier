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

function managedHook(command, matcher) {
  const hook = {
    hooks: [
      {
        type: "command",
        command
      }
    ]
  };
  if (matcher) hook.matcher = matcher;
  return hook;
}

function removeManaged(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    if (!entry || !Array.isArray(entry.hooks)) return [entry];
    const hooks = entry.hooks.filter(
      (hook) => !String(hook.command || "").includes(MARKER)
    );
    return hooks.length ? [{ ...entry, hooks }] : [];
  });
}

function mergeHooks(settings, hookPath) {
  const next = JSON.parse(JSON.stringify(settings || {}));
  next.hooks = next.hooks || {};
  const command = hookCommand(hookPath);

  next.hooks.PermissionRequest = [
    ...removeManaged(next.hooks.PermissionRequest),
    managedHook(command)
  ];
  next.hooks.PreToolUse = [
    ...removeManaged(next.hooks.PreToolUse),
    managedHook(command, "AskUserQuestion")
  ];
  next.hooks.Notification = [
    ...removeManaged(next.hooks.Notification),
    managedHook(command, "elicitation_dialog|elicitation_url_dialog")
  ];
  next.hooks.Stop = [
    ...removeManaged(next.hooks.Stop),
    managedHook(command)
  ];
  return next;
}

function writeSettings(settingsPath, settings) {
  const temporary = `${settingsPath}.claude-cursor-notifier.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, settingsPath);
}

function installHooks(hookPath, settingsPath = path.join(os.homedir(), ".claude", "settings.json")) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

  let current = {};
  if (fs.existsSync(settingsPath)) {
    current = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  }

  const next = mergeHooks(current, hookPath);
  writeSettings(settingsPath, next);
}

function uninstallHooks(settingsPath = path.join(os.homedir(), ".claude", "settings.json")) {
  if (!fs.existsSync(settingsPath)) return;

  const next = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  if (!next.hooks) return;

  for (const event of ["PermissionRequest", "PreToolUse", "Notification", "Stop"]) {
    const entries = removeManaged(next.hooks[event]);
    if (entries.length) {
      next.hooks[event] = entries;
    } else {
      delete next.hooks[event];
    }
  }
  if (Object.keys(next.hooks).length === 0) delete next.hooks;
  writeSettings(settingsPath, next);
}

module.exports = {
  hookCommand,
  installHooks,
  MARKER,
  mergeHooks,
  removeManaged,
  shellQuote,
  uninstallHooks
};
