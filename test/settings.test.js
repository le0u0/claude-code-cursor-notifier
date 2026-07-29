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
      Stop: [{ hooks: [{ type: "command", command: "existing-command" }] }]
    }
  };

  const next = mergeHooks(current, "/tmp/hook.js");
  assert.equal(next.hooks.Stop.length, 2);
  assert.equal(next.hooks.Stop[0].hooks[0].command, "existing-command");
  assert.match(next.hooks.Stop[1].hooks[0].command, new RegExp(MARKER));
  assert.equal(next.hooks.PermissionRequest.length, 1);
});

test("reinstall replaces only the managed hook", () => {
  const first = mergeHooks({}, "/tmp/old-hook.js");
  const second = mergeHooks(first, "/tmp/new-hook.js");

  assert.equal(second.hooks.Stop.length, 1);
  assert.match(second.hooks.Stop[0].hooks[0].command, /new-hook/);
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

  fs.rmSync(directory, { recursive: true });
});
