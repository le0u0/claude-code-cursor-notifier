"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

test(
  "parses native helper arguments",
  { skip: process.platform !== "darwin" },
  () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "native-test-"));
    const runner = path.join(directory, "Runner.swift");
    const executable = path.join(directory, "native-parser-test");
    const parser = path.join(__dirname, "..", "native", "NotificationInput.swift");

    fs.writeFileSync(
      runner,
      [
        "import Foundation",
        "",
        "@main",
        "struct Runner {",
        "    static func main() {",
        "        let arguments = [",
        '            "helper", "--title", "Approval", "--subtitle", "payments",',
        '            "--body", "Run tests", "--identifier", "session-1",',
        '            "--project-path", "/tmp/payments", "--sound", "Blow"',
        "        ]",
        "        guard let input = parseArguments(arguments) else { exit(1) }",
        '        guard input.title == "Approval" else { exit(2) }',
        '        guard input.subtitle == "payments" else { exit(3) }',
        '        guard input.body == "Run tests" else { exit(4) }',
        '        guard input.identifier == "session-1" else { exit(5) }',
        '        guard input.projectPath == "/tmp/payments" else { exit(6) }',
        '        guard input.sound == "Blow" else { exit(7) }',
        '        guard parseArguments(["helper"]) == nil else { exit(8) }',
        "    }",
        "}"
      ].join("\n")
    );

    const compile = spawnSync(
      "/usr/bin/swiftc",
      [parser, runner, "-o", executable],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          CLANG_MODULE_CACHE_PATH: path.join(directory, "clang-cache"),
          SWIFT_MODULE_CACHE_PATH: path.join(directory, "swift-cache")
        }
      }
    );

    assert.equal(compile.status, 0, compile.stderr);
    const run = spawnSync(executable, [], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);

    fs.rmSync(directory, { recursive: true });
  }
);

test(
  "builds and runs the native helper self-test",
  { skip: process.platform !== "darwin" },
  () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "native-test-"));
    const executable = path.join(directory, "ClaudeCursorNotifier");
    const nativeDirectory = path.join(__dirname, "..", "native");
    const compile = spawnSync(
      "/usr/bin/swiftc",
      [
        path.join(nativeDirectory, "NotificationInput.swift"),
        path.join(nativeDirectory, "ProjectOpener.swift"),
        path.join(nativeDirectory, "main.swift"),
        "-o",
        executable,
        "-framework",
        "AppKit",
        "-framework",
        "UserNotifications"
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          CLANG_MODULE_CACHE_PATH: path.join(directory, "clang-cache"),
          SWIFT_MODULE_CACHE_PATH: path.join(directory, "swift-cache")
        }
      }
    );

    assert.equal(compile.status, 0, compile.stderr);
    const run = spawnSync(executable, ["--self-test"], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "ClaudeCursorNotifier OK\n");

    fs.rmSync(directory, { recursive: true });
  }
);

test(
  "opens the originating project in Cursor",
  { skip: process.platform !== "darwin" },
  () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "native-test-"));
    const launcher = path.join(directory, "open");
    const log = path.join(directory, "open.log");
    const runner = path.join(directory, "Runner.swift");
    const executable = path.join(directory, "project-opener-test");
    fs.writeFileSync(
      launcher,
      '#!/bin/sh\nprintf "%s\\n" "$@" > "$PROJECT_OPEN_LOG"\n',
      { mode: 0o755 }
    );
    fs.writeFileSync(
      runner,
      [
        "import Foundation",
        "",
        "@main",
        "struct Runner {",
        "    static func main() throws {",
        '        try openProject("/tmp/payments", launcherPath: CommandLine.arguments[1])',
        "    }",
        "}"
      ].join("\n")
    );

    const compile = spawnSync(
      "/usr/bin/swiftc",
      [
        path.join(__dirname, "..", "native", "ProjectOpener.swift"),
        runner,
        "-o",
        executable
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          CLANG_MODULE_CACHE_PATH: path.join(directory, "clang-cache"),
          SWIFT_MODULE_CACHE_PATH: path.join(directory, "swift-cache")
        }
      }
    );

    assert.equal(compile.status, 0, compile.stderr);
    const run = spawnSync(executable, [launcher], {
      encoding: "utf8",
      env: {
        ...process.env,
        PROJECT_OPEN_LOG: log
      }
    });
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(fs.readFileSync(log, "utf8").trim().split("\n"), [
      "-a",
      "Cursor",
      "/tmp/payments"
    ]);

    fs.rmSync(directory, { recursive: true });
  }
);
