"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const hookPath = path.join(__dirname, "..", "src", "hook.js");

async function waitForFile(filePath) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (fs.existsSync(filePath)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("Timed out waiting for notifier");
}

test("launches the native notifier for a supported hook event", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "claude-hook-test-"));
  const notifier = path.join(directory, "notifier");
  const log = path.join(directory, "notifier.log");
  fs.writeFileSync(
    notifier,
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$NOTIFIER_LOG"\n',
    { mode: 0o755 }
  );
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
      CLAUDE_CURSOR_NOTIFIER_PATH: notifier,
      NOTIFIER_LOG: log
    }
  });

  assert.equal(result.status, 0);
  await waitForFile(log);
  assert.deepEqual(fs.readFileSync(log, "utf8").trim().split("\n"), [
    "--title",
    "Claude Code: task complete",
    "--subtitle",
    "payments",
    "--body",
    "Finished the task.",
    "--identifier",
    "claude-session-123",
    "--project-path",
    "/tmp/payments",
    "--sound",
    "Blow"
  ]);

  fs.rmSync(directory, { recursive: true });
});

test("does nothing for an unsupported hook event", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "claude-hook-test-"));
  const log = path.join(directory, "notifier.log");

  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify({ hook_event_name: "SessionStart" }),
    encoding: "utf8",
    env: {
      ...process.env,
      CLAUDE_CURSOR_NOTIFIER_PATH: path.join(directory, "notifier"),
      NOTIFIER_LOG: log
    }
  });

  assert.equal(result.status, 0);
  assert.equal(fs.existsSync(log), false);
  fs.rmSync(directory, { recursive: true });
});

test("fails for invalid JSON input", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "claude-hook-test-"));
  const result = spawnSync(process.execPath, [hookPath], {
    input: "not json",
    encoding: "utf8",
    env: {
      ...process.env,
      CLAUDE_CURSOR_NOTIFIER_PATH: path.join(directory, "notifier")
    }
  });

  assert.equal(result.status, 1);
  fs.rmSync(directory, { recursive: true });
});
