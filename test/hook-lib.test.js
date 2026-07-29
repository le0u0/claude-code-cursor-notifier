"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  describeTool,
  notificationFromHook,
  taskFromTranscript
} = require("../src/hook-lib");

test("describes permission tool and command", () => {
  assert.equal(
    describeTool("Bash", { command: "npm test", description: "Run tests" }),
    "Bash: npm test"
  );
});

test("builds contextual completion notification", () => {
  const notification = notificationFromHook({
    hook_event_name: "Stop",
    cwd: "/tmp/payments",
    last_assistant_message: "Implemented retry handling.\nAll tests pass."
  });

  assert.deepEqual(notification, {
    kind: "complete",
    title: "Claude Code: task complete",
    subtitle: "payments",
    body: "Implemented retry handling. All tests pass."
  });
});

test("builds exact permission notification", () => {
  const notification = notificationFromHook({
    hook_event_name: "PermissionRequest",
    cwd: "/tmp/payments",
    tool_name: "Bash",
    tool_input: { command: "git push origin feature/retries" }
  });

  assert.deepEqual(notification, {
    kind: "approval",
    title: "Claude Code: approval required",
    subtitle: "payments",
    body: "Bash: git push origin feature/retries"
  });
});

test("reads first user task from transcript", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "claude-hook-test-"));
  const transcript = path.join(directory, "session.jsonl");
  fs.writeFileSync(
    transcript,
    [
      JSON.stringify({ type: "system", message: { role: "system", content: "rules" } }),
      JSON.stringify({
        type: "user",
        message: { role: "user", content: [{ type: "text", text: "Fix payment retries" }] }
      })
    ].join("\n")
  );

  assert.equal(taskFromTranscript(transcript), "Fix payment retries");
  fs.rmSync(directory, { recursive: true });
});
