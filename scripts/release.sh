#!/usr/bin/env bash
set -euo pipefail

# Check if a tag name was provided
if [ -z "${1:-}" ]; then
  echo "Error: You must provide a tag name." >&2
  echo "Usage: $0 <tag-name> [message]" >&2
  echo "Example: $0 v1.2.3" >&2
  exit 1
fi

TAG="$1"
MESSAGE="${2:-Release $TAG}"

# Ensure we are in the repository root directory
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# Ensure there are no unstaged or uncommitted changes in tracked files
if ! git diff-index --quiet HEAD --; then
  echo "Error: Working directory has uncommitted changes. Please commit or stash them before releasing." >&2
  exit 1
fi

# Warn if tag does not start with 'v' (GitHub Actions docker-publish.yml triggers on 'v*')
if [[ ! "$TAG" =~ ^v ]]; then
  echo "Warning: Tag '$TAG' does not start with 'v'. The docker-publish workflow triggers on tags starting with 'v*'." >&2
fi

echo "=> Checking out main branch..."
git checkout main

echo "=> Pulling latest changes from origin/main..."
git pull origin main

echo "=> Creating tag $TAG..."
git tag -a "$TAG" -m "$MESSAGE"

echo "=> Pushing tag $TAG to origin..."
git push origin "$TAG"

echo "=> Checking out dev branch..."
git checkout dev

echo "=> Release $TAG published successfully. Docker build workflow triggered!"
