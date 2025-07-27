#!/bin/bash
set -e

echo "Starting build process..."

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Install pnpm using the official installer
echo "Installing pnpm..."
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Add pnpm to PATH
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# Verify pnpm installation
echo "Verifying pnpm installation..."
pnpm --version

# Remove any npm lock files that might interfere
echo "Cleaning up npm artifacts..."
rm -f package-lock.json
rm -f npm-shrinkwrap.json
rm -rf node_modules/.package-lock.json
rm -rf node_modules

# Disable npm to prevent accidental usage
echo "Disabling npm..."
alias npm='echo "npm is disabled, use pnpm instead" && exit 1'

# Install dependencies with pnpm
echo "Installing dependencies with pnpm..."
pnpm install --no-frozen-lockfile --shamefully-hoist --strict-peer-deps=false --reporter=append-only

# Build the project
echo "Building the project..."
pnpm run build

echo "Build completed successfully!"