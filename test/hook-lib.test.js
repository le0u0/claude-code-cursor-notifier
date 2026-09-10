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
    title: "Claude needs your attention",
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

for (const notification_type of ["elicitation_dialog", "elicitation_url_dialog"]) {
  test(`alerts for ${notification_type}`, () => {
    const notification = notificationFromHook({
      hook_event_name: "Notification", notification_type, cwd: "/tmp/payments",
      message: "Which account should I use?"
    });
    assert.equal(notification.title, "Claude needs your attention");
    assert.equal(notification.body, "Which account should I use?");
  });
}

test("alerts before the interactive question picker", () => {
  const notification = notificationFromHook({
    hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", cwd: "/tmp/payments",
    tool_input: { questions: [{ question: "Which database?" }] }
  });
  assert.equal(notification.title, "Claude needs your attention");
  assert.equal(notification.body, "Which database?");
  assert.equal(notificationFromHook({ hook_event_name: "PreToolUse", tool_name: "Bash" }), null);
  assert.equal(notificationFromHook({ hook_event_name: "Notification", notification_type: "idle_prompt" }), null);
});
