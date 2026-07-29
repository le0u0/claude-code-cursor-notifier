"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function firstLine(value, limit = 180) {
  const line = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!line) return "";
  return line.length > limit ? `${line.slice(0, limit - 1)}…` : line;
}

function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((item) => item && item.type === "text")
    .map((item) => item.text || "")
    .join(" ");
}

function taskFromTranscript(transcriptPath) {
  if (!transcriptPath) return "";

  let lines;
  try {
    lines = fs.readFileSync(transcriptPath, "utf8").split("\n");
  } catch {
    return "";
  }

  for (const line of lines) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const message = entry.message || entry;
    if (message.role !== "user" && entry.type !== "user") continue;
    const text = textFromContent(message.content || entry.content);
    if (text && !text.includes("<tool_result")) return firstLine(text, 90);
  }
  return "";
}

function describeTool(toolName, input) {
  const tool = firstLine(toolName || "Tool", 40);
  if (!input || typeof input !== "object") return tool;

  const preferred =
    input.command ||
    input.file_path ||
    input.path ||
    input.url ||
    input.query ||
    input.pattern ||
    input.description;

  if (preferred) return `${tool}: ${firstLine(preferred, 150)}`;

  const keys = Object.keys(input);
  return keys.length ? `${tool}: ${keys.slice(0, 4).join(", ")}` : tool;
}

function notificationFromHook(payload) {
  const event = payload.hook_event_name;
  const project = path.basename(payload.cwd || process.cwd()) || "project";
  const task = taskFromTranscript(payload.transcript_path);

  if (event === "Stop") {
    return {
      kind: "complete",
      title: "Claude Code: task complete",
      subtitle: task ? `${project} — ${task}` : project,
      body: firstLine(payload.last_assistant_message, 180) || "Claude finished responding."
    };
  }

  if (event === "PermissionRequest") {
    return {
      kind: "approval",
      title: "Claude Code: approval required",
      subtitle: task ? `${project} — ${task}` : project,
      body: describeTool(payload.tool_name, payload.tool_input)
    };
  }

  if (event === "Notification" && payload.notification_type === "permission_prompt") {
    return {
      kind: "approval",
      title: "Claude Code: approval required",
      subtitle: task ? `${project} — ${task}` : project,
      body: firstLine(payload.message, 180) || "Claude needs permission."
    };
  }

  return null;
}

function processChain(startPid = process.ppid) {
  const chain = [];
  const seen = new Set();
  let pid = Number(startPid);

  while (Number.isInteger(pid) && pid > 1 && !seen.has(pid)) {
    chain.push(pid);
    seen.add(pid);
    const result = spawnSync("/bin/ps", ["-p", String(pid), "-o", "ppid="], {
      encoding: "utf8"
    });
    if (result.status !== 0) break;
    pid = Number(result.stdout.trim());
  }

  return chain;
}

function signalFromHook(payload, options = {}) {
  const notification = notificationFromHook(payload);
  if (!notification) return null;

  return {
    id: options.id || `${Date.now()}-${process.pid}`,
    sessionId: payload.session_id || "",
    cwd: payload.cwd || process.cwd(),
    pids: options.pids || processChain(),
    createdAt: new Date().toISOString(),
    ...notification
  };
}

module.exports = {
  describeTool,
  firstLine,
  notificationFromHook,
  processChain,
  signalFromHook,
  taskFromTranscript,
  textFromContent
};
