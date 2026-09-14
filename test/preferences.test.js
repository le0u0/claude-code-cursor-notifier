"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

test("duration and sound persist, preserve editor and reject invalid choices", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "notifier-preferences-"));
  try {
    const run = (...args) => spawnSync(process.execPath, [path.join(__dirname, "../src/preferences.js"), ...args], {
      encoding: "utf8", env: { ...process.env, CLAUDE_CONFIG_DIR: directory }
    });
    const initial = run("--show");
    assert.equal(initial.status, 0, initial.stderr);
    assert.deepEqual(JSON.parse(initial.stdout), { editor: "cursor", duration: 5, sound: "Glass" });
    assert.equal(run("--duration", "10").status, 0);
    assert.equal(run("--sound", "Silent").status, 0);
    const editor = spawnSync(process.execPath, [path.join(__dirname, "../src/init.js"), "--editor", "vscode"], {
      encoding: "utf8", env: { ...process.env, CLAUDE_CONFIG_DIR: directory }
    });
    assert.equal(editor.status, 0, editor.stderr);
    assert.deepEqual(JSON.parse(run("--show").stdout), { editor: "vscode", duration: 10, sound: "" });
    for (const value of ["0", "-1", "NaN", "Infinity", "", "1.5"]) {
      assert.equal(run("--duration", value).status, 1, value);
    }
    assert.equal(run("--sound", "../../bad").status, 1);
    assert.deepEqual(JSON.parse(run("--show").stdout), { editor: "vscode", duration: 10, sound: "" });
    const sounds = run("--list-sounds");
    assert.equal(sounds.status, 0, sounds.stderr);
    assert.ok(JSON.parse(sounds.stdout).includes("Glass"));
    assert.ok(JSON.parse(sounds.stdout).includes("Silent"));
    assert.equal(run("--preview", "Silent").status, 0);
    assert.equal(run("--preview", "../../bad").status, 1);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});

test("lists sounds installed in the user's own sounds folder", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "notifier-home-"));
  try {
    fs.mkdirSync(path.join(home, "Library/Sounds"), { recursive: true });
    fs.writeFileSync(path.join(home, "Library/Sounds/CustomBell.wav"), "");
    fs.writeFileSync(path.join(home, "Library/Sounds/notes.txt"), "");
    const run = (...args) => spawnSync(process.execPath, [path.join(__dirname, "../src/preferences.js"), ...args], {
      encoding: "utf8", env: { ...process.env, HOME: home, CLAUDE_CONFIG_DIR: home }
    });
    const sounds = JSON.parse(run("--list-sounds").stdout);
    assert.ok(sounds.includes("CustomBell"));
    assert.ok(!sounds.includes("notes"));
    assert.equal(run("--sound", "CustomBell").status, 0);
    assert.equal(JSON.parse(run("--show").stdout).sound, "CustomBell");
  } finally {
    fs.rmSync(home, { recursive: true });
  }
});
