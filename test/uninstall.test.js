"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const uninstallPath = path.join(__dirname, "..", "uninstall.sh");

test("removes the notifier and only its managed Claude hooks", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "uninstaller-test-"));
  const home = path.join(directory, "home");
  const bin = path.join(directory, "bin");
  const installationDirectory = path.join(directory, "installed");
  const settingsDirectory = path.join(home, ".claude");
  const settingsPath = path.join(settingsDirectory, "settings.json");
  const managedCommand =
    `/usr/bin/env node '${installationDirectory}/hook.js' # claude-code-cursor-notifier`;
  fs.mkdirSync(bin, { recursive: true });
  fs.mkdirSync(installationDirectory, { recursive: true });
  fs.mkdirSync(settingsDirectory, { recursive: true });

  fs.copyFileSync(
    path.join(__dirname, "..", "src", "settings.js"),
    path.join(installationDirectory, "settings.js")
  );
  fs.copyFileSync(
    path.join(__dirname, "..", "src", "uninstall-hooks.js"),
    path.join(installationDirectory, "uninstall-hooks.js")
  );
  fs.symlinkSync(process.execPath, path.join(bin, "node"));
  fs.writeFileSync(
    settingsPath,
    JSON.stringify({
      hooks: {
        Stop: [
          {
            hooks: [{ type: "command", command: "/existing/hook.js" }]
          },
          {
            hooks: [{ type: "command", command: managedCommand }]
          }
        ],
        PermissionRequest: [
          {
            hooks: [{ type: "command", command: managedCommand }]
          }
        ]
      }
    })
  );

  const result = spawnSync("/bin/sh", [uninstallPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      PATH: `${bin}:/usr/bin:/bin`,
      CLAUDE_CURSOR_NOTIFIER_INSTALL_DIR: installationDirectory
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Uninstalled Claude Cursor Notifier\./);
  assert.equal(fs.existsSync(installationDirectory), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(settingsPath, "utf8")), {
    hooks: {
      Stop: [
        {
          hooks: [{ type: "command", command: "/existing/hook.js" }]
        }
      ]
    }
  });

  fs.rmSync(directory, { recursive: true });
});
