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

test("downloads, packages, and installs the extension", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "installer-test-"));
  const bin = path.join(directory, "bin");
  const log = path.join(directory, "commands.log");
  fs.mkdirSync(bin);

  writeExecutable(path.join(bin, "curl"), "#!/bin/sh\nexit 0\n");
  writeExecutable(
    path.join(bin, "tar"),
    [
      "#!/bin/sh",
      'project="$3/claude-code-cursor-notification-main"',
      'mkdir -p "$project"',
      'printf "{}\\n" > "$project/package.json"'
    ].join("\n")
  );
  writeExecutable(
    path.join(bin, "npm"),
    [
      "#!/bin/sh",
      'echo "npm $*" >> "$TEST_COMMAND_LOG"',
      'if [ "$1" = "run" ] && [ "$2" = "package" ]; then',
      '  touch claude-code-cursor-notification-0.2.0.vsix',
      "fi"
    ].join("\n")
  );
  writeExecutable(
    path.join(bin, "cursor"),
    '#!/bin/sh\necho "cursor $*" >> "$TEST_COMMAND_LOG"\n'
  );

  const result = spawnSync("/bin/sh", [installPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:/usr/bin:/bin`,
      TEST_COMMAND_LOG: log
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Installed\. Reload Cursor/);
  const commands = fs.readFileSync(log, "utf8");
  assert.match(commands, /^npm ci --include=dev --ignore-scripts$/m);
  assert.match(commands, /^npm run package$/m);
  assert.match(commands, /^cursor --install-extension .+\.vsix --force$/m);
  assert.doesNotMatch(commands, /npm test/);

  fs.rmSync(directory, { recursive: true });
});

test("explains when Cursor CLI is unavailable", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "installer-test-"));
  const bin = path.join(directory, "bin");
  fs.mkdirSync(bin);

  for (const command of ["curl", "tar", "npm"]) {
    writeExecutable(path.join(bin, command), "#!/bin/sh\nexit 0\n");
  }

  const result = spawnSync("/bin/sh", [installPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:/usr/bin:/bin`
    }
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Required command not found: cursor/);

  fs.rmSync(directory, { recursive: true });
});
