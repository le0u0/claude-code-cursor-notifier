"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

test("refreshes the custom helper without Homebrew and skips unchanged icons", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "notifier-icon-"));
  try {
    const bin = path.join(directory, "bin");
    const app = path.join(directory, "Library/Application Support/ClaudeCursorNotifierIcon/Claude Code Notifier.app");
    fs.mkdirSync(bin);
    fs.mkdirSync(path.join(app, "Contents/MacOS"), { recursive: true });
    fs.mkdirSync(path.join(app, "Contents/Resources"));
    fs.writeFileSync(path.join(app, "Contents/MacOS/terminal-notifier"), "existing executable", { mode: 0o755 });
    fs.writeFileSync(path.join(app, "Contents/Resources/terminal-notifier-LICENSE.md"), "original license");
    fs.writeFileSync(path.join(bin, "brew"), '#!/bin/sh\necho "Homebrew must not be required" >&2\nexit 99\n', { mode: 0o755 });
    for (const command of ["sips", "iconutil", "plutil", "codesign"]) {
      fs.writeFileSync(path.join(bin, command), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    }
    const run = () => spawnSync("/bin/sh", [path.join(__dirname, "../scripts/install-icon.sh")], {
      encoding: "utf8", env: { ...process.env, HOME: directory, PATH: `${bin}:/usr/bin:/bin` }
    });
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.equal(fs.readFileSync(path.join(app, "Contents/MacOS/terminal-notifier"), "utf8"), "existing executable");
    assert.equal(fs.readFileSync(path.join(app, "Contents/Resources/terminal-notifier-LICENSE.md"), "utf8"), "original license");
    const second = run();
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /already up to date/);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
