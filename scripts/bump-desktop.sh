#!/bin/bash
# Usage: ./scripts/bump-desktop.sh [patch|minor|major]
# Default: patch

set -e

TYPE=${1:-patch}
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAURI_CONF="$ROOT/apps/desktop/src-tauri/tauri.conf.json"
PKG_JSON="$ROOT/apps/desktop/package.json"
CARGO_TOML="$ROOT/apps/desktop/src-tauri/Cargo.toml"

# Read current version from tauri.conf.json
CURRENT=$(grep '"version"' "$TAURI_CONF" | head -1 | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')

if [ -z "$CURRENT" ]; then
  echo "❌ Could not read current version"
  exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "❌ Usage: $0 [patch|minor|major]"; exit 1 ;;
esac

NEW="$MAJOR.$MINOR.$PATCH"

echo "📦 Bumping desktop: $CURRENT → $NEW ($TYPE)"

# Update all 3 files
sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" "$TAURI_CONF" "$PKG_JSON"
sed -i '' "s/version = \"$CURRENT\"/version = \"$NEW\"/" "$CARGO_TOML"

echo "✅ Updated tauri.conf.json, package.json, Cargo.toml"

# Git commit, push, tag
cd "$ROOT"
git add apps/desktop/src-tauri/tauri.conf.json apps/desktop/package.json apps/desktop/src-tauri/Cargo.toml
git commit -m "chore(desktop): bump version to $NEW"
git push
git tag "desktop-v$NEW"
git push origin "desktop-v$NEW"

echo ""
echo "🚀 Version $NEW released!"
echo "   Tag: desktop-v$NEW"
echo "   Build: https://github.com/alphatechma/menufacil/actions"
