"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const hookPath = path.join(__dirname, "..", "src", "hook.js");

test("writes a signal file for a supported hook event", () => {
  const channel = fs.mkdtempSync(path.join(os.tmpdir(), "claude-hook-channel-"));
  const payload = {
    hook_event_name: "Stop",
    session_id: "session-123",
    cwd: "/tmp/payments",
    last_assistant_message: "Finished the task."
  };

  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: {
      ...process.env,
      CLAUDE_CURSOR_NOTIFICATION_CHANNEL: channel
    }
  });

  assert.equal(result.status, 0);
  const files = fs.readdirSync(channel);
  assert.equal(files.length, 1);
  assert.match(files[0], /^signal-.+\.json$/);

  const signal = JSON.parse(fs.readFileSync(path.join(channel, files[0]), "utf8"));
  assert.equal(signal.sessionId, "session-123");
  assert.equal(signal.title, "Claude Code: task complete");
  assert.equal(signal.body, "Finished the task.");

  fs.rmSync(channel, { recursive: true });
});

test("does nothing without a notification channel", () => {
  const env = { ...process.env };
  delete env.CLAUDE_CURSOR_NOTIFICATION_CHANNEL;

  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify({ hook_event_name: "Stop" }),
    encoding: "utf8",
    env
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("fails for invalid JSON input", () => {
  const channel = fs.mkdtempSync(path.join(os.tmpdir(), "claude-hook-channel-"));
  const result = spawnSync(process.execPath, [hookPath], {
    input: "not json",
    encoding: "utf8",
    env: {
      ...process.env,
      CLAUDE_CURSOR_NOTIFICATION_CHANNEL: channel
    }
  });

  assert.equal(result.status, 1);
  assert.deepEqual(fs.readdirSync(channel), []);

  fs.rmSync(channel, { recursive: true });
});
