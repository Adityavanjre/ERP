#!/bin/bash
# Nexus Desktop Build Script for macOS/Linux
# Usage: ./build.sh

echo "========================================"
echo "  Nexus ERP Desktop App Builder"
echo "========================================"
echo

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo
echo "========================================"
echo "  Building Desktop App..."
echo "========================================"
echo

# Compile and build unpacked app for the current host
npm run build:dir

echo
echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo

if [ -d "release" ]; then
    echo "Output: release/"
    ls -la release/
fi
