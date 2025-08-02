#!/bin/bash
set -e

echo "Starting robust build process..."

# Print environment info for debugging
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"

# Ensure we're in the right directory
cd "$(dirname "$0")"
echo "Working directory: $(pwd)"

# Clean up any existing artifacts
echo "Cleaning up existing artifacts..."
rm -f package-lock.json
rm -f yarn.lock
rm -f pnpm-lock.yaml
rm -f npm-shrinkwrap.json
rm -rf node_modules
rm -rf dist

# Set npm configuration
echo "Configuring npm..."
npm config set legacy-peer-deps true
npm config set package-lock false
npm config set shrinkwrap false
npm config set audit false
npm config set fund false

# Install dependencies with verbose output for debugging
echo "Installing dependencies with npm..."
npm install --verbose --legacy-peer-deps --no-package-lock --no-shrinkwrap --no-audit --no-fund

# Verify installation
echo "Verifying installation..."
ls -la node_modules/ | head -10

# Build the project
echo "Building the project..."
npm run build

echo "Build completed successfully!"
echo "Build output:"
ls -la dist/ | head -10