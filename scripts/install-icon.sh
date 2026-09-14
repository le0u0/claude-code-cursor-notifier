#!/bin/sh
set -eu

plugin_directory="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
base="$HOME/Library/Application Support/ClaudeCursorNotifierIcon"
installed="$base/Claude Code Notifier.app"
# Include source and icon contents so plugin updates also update the popup engine.
fingerprint="$(cat "$plugin_directory"/native/*.swift "$plugin_directory/native/Info.plist" "$plugin_directory/assets/notifier-icon.png" "$0" | shasum -a 256 | cut -d ' ' -f 1)"
if [ -x "$installed/Contents/MacOS/ClaudeCursorNotifier" ] && [ -f "$installed/Contents/Resources/build-fingerprint" ] && [ "$(cat "$installed/Contents/Resources/build-fingerprint")" = "$fingerprint" ]; then
  echo "Custom popup is already up to date."
  exit 0
fi
if ! xcrun --find swiftc >/dev/null 2>&1; then
  echo "Install Apple Command Line Tools with xcode-select --install, then rerun init." >&2
  exit 1
fi
mkdir -p "$base"
staging="$(mktemp -d "$base/build.XXXXXX")"
trap 'rm -rf "$staging"' EXIT HUP INT TERM
app="$staging/Claude Code Notifier.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
xcrun swiftc -module-cache-path "$staging/module-cache" "$plugin_directory"/native/*.swift -o "$app/Contents/MacOS/ClaudeCursorNotifier" -framework AppKit
cp "$plugin_directory/native/Info.plist" "$app/Contents/Info.plist"
iconset="$staging/Notifier.iconset"
mkdir -p "$iconset"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$plugin_directory/assets/notifier-icon.png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  doubled="$((size * 2))"
  sips -z "$doubled" "$doubled" "$plugin_directory/assets/notifier-icon.png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$app/Contents/Resources/Notifier.icns"
printf '%s\n' "$fingerprint" > "$app/Contents/Resources/build-fingerprint"
codesign --force --deep --sign - "$app"
codesign --verify --deep --strict "$app"
"$app/Contents/MacOS/ClaudeCursorNotifier" --self-test
# Keep the previous helper if building or verification fails.
if [ -d "$installed" ]; then mv "$installed" "$staging/previous.app"; fi
if ! mv "$app" "$installed"; then
  if [ -d "$staging/previous.app" ]; then mv "$staging/previous.app" "$installed"; fi
  exit 1
fi
echo "Installed custom popup. No macOS notification permission is required."
