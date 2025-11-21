# WhisperKit Local Transcription Implementation

This document describes the WhisperKit local transcription setup for the Dawn application, enabling offline speech-to-text capabilities on macOS (Apple Silicon).

## Overview

The application now includes WhisperKit, a local speech-to-text service that runs entirely on-device. When users download the app, they will have immediate access to transcription capabilities without any additional setup or downloads.

## What Was Implemented

### 1. WhisperKit CLI Binary
- **Built**: Release version of WhisperKit CLI with server support
- **Location**: `whisperkit-bundle/whisperkit-cli` (43MB)
- **Features**: Includes local server with OpenAI-compatible API

### 2. Pre-bundled Model
- **Model**: `openai_whisper-base` (154MB)
- **Type**: Lightweight model optimized for basic transcription
- **Location**: `whisperkit-bundle/Models/whisperkit-coreml/openai_whisper-base/`
- **Performance**: Fast transcription, suitable for real-time use

### 3. Bundle Structure
```
whisperkit-bundle/
├── whisperkit-cli                    # Executable binary
└── Models/
    └── whisperkit-coreml/
        └── openai_whisper-base/      # Pre-downloaded model
            ├── AudioEncoder.mlmodelc/
            ├── MelSpectrogram.mlmodelc/
            ├── TextDecoder.mlmodelc/
            ├── config.json
            └── generation_config.json
```

### 4. Electron Builder Configuration
Updated `electron-builder.yml` to include WhisperKit resources:

```yaml
extraResources:
  - from: whisperkit-bundle
    to: whisperkit
    filter:
      - '**/*'
```

This packages the bundle into the application's resources directory at build time.

### 5. WhisperKit Service
The service (`src/main/services/whisperkit-service.ts`) handles:
- **Server Management**: Automatic startup/shutdown of the WhisperKit local server
- **Path Resolution**: Correct paths for both development and production
- **Transcription API**: Simple interface for audio transcription
- **Health Checks**: Server availability monitoring

#### Path Configuration
- **Development**: Uses `WhisperKit/.build/release/whisperkit-cli` and local models
- **Production**: Uses `process.resourcesPath/whisperkit/` with bundled resources

## Usage

### For Users
1. Download and install the Dawn app
2. The app automatically includes WhisperKit - no additional setup required
3. Transcription works immediately on first launch

### For Developers

#### Development Mode
When running in development (`npm run dev`), the service uses the locally built WhisperKit:
```
WhisperKit/.build/release/whisperkit-cli
WhisperKit/Models/whisperkit-coreml/openai_whisper-base/
```

#### Production Build
When building the application (`npm run build:mac`), electron-builder packages the `whisperkit-bundle` directory into the app resources.

#### Rebuilding WhisperKit Bundle
If you need to rebuild the bundle (e.g., to update the binary or add models):

```bash
npm run build:whisperkit
```

Or manually:
```bash
./scripts/build-whisperkit-bundle.sh
```

This script will:
1. Build the WhisperKit CLI in release mode
2. Download the base model if not present
3. Create the bundle structure
4. Copy binary and models
5. Set correct permissions
6. Verify the bundle

## API Usage

### Starting the Server
```typescript
import { whisperKitService } from './services/whisperkit-service'

// Server starts automatically on first transcription request
// Or start manually:
await whisperKitService.startServer()
```

### Transcribing Audio
```typescript
const result = await whisperKitService.transcribe(audioFilePath, {
  language: 'en',  // Optional: specify language
  temperature: 0.0  // Optional: sampling temperature
})

console.log(result.text)       // Transcribed text
console.log(result.language)   // Detected language
console.log(result.duration)   // Audio duration
```

### Server Status
```typescript
const status = whisperKitService.getStatus()
console.log(status.isReady)     // Server is ready for requests
console.log(status.isRunning)   // Server process is running
console.log(status.config)      // Current configuration
```

### Health Check
```typescript
const isHealthy = await whisperKitService.healthCheck()
```

## Configuration

The service is configured in `src/main/services/whisperkit-service.ts`:

```typescript
export const whisperKitService = new WhisperKitService({
  model: 'openai_whisper-base',  // Model to use
  verbose: true,                  // Enable verbose logging
  host: '127.0.0.1',             // Server host
  port: 50060                     // Server port
})
```

## File Sizes

- **WhisperKit CLI Binary**: ~43MB
- **openai_whisper-base Model**: ~154MB
- **Total Bundle Size**: ~197MB

This adds approximately 197MB to the application download size.

## Future Enhancements

### Adding More Models
To add additional models (e.g., `openai_whisper-large-v3`):

1. Download the model:
```bash
cd WhisperKit
make download-model MODEL=large-v3
```

2. Update the bundle script to include it:
```bash
cp -R WhisperKit/Models/whisperkit-coreml/openai_whisper-large-v3 \
      whisperkit-bundle/Models/whisperkit-coreml/
```

3. Rebuild the bundle:
```bash
npm run build:whisperkit
```

### Model Selection UI
Consider adding a UI in the settings page to let users:
- See which models are available
- Download additional models
- Switch between models
- Delete unused models to save space

### Performance Monitoring
Add telemetry to track:
- Transcription speed (real-time factor)
- Memory usage
- Model loading time
- Error rates

## Troubleshooting

### Server Won't Start
1. Check if the binary exists and is executable:
```bash
ls -l whisperkit-bundle/whisperkit-cli
```

2. Verify model files are present:
```bash
ls -la whisperkit-bundle/Models/whisperkit-coreml/openai_whisper-base/
```

3. Check the console logs for detailed error messages

### Model Not Found
Ensure the model name in the configuration matches the folder name exactly:
- Config: `'openai_whisper-base'`
- Folder: `openai_whisper-base/`

### Permission Denied
The binary must be executable:
```bash
chmod +x whisperkit-bundle/whisperkit-cli
```

## Technical Details

### WhisperKit Server
The WhisperKit CLI runs a local HTTP server that implements the OpenAI Audio API:
- **Endpoint**: `http://localhost:50060/v1/audio/transcriptions`
- **Format**: OpenAI-compatible API
- **Supports**: Transcription and translation
- **Streaming**: Real-time results via Server-Sent Events

### Model Format
Models are in CoreML format (`.mlmodelc`):
- **MelSpectrogram**: Converts audio to mel-spectrogram
- **AudioEncoder**: Encodes audio features
- **TextDecoder**: Decodes to text tokens

### Supported Audio Formats
- WAV
- MP3
- M4A
- FLAC

## References

- [WhisperKit GitHub](https://github.com/argmaxinc/WhisperKit)
- [WhisperKit Documentation](https://github.com/argmaxinc/WhisperKit/blob/main/README.md)
- [Available Models](https://huggingface.co/argmaxinc/whisperkit-coreml)
- [OpenAI Whisper](https://github.com/openai/whisper)

## License

WhisperKit is released under the MIT License. See the [LICENSE](WhisperKit/LICENSE) file in the WhisperKit submodule for details.

