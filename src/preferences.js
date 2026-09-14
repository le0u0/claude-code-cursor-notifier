"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function configPath() {
  return path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "claude-cursor-notifier.json");
}

function preferences() {
  const file = configPath();
  return { editor: "cursor", duration: 5, sound: "Glass", ...(fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {}) };
}

function savePreference(key, value) {
  const next = { ...preferences(), [key]: value };
  const file = configPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
}

function durationSeconds(value) {
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds < 1) throw new Error("Choose a positive whole number of seconds.");
  return seconds;
}

const soundExtensions = new Set([".aiff", ".aif", ".wav", ".caf", ".m4a", ".mp3", ".aac"]);

function soundFiles() {
  // NSSound resolves these directories in order, so an earlier one shadows a later one.
  const directories = [path.join(os.homedir(), "Library/Sounds"), "/Library/Sounds", "/System/Library/Sounds"];
  const files = {};
  for (const directory of directories.filter((candidate) => fs.existsSync(candidate))) {
    for (const file of fs.readdirSync(directory)) {
      const name = path.basename(file, path.extname(file));
      if (!soundExtensions.has(path.extname(file).toLowerCase()) || Object.hasOwn(files, name)) continue;
      files[name] = path.join(directory, file);
    }
  }
  return files;
}

function soundName(value) {
  if (value === "Silent" || value === "") return "";
  if (!Object.hasOwn(soundFiles(), value)) throw new Error("Choose a sound from --list-sounds, or Silent.");
  return value;
}

if (require.main === module) {
  try {
    const [mode, value] = process.argv.slice(2);
    if (mode === "--show") {
      process.stdout.write(`${JSON.stringify(preferences())}\n`);
    } else if (mode === "--duration") {
      savePreference("duration", durationSeconds(value));
      process.stdout.write(`Popup duration: ${value} seconds.\n`);
    } else if (mode === "--list-sounds") {
      process.stdout.write(`${JSON.stringify(["Silent", ...Object.keys(soundFiles()).sort()])}\n`);
    } else if (mode === "--sound") {
      savePreference("sound", soundName(value));
      process.stdout.write(`Notification sound: ${value || "Silent"}.\n`);
    } else if (mode === "--preview") {
      const sound = soundName(value);
      if (sound) {
        const result = spawnSync("/usr/bin/afplay", [soundFiles()[sound]], { stdio: "inherit", timeout: 10000 });
        if (result.error || result.status !== 0) throw new Error(result.error?.message || "Sound preview failed.");
      }
    } else {
      throw new Error("Usage: preferences.js --show|--duration SECONDS|--list-sounds|--sound NAME|--preview NAME");
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { preferences, savePreference, durationSeconds, soundName };
