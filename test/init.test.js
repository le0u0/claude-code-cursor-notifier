"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const init = path.join(__dirname, "../src/init.js");

test("migration backs up settings, preserves shared hooks, and is repeatable", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "notifier-migrate-"));
  try {
    const original = { theme: "dark", hooks: { Stop: [{ hooks: [
      { type: "command", command: "node old.js # claude-code-cursor-notifier" },
      { type: "command", command: "keep-me" }
    ] }] } };
    const settings = path.join(directory, "settings.json");
    fs.writeFileSync(settings, JSON.stringify(original));
    const run = () => spawnSync(process.execPath, [init, "--migrate"], {
      encoding: "utf8", env: { ...process.env, CLAUDE_CONFIG_DIR: directory }
    });
    assert.equal(run().status, 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(settings)), {
      theme: "dark", hooks: { Stop: [{ hooks: [{ type: "command", command: "keep-me" }] }] }
    });
    const backup = fs.readdirSync(directory).find((file) => file.includes("backup"));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, backup))), original);
    assert.equal(run().status, 0);
    assert.equal(fs.readdirSync(directory).length, 2);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});

test("failed dependency check does not migrate existing settings", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "notifier-check-"));
  try {
    const settings = path.join(directory, "settings.json");
    fs.writeFileSync(settings, '{"hooks":{}}');
    const result = spawnSync(process.execPath, [init, "--check"], {
      encoding: "utf8", env: { ...process.env, CLAUDE_CONFIG_DIR: directory,
        CLAUDE_CURSOR_NOTIFIER_PATH: path.join(directory, "missing") }
    });
    assert.notEqual(result.status, 0);
    assert.equal(fs.readFileSync(settings, "utf8"), '{"hooks":{}}');
    assert.equal(fs.readdirSync(directory).length, 1);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});

test("editor choice persists and controls notification click command", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "notifier-editor-"));
  try {
    const notifier = path.join(directory, "notifier");
    const log = path.join(directory, "args");
    fs.writeFileSync(notifier, '#!/bin/sh\nprintf "%s\\n" "$@" > "$NOTIFIER_LOG"\n', { mode: 0o755 });
    const env = { ...process.env, CLAUDE_CONFIG_DIR: directory,
      CLAUDE_CURSOR_NOTIFIER_PATH: notifier, NOTIFIER_LOG: log };
    const run = (...args) => spawnSync(process.execPath, [init, ...args], { env, encoding: "utf8", cwd: directory });
    for (const [choice, app] of [["vscode", "Visual Studio Code"], ["cursor", "Cursor"]]) {
      assert.equal(run("--editor", choice).status, 0);
      assert.equal(run("--test").status, 0);
      assert.ok(fs.readFileSync(log, "utf8").includes(`/usr/bin/open -a '${app}' '${fs.realpathSync(directory)}'`));
    }
    const before = fs.readFileSync(path.join(directory, "claude-cursor-notifier.json"), "utf8");
    assert.equal(run("--editor", "unknown").status, 1);
    assert.equal(fs.readFileSync(path.join(directory, "claude-cursor-notifier.json"), "utf8"), before);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
