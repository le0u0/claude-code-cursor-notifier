#!/bin/sh

set -eu

repository="le0u0/claude-code-cursor-notifier"
archive_url="https://github.com/${repository}/archive/refs/heads/main.tar.gz"

if ! command -v swiftc >/dev/null 2>&1; then
  echo "Apple Swift toolchain is required." >&2
  echo "Install it with: xcode-select --install" >&2
  exit 1
fi

for command in curl tar node codesign; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

temporary_directory="$(mktemp -d)"
trap 'rm -rf "$temporary_directory"' EXIT HUP INT TERM

default_installation_directory="$HOME/Library/Application Support/ClaudeCursorNotifier"
installation_directory="${CLAUDE_CURSOR_NOTIFIER_INSTALL_DIR:-$default_installation_directory}"
case "$installation_directory" in
  ""|"/"|"$HOME")
    echo "Unsafe installation directory: $installation_directory" >&2
    exit 1
    ;;
esac

echo "Downloading Claude Cursor Notifier..."
curl -fsSL "$archive_url" | tar -xz -C "$temporary_directory"

project_directory="$temporary_directory/claude-code-cursor-notifier-main"
app_path="$temporary_directory/ClaudeCursorNotifier.app"
contents_path="$app_path/Contents"
executable_path="$contents_path/MacOS/ClaudeCursorNotifier"
module_cache_path="$temporary_directory/swift-module-cache"

echo "Building native notifier..."
mkdir -p "$(dirname "$executable_path")" "$module_cache_path"
cp "$project_directory/native/Info.plist" "$contents_path/Info.plist"
CLANG_MODULE_CACHE_PATH="$module_cache_path" \
SWIFT_MODULE_CACHE_PATH="$module_cache_path" \
swiftc \
  "$project_directory/native/NotificationInput.swift" \
  "$project_directory/native/ProjectOpener.swift" \
  "$project_directory/native/main.swift" \
  -o "$executable_path" \
  -framework AppKit \
  -framework UserNotifications
codesign --force --deep --sign - "$app_path"

echo "Installing Claude hooks..."
mkdir -p "$installation_directory"
cp "$project_directory/src/hook.js" "$installation_directory/hook.js"
cp "$project_directory/src/hook-lib.js" "$installation_directory/hook-lib.js"
cp "$project_directory/src/notifier.js" "$installation_directory/notifier.js"
cp "$project_directory/src/settings.js" "$installation_directory/settings.js"
cp "$project_directory/src/install-hooks.js" "$installation_directory/install-hooks.js"
cp "$project_directory/src/uninstall-hooks.js" "$installation_directory/uninstall-hooks.js"
chmod 755 \
  "$installation_directory/hook.js" \
  "$installation_directory/install-hooks.js" \
  "$installation_directory/uninstall-hooks.js"
rm -rf "$installation_directory/ClaudeCursorNotifier.app"
mv "$app_path" "$installation_directory/ClaudeCursorNotifier.app"
node \
  "$installation_directory/install-hooks.js" \
  "$installation_directory/hook.js"

echo "Installed. Claude Code notifications are ready."
