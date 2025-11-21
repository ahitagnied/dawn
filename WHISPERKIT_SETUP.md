# WhisperKit Local Transcription Setup

This document explains how to set up and use local transcription with WhisperKit in the Dawn app.

## Overview

Dawn now supports local, offline transcription using WhisperKit, which runs Whisper models directly on Apple Silicon Macs using CoreML. This provides:

- **Privacy**: All transcription happens locally on your device
- **Speed**: Fast transcription using the Neural Engine
- **Offline**: No internet connection required
- **Fallback**: Automatic fallback to Groq API if local transcription fails

## Prerequisites

- macOS 12.0 or later
- Apple Silicon Mac (M1, M2, M3, or later)
- Xcode Command Line Tools installed
- Git LFS installed (for downloading models)

## Setup Instructions

### 1. Clone WhisperKit Repository

The WhisperKit repository should already be cloned in the project directory:

```bash
cd /Users/divyanshlalwani/Documents/dawn
git clone https://github.com/argmaxinc/WhisperKit.git
```

### 2. Setup WhisperKit Environment

```bash
cd WhisperKit
make setup
```

This will:
- Install required dependencies
- Setup Homebrew packages (huggingface-cli, git-lfs, etc.)
- Prepare the build environment

### 3. Download Models

Download the base model (or any other model you prefer):

```bash
# Download base model (recommended for development)
make download-model MODEL=base

# Or download other models:
# make download-model MODEL=tiny      # Fastest, least accurate
# make download-model MODEL=small     # Good balance
# make download-model MODEL=medium    # Better accuracy
# make download-model MODEL=large-v3  # Best accuracy, slower
```

Models are downloaded to `WhisperKit/Models/whisperkit-coreml/`

### 4. Build WhisperKit CLI

Build the WhisperKit CLI with server support in release mode:

```bash
BUILD_ALL=1 swift build --configuration release --product whisperkit-cli
```

The binary will be at: `WhisperKit/.build/release/whisperkit-cli`

### 5. Build Dawn App

```bash
cd /Users/divyanshlalwani/Documents/dawn
npm install
npm run build
```

## How It Works

### Architecture

1. **WhisperKit Service** (`src/main/services/whisperkit-service.ts`):
   - Manages the WhisperKit server lifecycle
   - Spawns the server as a child process
   - Handles transcription requests via HTTP API

2. **Main Process Integration** (`src/main/index.ts`):
   - Starts WhisperKit server on app launch (if enabled)
   - Routes transcription requests to WhisperKit first
   - Falls back to Groq API if local transcription fails
   - Stops server on app quit

3. **Settings UI** (`src/renderer/src/components/settings/TranscriptionSettings.tsx`):
   - Toggle for enabling/disabling local transcription
   - Model selection (future enhancement)

### Transcription Flow

```
User records audio
       ↓
Audio saved to temp file
       ↓
Local transcription enabled? → No → Groq API
       ↓ Yes
WhisperKit available? → No → Groq API
       ↓ Yes
Try WhisperKit transcription
       ↓
Success? → Yes → Return transcription
       ↓ No
Fallback to Groq API
```

### Server Configuration

The WhisperKit server runs with these default settings:

- **Host**: `127.0.0.1` (localhost only, not exposed to network)
- **Port**: `50060`
- **Model**: `openai_whisper-base` (configurable)
- **API**: OpenAI-compatible Audio API

## Usage

### Enabling Local Transcription

1. Open Dawn settings
2. Navigate to "Transcription" tab
3. Toggle "Local Transcription" ON
4. The app will automatically start the WhisperKit server

### Using Different Models

To change the model, edit `src/main/services/whisperkit-service.ts`:

```typescript
export const whisperKitService = new WhisperKitService({
  model: 'openai_whisper-base',  // Change this to your preferred model
  verbose: true
})
```

Available models (after downloading):
- `openai_whisper-tiny` - ~75MB, fastest
- `openai_whisper-base` - ~150MB, good balance (default)
- `openai_whisper-small` - ~500MB, better accuracy
- `openai_whisper-medium` - ~1.5GB, high accuracy
- `openai_whisper-large-v3` - ~3GB, best accuracy

## Development

### Testing the Server Manually

Start the server manually for testing:

```bash
cd WhisperKit
./.build/release/whisperkit-cli serve --model base --host 127.0.0.1 --port 50060 --verbose
```

Test transcription with curl:

```bash
curl -X POST http://127.0.0.1:50060/v1/audio/transcriptions \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/audio.wav" \
  -F "model=base" \
  -F "language=en"
```

### Debugging

Enable verbose logging in the service:

```typescript
export const whisperKitService = new WhisperKitService({
  model: 'openai_whisper-base',
  verbose: true  // Enable verbose logging
})
```

Check console logs for:
- `[WhisperKit]` - Service logs
- `[WhisperKit Server]` - Server stdout
- `[WhisperKit Server Error]` - Server stderr
- `[Main]` - Main process integration logs

### Common Issues

**Issue**: Server not starting
- Check if binary exists: `ls -la WhisperKit/.build/release/whisperkit-cli`
- Verify models are downloaded: `ls WhisperKit/Models/whisperkit-coreml/`
- Check permissions: `chmod +x WhisperKit/.build/release/whisperkit-cli`

**Issue**: Transcription fails
- Check server logs in console
- Verify audio file format (wav, mp3, m4a, flac supported)
- Try fallback to Groq API (should happen automatically)

**Issue**: "WhisperKit not available"
- Ensure you're on Apple Silicon Mac
- Verify binary is built: `make build-local-server`
- Check path in service matches actual binary location

## Production Deployment

For production builds, you'll need to:

1. **Bundle WhisperKit with the app**:
   - Copy the binary to `resources/whisperkit/whisperkit-cli`
   - Copy models to `resources/whisperkit/Models/`
   - Update `electron-builder.yml` to include these files

2. **Sign the binary**:
   - Code sign the WhisperKit binary for macOS distribution
   - Include in app notarization

3. **Handle permissions**:
   - Microphone access (already handled by Electron)
   - File system access for temp audio files

Example `electron-builder.yml` addition:

```yaml
extraResources:
  - from: "WhisperKit/.build/release/whisperkit-cli"
    to: "whisperkit/whisperkit-cli"
  - from: "WhisperKit/Models/whisperkit-coreml/openai_whisper-base"
    to: "whisperkit/Models/whisperkit-coreml/openai_whisper-base"
```

## Performance

### Model Comparison

| Model | Size | Speed | Accuracy | Recommended For |
|-------|------|-------|----------|-----------------|
| tiny | ~75MB | Very Fast | Basic | Quick notes, testing |
| base | ~150MB | Fast | Good | General use (default) |
| small | ~500MB | Medium | Better | Important transcriptions |
| medium | ~1.5GB | Slower | High | Professional use |
| large-v3 | ~3GB | Slowest | Best | Maximum accuracy needed |

### Benchmarks (Apple M1 Max)

- **tiny**: ~0.5s for 30s audio
- **base**: ~1.0s for 30s audio
- **small**: ~2.0s for 30s audio
- **medium**: ~4.0s for 30s audio
- **large-v3**: ~8.0s for 30s audio

## API Reference

### WhisperKitService

```typescript
class WhisperKitService {
  // Check if WhisperKit is available on this system
  isAvailable(): boolean

  // Start the WhisperKit server
  startServer(): Promise<void>

  // Stop the WhisperKit server
  stopServer(): void

  // Transcribe an audio file
  transcribe(audioFilePath: string, options?: TranscriptionOptions): Promise<TranscriptionResult>

  // Check if server is healthy
  healthCheck(): Promise<boolean>

  // Get current status
  getStatus(): { isRunning: boolean; isReady: boolean; config: WhisperKitConfig }
}
```

### TranscriptionOptions

```typescript
interface TranscriptionOptions {
  language?: string      // e.g., 'en', 'es', 'fr'
  temperature?: number   // 0.0 to 1.0, default 0.0
  stream?: boolean       // Enable streaming (future)
}
```

### TranscriptionResult

```typescript
interface TranscriptionResult {
  text: string          // Transcribed text
  language?: string     // Detected language
  duration?: number     // Audio duration in seconds
}
```

## Resources

- [WhisperKit GitHub](https://github.com/argmaxinc/WhisperKit)
- [WhisperKit Documentation](https://argmaxinc.com/blog/whisperkit)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [CoreML Documentation](https://developer.apple.com/documentation/coreml)

## License

WhisperKit is licensed under the MIT License. See the WhisperKit repository for details.

