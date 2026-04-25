#!/usr/bin/env bash
set -euo pipefail

# Fetch a skill directory from a remote git repo into ~/.claude/skills/.
#
# Usage:
#   ./scripts/update-skills.sh <repo-url> <src-path> [branch]
#
# Example:
#   ./scripts/update-skills.sh git@github.com:owner/repo.git skills/my-skill main
#   -> ~/.claude/skills/my-skill/

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "Usage: $0 <repo-url> <src-path> [branch]" >&2
  exit 1
fi

REPO_URL="$1"
SRC_PATH="$2"
BRANCH="${3:-main}"

SKILLS_DIR=".claude/skills"
SKILL_NAME="$(basename "$SRC_PATH")"
DEST_DIR="$SKILLS_DIR/$SKILL_NAME"

mkdir -p "$SKILLS_DIR"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

git clone --depth 1 --filter=blob:none --sparse --branch "$BRANCH" "$REPO_URL" "$TMP"
git -C "$TMP" sparse-checkout set --no-cone "$SRC_PATH"

if [ ! -d "$TMP/$SRC_PATH" ]; then
  echo "Error: '$SRC_PATH' not found in $REPO_URL@$BRANCH" >&2
  exit 1
fi

rm -rf "$DEST_DIR"
mv "$TMP/$SRC_PATH" "$DEST_DIR"

echo "Synced $SRC_PATH -> $DEST_DIR @ $(git -C "$TMP" rev-parse --short HEAD)"
