#!/bin/sh

set -eu

if ! command -v node >/dev/null 2>&1; then
  echo "Required command not found: node" >&2
  exit 1
fi

default_installation_directory="$HOME/Library/Application Support/ClaudeCursorNotifier"
installation_directory="${CLAUDE_CURSOR_NOTIFIER_INSTALL_DIR:-$default_installation_directory}"
case "$installation_directory" in
  ""|"/"|"$HOME")
    echo "Unsafe installation directory: $installation_directory" >&2
    exit 1
    ;;
esac

if [ ! -f "$installation_directory/uninstall-hooks.js" ]; then
  echo "Claude Cursor Notifier is not installed." >&2
  exit 1
fi

node "$installation_directory/uninstall-hooks.js"
rm -rf "$installation_directory"

echo "Uninstalled Claude Cursor Notifier."
