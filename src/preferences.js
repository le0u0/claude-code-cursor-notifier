"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { spawn, spawnSync } = require("node:child_process");

function configPath() {
  return path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "claude-cursor-notifier.json");
}

function savedPreferences() {
  const file = configPath();
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

function preferences() {
  return { editor: "cursor", duration: 5, sound: "Glass", ...savedPreferences() };
}

function savePreference(key, value) {
  // Store only what the user chose, so init can tell an unset preference from a default.
  const next = { ...savedPreferences(), [key]: value };
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

async function chooseSound() {
  if (!process.stdin.isTTY) throw new Error("--choose needs a terminal. Run it yourself, or use --list-sounds and --sound NAME.");
  const files = soundFiles();
  const names = ["Silent", ...Object.keys(files).sort()];
  const saved = preferences().sound || "Silent";
  let index = Math.max(0, names.indexOf(saved));
  let player;

  const render = (first) => {
    if (!first) process.stdout.write(`\u001b[${names.length + 1}A`);
    process.stdout.write("Up/Down previews a sound, Enter saves it, Esc cancels.\u001b[K\n");
    for (const [position, name] of names.entries()) {
      const marker = position === index ? "\u001b[36m\u276f\u001b[0m" : " ";
      process.stdout.write(`${marker} ${name}${name === saved ? " (saved)" : ""}\u001b[K\n`);
    }
  };

  const preview = () => {
    player?.kill();
    const file = files[names[index]];
    player = file ? spawn("/usr/bin/afplay", [file], { stdio: "ignore" }) : undefined;
  };

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdout.write("\u001b[?25l");
  render(true);
  try {
    return await new Promise((resolve) => {
      process.stdin.on("keypress", (_, key) => {
        if (key.name === "up" || key.name === "down") {
          index = (index + (key.name === "down" ? 1 : names.length - 1)) % names.length;
          render(false);
          preview();
        } else if (key.name === "return") {
          resolve(names[index]);
        } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
          resolve(undefined);
        }
      });
    });
  } finally {
    player?.kill();
    process.stdout.write("\u001b[?25h");
    process.stdin.setRawMode(false);
    // Keypress events keep the terminal handle referenced, so drop them before returning.
    process.stdin.removeAllListeners("keypress");
    process.stdin.pause();
    process.stdin.unref();
  }
}

if (require.main === module) {
  try {
    const [mode, value] = process.argv.slice(2);
    if (mode === "--show") {
      process.stdout.write(`${JSON.stringify(preferences())}\n`);
    } else if (mode === "--saved") {
      process.stdout.write(`${JSON.stringify(savedPreferences())}\n`);
    } else if (mode === "--duration") {
      savePreference("duration", durationSeconds(value));
      process.stdout.write(`Popup duration: ${value} seconds.\n`);
    } else if (mode === "--list-sounds") {
      process.stdout.write(`${JSON.stringify(["Silent", ...Object.keys(soundFiles()).sort()])}\n`);
    } else if (mode === "--sound") {
      savePreference("sound", soundName(value));
      process.stdout.write(`Notification sound: ${value || "Silent"}.\n`);
    } else if (mode === "--choose") {
      chooseSound().then((name) => {
        if (!name) return process.stdout.write("Cancelled. Sound unchanged.\n");
        savePreference("sound", soundName(name));
        process.stdout.write(`Notification sound: ${name}.\n`);
      }).catch((error) => {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
      });
    } else if (mode === "--preview") {
      const sound = soundName(value);
      if (sound) {
        const result = spawnSync("/usr/bin/afplay", [soundFiles()[sound]], { stdio: "inherit", timeout: 10000 });
        if (result.error || result.status !== 0) throw new Error(result.error?.message || "Sound preview failed.");
      }
    } else {
      throw new Error("Usage: preferences.js --show|--saved|--duration SECONDS|--list-sounds|--choose|--sound NAME|--preview NAME");
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { preferences, savedPreferences, savePreference, durationSeconds, soundName, soundFiles };
