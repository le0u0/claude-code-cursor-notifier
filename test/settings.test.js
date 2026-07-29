"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { MARKER, mergeHooks } = require("../src/settings");

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

test("migrates the legacy osascript hooks without touching unrelated hooks", () => {
  const legacy = {
    hooks: {
      Notification: [
        {
          matcher: "permission_prompt",
          hooks: [
            {
              type: "command",
              command:
                "osascript -e 'display notification \"Claude Code: approval required\" with title \"Claude Code\"'"
            }
          ]
        }
      ],
      Stop: [
        {
          hooks: [
            {
              type: "command",
              command:
                "osascript -e 'display notification \"Claude Code: task complete\" with title \"Claude Code\"'"
            }
          ]
        },
        { hooks: [{ type: "command", command: "keep-me" }] }
      ]
    }
  };

  const next = mergeHooks(legacy, "/tmp/hook.js");
  assert.equal(next.hooks.Notification, undefined);
  assert.equal(next.hooks.Stop.length, 2);
  assert.equal(next.hooks.Stop[0].hooks[0].command, "keep-me");
});
