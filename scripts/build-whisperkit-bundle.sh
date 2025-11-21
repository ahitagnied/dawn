#!/bin/bash

# Build WhisperKit Bundle Script
# This script builds the WhisperKit CLI and bundles it with the base model for distribution

set -e  # Exit on error

echo "========================================"
echo "Building WhisperKit Bundle"
echo "========================================"

# Navigate to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo "Project root: $PROJECT_ROOT"
echo ""

# Step 1: Build WhisperKit CLI
echo "Step 1: Building WhisperKit CLI..."
cd WhisperKit
BUILD_ALL=1 swift build -c release --product whisperkit-cli
echo "✓ WhisperKit CLI built successfully"
echo ""

# Step 2: Download model if needed
echo "Step 2: Checking for openai_whisper-base model..."
if [ ! -d "Models/whisperkit-coreml/openai_whisper-base" ]; then
  echo "Model not found. Downloading..."
  make download-model MODEL=base
  echo "✓ Model downloaded successfully"
else
  echo "✓ Model already exists"
fi
echo ""

# Step 3: Create bundle directory
echo "Step 3: Creating bundle directory..."
cd "$PROJECT_ROOT"
rm -rf whisperkit-bundle
mkdir -p whisperkit-bundle/Models/whisperkit-coreml
echo "✓ Bundle directory created"
echo ""

# Step 4: Copy binary
echo "Step 4: Copying WhisperKit CLI binary..."
cp WhisperKit/.build/release/whisperkit-cli whisperkit-bundle/
chmod +x whisperkit-bundle/whisperkit-cli
echo "✓ Binary copied and made executable"
echo ""

# Step 5: Copy model
echo "Step 5: Copying openai_whisper-base model..."
cp -R WhisperKit/Models/whisperkit-coreml/openai_whisper-base whisperkit-bundle/Models/whisperkit-coreml/
echo "✓ Model copied"
echo ""

# Step 6: Verify bundle
echo "Step 6: Verifying bundle..."
BUNDLE_SIZE=$(du -sh whisperkit-bundle | cut -f1)
BINARY_SIZE=$(ls -lh whisperkit-bundle/whisperkit-cli | awk '{print $5}')
MODEL_SIZE=$(du -sh whisperkit-bundle/Models/whisperkit-coreml/openai_whisper-base | cut -f1)

echo "Bundle size: $BUNDLE_SIZE"
echo "Binary size: $BINARY_SIZE"
echo "Model size: $MODEL_SIZE"
echo ""

# Verify binary is executable
if [ -x whisperkit-bundle/whisperkit-cli ]; then
  echo "✓ Binary is executable"
else
  echo "✗ Binary is not executable"
  exit 1
fi

# Verify model files exist
if [ -d "whisperkit-bundle/Models/whisperkit-coreml/openai_whisper-base/AudioEncoder.mlmodelc" ]; then
  echo "✓ Model files are present"
else
  echo "✗ Model files are missing"
  exit 1
fi

echo ""
echo "========================================"
echo "✓ WhisperKit bundle built successfully!"
echo "========================================"
echo ""
echo "Bundle location: $PROJECT_ROOT/whisperkit-bundle"
echo ""
echo "You can now build your Electron app with:"
echo "  npm run build:mac"
echo ""

