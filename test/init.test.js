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
