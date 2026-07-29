#!/bin/sh

set -eu

repository="le0u0/claude-code-cursor-notification"
archive_url="https://github.com/${repository}/archive/refs/heads/main.tar.gz"

for command in curl tar npm cursor; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

temporary_directory="$(mktemp -d)"
trap 'rm -rf "$temporary_directory"' EXIT HUP INT TERM

echo "Downloading Claude Code Cursor Notification..."
curl -fsSL "$archive_url" | tar -xz -C "$temporary_directory"

project_directory="$temporary_directory/claude-code-cursor-notification-main"
cd "$project_directory"

echo "Building extension..."
npm ci --include=dev --ignore-scripts
npm run package

vsix_path="$(find "$project_directory" -maxdepth 1 -name '*.vsix' -print -quit)"
if [ -z "$vsix_path" ]; then
  echo "VSIX package was not created." >&2
  exit 1
fi

echo "Installing extension in Cursor..."
cursor --install-extension "$vsix_path" --force

echo "Installed. Reload Cursor, then run “Claude Notification: Install Hooks” from the Command Palette."
