"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

test("builds the popup without Homebrew, skips unchanged builds and preserves helper on failure", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "notifier-icon-"));
  try {
    const bin = path.join(directory, "bin");
    const app = path.join(directory, "Library/Application Support/ClaudeCursorNotifierIcon/Claude Code Notifier.app");
    fs.mkdirSync(bin);
    fs.mkdirSync(path.join(app, "Contents/MacOS"), { recursive: true });
    fs.writeFileSync(path.join(app, "Contents/MacOS/terminal-notifier"), "old helper");
    fs.writeFileSync(path.join(bin, "xcrun"), '#!/bin/sh\n[ "$1" = "--find" ] && exit 0\n[ "$FAIL_BUILD" = "1" ] && exit 1\nwhile [ "$1" != "-o" ]; do shift; done\nshift\nprintf "#!/bin/sh\\nexit 0\\n" > "$1"\nchmod +x "$1"\n', { mode: 0o755 });
    for (const command of ["sips", "iconutil", "codesign"]) {
      fs.writeFileSync(path.join(bin, command), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    }
    const run = (fail = "0") => spawnSync("/bin/sh", [path.join(__dirname, "../scripts/install-icon.sh")], {
      encoding: "utf8", env: { ...process.env, HOME: directory, PATH: `${bin}:/usr/bin:/bin`, FAIL_BUILD: fail }
    });
    assert.notEqual(run("1").status, 0);
    assert.equal(fs.readFileSync(path.join(app, "Contents/MacOS/terminal-notifier"), "utf8"), "old helper");
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.ok(fs.existsSync(path.join(app, "Contents/MacOS/ClaudeCursorNotifier")));
    const second = run();
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /already up to date/);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
