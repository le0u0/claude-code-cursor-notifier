"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { MARKER, mergeHooks, uninstallHooks } = require("../src/settings");

test("merges managed hooks without removing existing hooks", () => {
  const current = {
    hooks: {
      PermissionRequest: [
        { hooks: [{ type: "command", command: "existing-permission-command" }] },
        {
          hooks: [
            {
              type: "command",
              command: "old-command # claude-code-cursor-notifier"
            }
          ]
        }
      ],
      Stop: [{ hooks: [{ type: "command", command: "existing-stop-command" }] }]
    }
  };

  const next = mergeHooks(current, "/tmp/hook.js");
  assert.equal(next.hooks.Stop.length, 2);
  assert.equal(next.hooks.Stop[0].hooks[0].command, "existing-stop-command");
  assert.match(next.hooks.Stop[1].hooks[0].command, new RegExp(MARKER));
  assert.equal(next.hooks.PermissionRequest.length, 2);
  assert.equal(next.hooks.PermissionRequest[0].hooks[0].command, "existing-permission-command");
  assert.equal(next.hooks.PreToolUse[0].matcher, "AskUserQuestion");
  assert.equal(next.hooks.Notification.length, 1);
  assert.equal(next.hooks.Notification[0].matcher, "elicitation_dialog|elicitation_url_dialog");
  assert.match(
    next.hooks.Notification[0].hooks[0].command,
    new RegExp(MARKER)
  );
});

test("reinstall replaces only the managed hook", () => {
  const first = mergeHooks({}, "/tmp/old-hook.js");
  const second = mergeHooks(first, "/tmp/new-hook.js");

  assert.equal(second.hooks.Stop.length, 1);
  assert.match(second.hooks.Stop[0].hooks[0].command, /new-hook/);
  assert.equal(second.hooks.Notification.length, 1);
  assert.match(second.hooks.Notification[0].hooks[0].command, /new-hook/);
  assert.equal(second.hooks.PermissionRequest.length, 1);
  assert.equal(second.hooks.PreToolUse.length, 1);
});

test("uninstall removes managed hooks without removing existing hooks", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "settings-test-"));
  const settingsPath = path.join(directory, "settings.json");
  const current = mergeHooks(
    {
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: "keep-me" }] }]
      }
    },
    "/tmp/hook.js"
  );
  fs.writeFileSync(settingsPath, JSON.stringify(current));

  uninstallHooks(settingsPath);

  const next = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  assert.equal(next.hooks.Stop.length, 1);
  assert.equal(next.hooks.Stop[0].hooks[0].command, "keep-me");
  assert.equal(next.hooks.PermissionRequest, undefined);
  assert.equal(next.hooks.Notification, undefined);

  fs.rmSync(directory, { recursive: true });
});

test("migration preserves unrelated commands in a shared hook entry", () => {
  const { removeManaged } = require("../src/settings");
  assert.deepEqual(removeManaged([{ matcher: "Bash", hooks: [
    { type: "command", command: "old # claude-code-cursor-notifier" },
    { type: "command", command: "keep-me" }
  ] }]), [{ matcher: "Bash", hooks: [{ type: "command", command: "keep-me" }] }]);
});
