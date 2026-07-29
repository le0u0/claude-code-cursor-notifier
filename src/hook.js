#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { signalFromHook } = require("./hook-lib");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exitCode = 1;
    return;
  }

  const signal = signalFromHook(payload);
  if (!signal) return;

  const notifier =
    process.env.CLAUDE_CURSOR_NOTIFIER_PATH ||
    path.join(
      __dirname,
      "ClaudeCursorNotifier.app",
      "Contents",
      "MacOS",
      "ClaudeCursorNotifier"
    );
  if (!fs.existsSync(notifier)) return;

  const args = [
    "--title",
    signal.title,
    "--subtitle",
    signal.subtitle,
    "--body",
    signal.body,
    "--identifier",
    `claude-${signal.sessionId || signal.id}`,
    "--project-path",
    signal.cwd
  ];
  const sound = process.env.CLAUDE_CURSOR_NOTIFIER_SOUND ?? "Blow";
  if (sound) args.push("--sound", sound);

  spawn(notifier, args, { detached: true, stdio: "ignore" }).unref();
});
