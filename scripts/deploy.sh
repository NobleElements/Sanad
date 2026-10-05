#!/usr/bin/env bash
set -euo pipefail

# Ensure we are in the repository root directory
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# Ensure there are no unstaged or uncommitted changes in tracked files
if ! git diff-index --quiet HEAD --; then
  echo "Error: Working directory has uncommitted changes. Please commit or stash them before deploying." >&2
  exit 1
fi

echo "=> Checking out main branch..."
git checkout main

echo "=> Pulling latest changes from origin/main..."
git pull origin main

echo "=> Merging dev into main..."
git merge dev

echo "=> Pushing main to origin..."
git push origin main

echo "=> Checking out dev branch..."
git checkout dev

echo "=> Deployment to main completed successfully. GitHub Action triggered!"
