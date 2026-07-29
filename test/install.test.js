"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const installPath = path.join(__dirname, "..", "install.sh");

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

test("downloads and installs the standalone notifier", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "installer-test-"));
  const bin = path.join(directory, "bin");
  const log = path.join(directory, "commands.log");
  const installationDirectory = path.join(directory, "installed");
  fs.mkdirSync(bin);

  writeExecutable(path.join(bin, "curl"), "#!/bin/sh\nexit 0\n");
  writeExecutable(
    path.join(bin, "tar"),
    [
      "#!/bin/sh",
      'project="$3/claude-code-cursor-notifier-main"',
      'mkdir -p "$project/native" "$project/src"',
      'touch "$project/native/NotificationInput.swift"',
      'touch "$project/native/ProjectOpener.swift"',
      'touch "$project/native/main.swift"',
      'touch "$project/native/Info.plist"',
      'touch "$project/src/hook.js"',
      'touch "$project/src/hook-lib.js"',
      'touch "$project/src/settings.js"',
      'touch "$project/src/install-hooks.js"'
    ].join("\n")
  );
  writeExecutable(
    path.join(bin, "swiftc"),
    [
      "#!/bin/sh",
      'echo "swiftc $*" >> "$TEST_COMMAND_LOG"',
      'while [ "$#" -gt 0 ]; do',
      '  if [ "$1" = "-o" ]; then',
      '    shift',
      '    touch "$1"',
      "    break",
      "  fi",
      "  shift",
      "done"
    ].join("\n")
  );
  writeExecutable(
    path.join(bin, "codesign"),
    '#!/bin/sh\necho "codesign $*" >> "$TEST_COMMAND_LOG"\n'
  );
  writeExecutable(
    path.join(bin, "node"),
    '#!/bin/sh\necho "node $*" >> "$TEST_COMMAND_LOG"\n'
  );

  const result = spawnSync("/bin/sh", [installPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:/usr/bin:/bin`,
      CLAUDE_CURSOR_NOTIFIER_INSTALL_DIR: installationDirectory,
      TEST_COMMAND_LOG: log
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Installed\. Claude Code notifications are ready\./);
  const commands = fs.readFileSync(log, "utf8");
  assert.match(commands, /^swiftc .+NotificationInput\.swift .+ProjectOpener\.swift .+main\.swift /m);
  assert.match(commands, /^codesign --force --deep --sign - .+ClaudeCursorNotifier\.app$/m);
  assert.match(commands, /^node .+install-hooks\.js .+hook\.js$/m);
  assert.equal(fs.existsSync(path.join(installationDirectory, "hook.js")), true);
  assert.equal(
    fs.existsSync(
      path.join(
        installationDirectory,
        "ClaudeCursorNotifier.app",
        "Contents",
        "MacOS",
        "ClaudeCursorNotifier"
      )
    ),
    true
  );
  assert.doesNotMatch(commands, /npm|cursor --install-extension/);

  fs.rmSync(directory, { recursive: true });
});

test("explains when the Swift compiler is unavailable", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "installer-test-"));
  const bin = path.join(directory, "bin");
  fs.mkdirSync(bin);

  for (const command of ["curl", "tar", "node", "codesign"]) {
    writeExecutable(path.join(bin, command), "#!/bin/sh\nexit 0\n");
  }

  const result = spawnSync("/bin/sh", [installPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:/bin`
    }
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Required command not found: swiftc/);

  fs.rmSync(directory, { recursive: true });
});
