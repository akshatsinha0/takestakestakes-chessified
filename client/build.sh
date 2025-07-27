#!/bin/bash
set -e

echo "Starting robust build process..."

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Clean up any existing artifacts
echo "Cleaning up existing artifacts..."
rm -f package-lock.json
rm -f yarn.lock
rm -f pnpm-lock.yaml
rm -f npm-shrinkwrap.json
rm -rf node_modules
rm -rf dist

# Use npm with specific flags to avoid workspace issues
echo "Installing dependencies with npm..."
npm install --legacy-peer-deps --no-package-lock --no-shrinkwrap

# Build the project
echo "Building the project..."
npm run build

echo "Build completed successfully!"