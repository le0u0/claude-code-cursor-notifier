#!/bin/sh
set -eu

plugin_directory="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
base="$HOME/Library/Application Support/ClaudeCursorNotifierIcon"
source_app="$base/Claude Code Notifier.app"
source_license="$source_app/Contents/Resources/terminal-notifier-LICENSE.md"
if [ -x "$source_app/Contents/MacOS/terminal-notifier" ]; then
  if cmp -s "$plugin_directory/assets/notifier-icon.png" "$source_app/Contents/Resources/notifier-source.png"; then
    echo "Custom helper is already up to date. Homebrew terminal-notifier is not required."
    exit 0
  fi
else
  brew_path="$(command -v brew || true)"
  if [ -z "$brew_path" ]; then
    for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
      if [ -x "$candidate" ]; then brew_path="$candidate"; break; fi
    done
  fi
  if [ -z "$brew_path" ]; then
    echo "Install Homebrew and terminal-notifier first." >&2
    exit 1
  fi
  source_directory="$(HOMEBREW_NO_AUTO_UPDATE=1 "$brew_path" --prefix terminal-notifier)"
  source_app="$source_directory/terminal-notifier.app"
  if [ ! -d "$source_app" ]; then
    echo "terminal-notifier app not found. Run brew install terminal-notifier." >&2
    exit 1
  fi
  source_license="$source_directory/LICENSE.md"
fi
mkdir -p "$base"
staging="$(mktemp -d "$base/build.XXXXXX")"
trap 'rm -rf "$staging"' EXIT HUP INT TERM
app="$staging/Claude Code Notifier.app"
cp -R "$source_app" "$app"
cp "$source_license" "$app/Contents/Resources/terminal-notifier-LICENSE.md"
cp "$plugin_directory/assets/notifier-icon.png" "$app/Contents/Resources/notifier-source.png"
iconset="$staging/Notifier.iconset"
mkdir -p "$iconset"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$plugin_directory/assets/notifier-icon.png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  doubled="$((size * 2))"
  sips -z "$doubled" "$doubled" "$plugin_directory/assets/notifier-icon.png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$app/Contents/Resources/Notifier.icns"
plutil -replace CFBundleIdentifier -string 'fr.julienxx.oss.terminal-notifier.claude-code-notifier' "$app/Contents/Info.plist"
plutil -replace CFBundleName -string 'Claude Code Notifier' "$app/Contents/Info.plist"
plutil -replace CFBundleDisplayName -string 'Claude Code Notifier' "$app/Contents/Info.plist"
plutil -replace CFBundleIconFile -string 'Notifier' "$app/Contents/Info.plist"
codesign --force --deep --sign - "$app"
codesign --verify --deep --strict "$app"
# Replace only this script's dedicated app after the new copy is built and verified.
rm -rf "$base/Claude Code Notifier.app"
mv "$app" "$base/Claude Code Notifier.app"
echo "Installed black icon. Enable Claude Code Notifier in System Settings > Notifications."
