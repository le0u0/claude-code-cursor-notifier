"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const installer = path.join(__dirname, "..", "src", "install-hooks.js");
const uninstaller = path.join(__dirname, "..", "src", "uninstall-hooks.js");

test("installs Claude hooks through the CLI", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "install-hooks-test-"));
  const hookPath = path.join(home, "installed", "hook.js");
  const result = spawnSync(process.execPath, [installer, hookPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const settingsPath = path.join(home, ".claude", "settings.json");
  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  assert.equal(settings.hooks.PermissionRequest.length, 1);
  assert.equal(settings.hooks.PreToolUse[0].matcher, "AskUserQuestion");
  assert.equal(settings.hooks.Notification[0].matcher, "elicitation_dialog|elicitation_url_dialog");
  assert.match(settings.hooks.Notification[0].hooks[0].command, /installed\/hook\.js/);
  assert.match(settings.hooks.Stop[0].hooks[0].command, /installed\/hook\.js/);

  fs.rmSync(home, { recursive: true });
});

test("requires an installed hook path", () => {
  const result = spawnSync(process.execPath, [installer], {
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "Usage: install-hooks.js <hook-path>\n");
});

test("uninstalls Claude hooks through the CLI", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "uninstall-hooks-test-"));
  const hookPath = path.join(home, "installed", "hook.js");
  const install = spawnSync(process.execPath, [installer, hookPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home
    }
  });
  assert.equal(install.status, 0, install.stderr);

  const uninstall = spawnSync(process.execPath, [uninstaller], {
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home
    }
  });

  assert.equal(uninstall.status, 0, uninstall.stderr);
  const settings = JSON.parse(
    fs.readFileSync(path.join(home, ".claude", "settings.json"), "utf8")
  );
  assert.equal(settings.hooks, undefined);

  fs.rmSync(home, { recursive: true });
});
