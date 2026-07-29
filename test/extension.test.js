"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

async function waitFor(condition) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("Timed out waiting for extension event");
}

test("activates routing, handles signals, and focuses the matching terminal", async () => {
  const commands = new Map();
  const errors = [];
  const executions = [];
  const replacements = [];
  let terminalShowCount = 0;
  let watchCallback;
  const storage = fs.mkdtempSync(path.join(os.tmpdir(), "claude-extension-test-"));
  const vscode = {
    commands: {
      registerCommand(name, callback) {
        commands.set(name, callback);
        return { dispose() {} };
      }
    },
    window: {
      activeTerminal: undefined,
      showErrorMessage(message) {
        errors.push(message);
      },
      terminals: [
        {
          processId: Promise.resolve(321),
          show() {
            terminalShowCount += 1;
          }
        }
      ]
    },
    workspace: {
      getConfiguration() {
        return { get: (_name, fallback) => fallback };
      },
      name: "payments",
      workspaceFolders: []
    }
  };
  const context = {
    asAbsolutePath(relativePath) {
      return path.join(__dirname, "..", relativePath);
    },
    environmentVariableCollection: {
      replace(name, value) {
        replacements.push([name, value]);
      }
    },
    globalStorageUri: { fsPath: storage },
    subscriptions: []
  };

  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === "vscode") return vscode;
    if (request === "node:child_process") {
      return {
        ...childProcess,
        execFile(file, args) {
          executions.push([file, args]);
        }
      };
    }
    if (request === "node:fs") {
      return {
        ...fs,
        watch(_channel, callback) {
          watchCallback = callback;
          return { close() {} };
        }
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const extensionPath = require.resolve("../src/extension");
  delete require.cache[extensionPath];
  const extension = require(extensionPath);
  Module._load = originalLoad;

  try {
    extension.activate(context);

    assert.equal(replacements.length, 1);
    assert.equal(replacements[0][0], "CLAUDE_CURSOR_NOTIFICATION_CHANNEL");
    assert.equal(fs.existsSync(replacements[0][1]), true);
    assert.deepEqual([...commands.keys()].sort(), [
      "claudeCursorNotification.setup",
      "claudeCursorNotification.test"
    ]);
    assert.equal(context.subscriptions.length, 3);

    await commands.get("claudeCursorNotification.test")();
    assert.deepEqual(errors, [
      "Run “Claude Notification: Install Hooks” first."
    ]);

    const channel = replacements[0][1];
    const signalPath = path.join(channel, "signal-event-1.json");
    fs.writeFileSync(
      signalPath,
      JSON.stringify({
        id: "event-1",
        sessionId: "session-1",
        title: "Claude Code: task complete",
        subtitle: "payments",
        body: "Finished.",
        pids: [321],
        cwd: "/tmp/payments"
      })
    );
    watchCallback("rename", path.basename(signalPath));

    await waitFor(() => executions.length === 1 && !fs.existsSync(signalPath));
    assert.equal(executions[0][0], "/usr/bin/osascript");
    assert.match(executions[0][1][1], /Finished\./);

    const clickPath = path.join(channel, "click-event-1");
    fs.writeFileSync(clickPath, "");
    watchCallback("rename", path.basename(clickPath));
    await waitFor(() => terminalShowCount === 1 && executions.length === 2);
    assert.equal(fs.existsSync(clickPath), false);
    assert.equal(executions[1][0], "/usr/bin/osascript");
    assert.match(executions[1][1][1], /tell application "Cursor" to activate/);
  } finally {
    extension.deactivate();
    fs.rmSync(replacements[0]?.[1], { recursive: true, force: true });
    fs.rmSync(storage, { recursive: true, force: true });
    delete require.cache[extensionPath];
  }
});
