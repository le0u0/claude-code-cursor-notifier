"use strict";

const vscode = require("vscode");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile, spawn } = require("node:child_process");
const { promisify } = require("node:util");
const { installHooks } = require("./settings");

const execFileAsync = promisify(execFile);
const pending = new Map();
const processing = new Set();
let watcher;
let helperExecutable = "";

function installedHelperPath(context) {
  return path.join(
    context.globalStorageUri.fsPath,
    "ClaudeCursorNotifier.app",
    "Contents",
    "MacOS",
    "ClaudeCursorNotifier"
  );
}

async function buildNativeHelper(context) {
  if (process.platform !== "darwin") {
    throw new Error("Native notification helper currently supports macOS only.");
  }

  const appPath = path.join(
    context.globalStorageUri.fsPath,
    "ClaudeCursorNotifier.app"
  );
  const contentsPath = path.join(appPath, "Contents");
  const executablePath = path.join(contentsPath, "MacOS", "ClaudeCursorNotifier");
  const moduleCachePath = path.join(
    context.globalStorageUri.fsPath,
    "swift-module-cache"
  );
  const sourcePath = context.asAbsolutePath("native/main.swift");
  const inputSourcePath = context.asAbsolutePath("native/NotificationInput.swift");
  const plistPath = context.asAbsolutePath("native/Info.plist");

  await fs.promises.rm(appPath, { recursive: true, force: true });
  await fs.promises.mkdir(path.dirname(executablePath), { recursive: true });
  await fs.promises.mkdir(moduleCachePath, { recursive: true });
  await fs.promises.copyFile(plistPath, path.join(contentsPath, "Info.plist"));
  await execFileAsync(
    "/usr/bin/swiftc",
    [
      inputSourcePath,
      sourcePath,
      "-o",
      executablePath,
      "-framework",
      "AppKit",
      "-framework",
      "UserNotifications"
    ],
    {
      env: {
        ...process.env,
        CLANG_MODULE_CACHE_PATH: moduleCachePath,
        SWIFT_MODULE_CACHE_PATH: moduleCachePath
      }
    }
  );
  await execFileAsync("/usr/bin/codesign", [
    "--force",
    "--deep",
    "--sign",
    "-",
    appPath
  ]);
  return executablePath;
}

function showFallback(signal) {
  const script =
    `display notification ${JSON.stringify(signal.body)} ` +
    `with title ${JSON.stringify(signal.title)} ` +
    `subtitle ${JSON.stringify(signal.subtitle)}`;
  execFile("/usr/bin/osascript", ["-e", script]);
}

function showNative(signal, channel) {
  if (!helperExecutable || !fs.existsSync(helperExecutable)) {
    showFallback(signal);
    return;
  }

  const clickPath = path.join(channel, `click-${signal.id}`);
  const sound = vscode.workspace
    .getConfiguration("claudeCursorNotification")
    .get("sound", "Blow");
  const args = [
    "--title",
    signal.title,
    "--subtitle",
    signal.subtitle,
    "--body",
    signal.body,
    "--identifier",
    `claude-${signal.sessionId || signal.id}`,
    "--click-file",
    clickPath
  ];
  if (sound) args.push("--sound", sound);

  spawn(helperExecutable, args, { detached: true, stdio: "ignore" }).unref();
}

async function matchingTerminal(pids) {
  const wanted = new Set(pids || []);
  for (const terminal of vscode.window.terminals) {
    const pid = await terminal.processId;
    if (pid && wanted.has(pid)) return terminal;
  }
  return undefined;
}

function raiseCursorWindow(workspaceName) {
  if (process.platform !== "darwin") return;
  const safeName = String(workspaceName || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = `
tell application "Cursor" to activate
tell application "System Events"
  tell process "Cursor"
    repeat with candidate in windows
      if name of candidate contains "${safeName}" then
        perform action "AXRaise" of candidate
        exit repeat
      end if
    end repeat
  end tell
end tell`;
  execFile("/usr/bin/osascript", ["-e", script]);
}

async function focusSignal(signal) {
  const terminal = await matchingTerminal(signal.pids);
  if (terminal) terminal.show(false);
  const workspaceName =
    vscode.workspace.name ||
    path.basename(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || signal.cwd || "");
  raiseCursorWindow(workspaceName);
}

async function handleFile(channel, filename) {
  if (processing.has(filename)) return;
  processing.add(filename);
  const fullPath = path.join(channel, filename);

  try {
    if (filename.startsWith("signal-") && filename.endsWith(".json")) {
      let signal;
      try {
        signal = JSON.parse(await fs.promises.readFile(fullPath, "utf8"));
      } catch {
        return;
      }
      pending.set(signal.id, signal);
      showNative(signal, channel);
      await fs.promises.rm(fullPath, { force: true });
      return;
    }

    if (filename.startsWith("click-")) {
      const id = filename.slice("click-".length);
      const signal = pending.get(id);
      if (signal) {
        pending.delete(id);
        await focusSignal(signal);
      }
      await fs.promises.rm(fullPath, { force: true });
    }
  } finally {
    processing.delete(filename);
  }
}

function watchChannel(channel) {
  fs.mkdirSync(channel, { recursive: true });
  watcher = fs.watch(channel, (_event, filename) => {
    if (filename) void handleFile(channel, filename);
  });
}

async function setup(context) {
  try {
    helperExecutable = await buildNativeHelper(context);
  } catch (error) {
    void vscode.window.showErrorMessage(
      `Could not build native notification helper: ${error.message || error}`
    );
    return;
  }
  installHooks(context.asAbsolutePath("src/hook.js"));
  const choice = await vscode.window.showInformationMessage(
    "Claude hooks installed. New Cursor terminals receive exact-window routing.",
    "Open New Terminal"
  );
  if (choice === "Open New Terminal") {
    vscode.window.createTerminal("Claude Code").show();
  }
}

async function test(channel) {
  if (!helperExecutable || !fs.existsSync(helperExecutable)) {
    void vscode.window.showErrorMessage(
      "Run “Claude Notification: Install Hooks” first."
    );
    return;
  }
  const terminal = vscode.window.activeTerminal;
  const pid = terminal ? await terminal.processId : undefined;
  const signal = {
    id: `test-${Date.now()}`,
    sessionId: "test",
    title: "Claude Code: test notification",
    subtitle: vscode.workspace.name || "Cursor",
    body: "Click to return to this Cursor terminal.",
    pids: pid ? [pid] : [],
    cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ""
  };
  pending.set(signal.id, signal);
  showNative(signal, channel);
}

function activate(context) {
  const channel = path.join(
    os.tmpdir(),
    "claude-code-cursor-notification",
    crypto.randomUUID()
  );
  context.environmentVariableCollection.replace(
    "CLAUDE_CURSOR_NOTIFICATION_CHANNEL",
    channel
  );
  context.environmentVariableCollection.description =
    "Routes Claude Code hook events back to this Cursor window.";

  helperExecutable = installedHelperPath(context);
  watchChannel(channel);
  context.subscriptions.push(
    { dispose: () => watcher?.close() },
    vscode.commands.registerCommand("claudeCursorNotification.setup", () => setup(context)),
    vscode.commands.registerCommand("claudeCursorNotification.test", () => test(channel))
  );
}

function deactivate() {
  watcher?.close();
}

module.exports = { activate, deactivate };
