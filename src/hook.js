#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { signalFromHook } = require("./hook-lib");

const channel = process.env.CLAUDE_CURSOR_NOTIFICATION_CHANNEL;
if (!channel) process.exit(0);

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

  fs.mkdirSync(channel, { recursive: true });
  const temporary = path.join(channel, `.signal-${signal.id}.tmp`);
  const destination = path.join(channel, `signal-${signal.id}.json`);
  fs.writeFileSync(temporary, JSON.stringify(signal), { mode: 0o600 });
  fs.renameSync(temporary, destination);
});
