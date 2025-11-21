import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'
import { existsSync } from 'fs'
import FormData from 'form-data'
import { createReadStream } from 'fs'
import axios from 'axios'
import { modelDownloadService } from './model-download-service'

interface WhisperKitConfig {
  host: string
  port: number
  model: string
  verbose: boolean
}

interface TranscriptionOptions {
  language?: string
  temperature?: number
  stream?: boolean
}

interface TranscriptionResult {
  text: string
  language?: string
  duration?: number
}

interface ServerInstance {
  process: ChildProcess
  port: number
  isReady: boolean
  startPromise: Promise<void> | null
}

class WhisperKitService {
  private servers: Map<string, ServerInstance> = new Map()
  private config: WhisperKitConfig
  private currentModelId: string
  private basePort: number = 50060

  constructor(config?: Partial<WhisperKitConfig>) {
    this.config = {
      host: '127.0.0.1',
      port: 50060,
      model: 'openai_whisper-base',
      verbose: false,
      ...config
    }
    this.currentModelId = this.config.model
  }

  /**
   * Get the path to the WhisperKit binary
   */
  private getWhisperKitPath(): { binaryPath: string; workingDir: string } {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

    if (isDev) {
      // Development: Use the cloned WhisperKit directory
      const workingDir = join(process.cwd(), 'WhisperKit')
      const binaryPath = join(workingDir, '.build', 'release', 'whisperkit-cli')
      
      return { binaryPath, workingDir }
    } else {
      // Production: Use bundled WhisperKit
      const workingDir = join(process.resourcesPath, 'whisperkit')
      const binaryPath = join(workingDir, 'whisperkit-cli')
      
      return { binaryPath, workingDir }
    }
  }

  /**
   * Get the path to a specific model
   * Checks Application Support first, then falls back to bundled location
   */
  private getModelPath(modelId: string): string {
    // For base model, always use bundled location
    if (modelId === 'openai_whisper-base') {
      const { workingDir } = this.getWhisperKitPath()
      return join(workingDir, 'Models', 'whisperkit-coreml', modelId)
    }

    // For other models, check Application Support directory first
    const appSupportPath = join(
      modelDownloadService.getModelsBasePath(),
      modelId
    )

    if (existsSync(appSupportPath)) {
      return appSupportPath
    }

    // Fallback to bundled location (for future bundled models)
    const { workingDir } = this.getWhisperKitPath()
    return join(workingDir, 'Models', 'whisperkit-coreml', modelId)
  }

  /**
   * Get a unique port for a model
   */
  private getPortForModel(modelId: string): number {
    // Base model always uses base port
    if (modelId === 'openai_whisper-base') {
      return this.basePort
    }
    // Other models use incremental ports
    const modelIndex = modelId.charCodeAt(0) % 100
    return this.basePort + 1 + modelIndex
  }

  /**
   * Check if WhisperKit is available
   */
  public isAvailable(): boolean {
    try {
      const { binaryPath } = this.getWhisperKitPath()
      return existsSync(binaryPath)
    } catch (error) {
      console.error('Error checking WhisperKit availability:', error)
      return false
    }
  }

  /**
   * Poll server readiness by attempting health checks
   */
  private async pollServerReadiness(
    modelId: string,
    port: number,
    resolve: () => void,
    reject: (error: Error) => void,
    attempt: number
  ): Promise<void> {
    const maxAttempts = 900 // 900 attempts = 900 seconds (15 minutes) max wait time
    const pollInterval = 1000 // 1 second between attempts

    if (attempt >= maxAttempts) {
      const error = new Error(`WhisperKit server for ${modelId} failed to become ready within 15 minutes`)
      console.error('[WhisperKit]', error.message)
      
      const server = this.servers.get(modelId)
      if (server) {
        server.startPromise = null
      }
      
      reject(error)
      return
    }

    try {
      // Try to connect to the server
      const url = `http://${this.config.host}:${port}`
      await axios.get(url, { 
        timeout: 2000,
        validateStatus: () => true // Accept any status code
      })
      
      // Server responded - it's ready!
      const server = this.servers.get(modelId)
      if (server) {
        server.isReady = true
        server.startPromise = null
      }
      
      console.log(
        `[WhisperKit] Server for ${modelId} ready at http://${this.config.host}:${port} (took ${attempt + 1} attempts)`
      )
      resolve()
    } catch (error) {
      // Server not ready yet, try again
      if (attempt % 5 === 0 && attempt > 0) {
        console.log(`[WhisperKit] Waiting for ${modelId} server... (attempt ${attempt + 1}/${maxAttempts})`)
      }
      
      setTimeout(() => {
        this.pollServerReadiness(modelId, port, resolve, reject, attempt + 1)
      }, pollInterval)
    }
  }

  /**
   * Start a WhisperKit server for a specific model
   */
  public async startServerForModel(modelId: string): Promise<void> {
    // Check if server already exists and is ready
    const existingServer = this.servers.get(modelId)
    if (existingServer?.isReady) {
      return Promise.resolve()
    }

    // If server is starting, wait for it
    if (existingServer?.startPromise) {
      return existingServer.startPromise
    }

    const port = this.getPortForModel(modelId)
    
    // Create placeholder server instance first to avoid circular reference
    const serverInstance: ServerInstance = {
      process: null as any,
      port,
      isReady: false,
      startPromise: null
    }
    this.servers.set(modelId, serverInstance)
    
    const startPromise = new Promise<void>((resolve, reject) => {
      try {
        const { binaryPath, workingDir } = this.getWhisperKitPath()

        if (!existsSync(binaryPath)) {
          const error = new Error(
            'WhisperKit binary not found. Please ensure WhisperKit is built and available.'
          )
          console.error(error.message)
          this.servers.delete(modelId)
          reject(error)
          return
        }

        console.log(`[WhisperKit] Starting server for model: ${modelId}`)
        console.log('[WhisperKit] Binary path:', binaryPath)
        console.log('[WhisperKit] Working directory:', workingDir)
        console.log('[WhisperKit] Port:', port)

        // Get model path (checks Application Support or bundled location)
        const modelPath = this.getModelPath(modelId)
        console.log('[WhisperKit] Model path:', modelPath)

        if (!existsSync(modelPath)) {
          const error = new Error(
            `Model not found at path: ${modelPath}. Please download the model first.`
          )
          console.error(error.message)
          this.servers.delete(modelId)
          reject(error)
          return
        }
        
        const args = [
          'serve',
          '--model-path',
          modelPath,
          '--host',
          this.config.host,
          '--port',
          port.toString()
        ]

        if (this.config.verbose) {
          args.push('--verbose')
        }

        const serverProcess = spawn(binaryPath, args, {
          cwd: workingDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env }
        })

        // Update server instance with actual process
        const server = this.servers.get(modelId)
        if (server) {
          server.process = serverProcess
        }

        serverProcess.stdout?.on('data', (data: Buffer) => {
          const output = data.toString()
          if (this.config.verbose) {
            console.log(`[WhisperKit ${modelId}]:`, output)
          }
        })

        serverProcess.stderr?.on('data', (data: Buffer) => {
          const error = data.toString()
          if (this.config.verbose) {
            console.error(`[WhisperKit ${modelId} Error]:`, error)
          }
        })

        serverProcess.on('error', (error) => {
          console.error(`[WhisperKit] Server process error for ${modelId}:`, error)
          this.servers.delete(modelId)
          reject(error)
        })

        serverProcess.on('exit', (code, signal) => {
          console.log(`[WhisperKit] Server for ${modelId} exited with code ${code} and signal ${signal}`)
          this.servers.delete(modelId)
        })

        // Wait a moment for server to start binding, then poll for readiness
        setTimeout(() => {
          this.pollServerReadiness(modelId, port, resolve, reject, 0)
        }, 2000)
      } catch (error) {
        console.error(`[WhisperKit] Failed to start server for ${modelId}:`, error)
        this.servers.delete(modelId)
        reject(error)
      }
    })

    // Update the server instance with the promise
    serverInstance.startPromise = startPromise

    return startPromise
  }

  /**
   * Start the WhisperKit local server for current model
   */
  public async startServer(): Promise<void> {
    return this.startServerForModel(this.currentModelId)
  }

  /**
   * Stop a specific server
   */
  private stopServerForModel(modelId: string): void {
    const server = this.servers.get(modelId)
    if (server) {
      console.log(`[WhisperKit] Stopping server for ${modelId}...`)
      server.process.kill('SIGTERM')
      this.servers.delete(modelId)
    }
  }

  /**
   * Stop all WhisperKit servers
   */
  public stopServer(): void {
    console.log('[WhisperKit] Stopping all servers...')
    for (const [modelId] of this.servers) {
      this.stopServerForModel(modelId)
    }
  }

  /**
   * Transcribe audio file using a specific model
   */
  public async transcribe(
    audioFilePath: string,
    options: TranscriptionOptions = {},
    modelId?: string
  ): Promise<TranscriptionResult> {
    const targetModelId = modelId || this.currentModelId
    const server = this.servers.get(targetModelId)

    // Ensure server is running
    if (!server?.isReady) {
      await this.startServerForModel(targetModelId)
    }

    const port = this.getPortForModel(targetModelId)

    try {
      const formData = new FormData()
      formData.append('file', createReadStream(audioFilePath))
      formData.append('model', targetModelId)

      if (options.language) {
        formData.append('language', options.language)
      }

      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString())
      }

      formData.append('response_format', 'verbose_json')

      const url = `http://${this.config.host}:${port}/v1/audio/transcriptions`

      console.log(`[WhisperKit] Sending transcription request to ${targetModelId}:`, url)

      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 60000 // 60 second timeout
      })

      console.log('[WhisperKit] Transcription response:', response.data)

      return {
        text: response.data.text || '',
        language: response.data.language,
        duration: response.data.duration
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`[WhisperKit] Transcription request failed for ${targetModelId}:`, {
          message: error.message,
          code: error.code,
          response: error.response?.data
        })
      } else {
        console.error(`[WhisperKit] Transcription failed for ${targetModelId}:`, error)
      }
      throw error
    }
  }

  /**
   * Check if a specific server is running and healthy (fast check)
   */
  public async healthCheck(modelId?: string): Promise<boolean> {
    const targetModelId = modelId || this.currentModelId
    const server = this.servers.get(targetModelId)
    
    if (!server?.isReady) {
      return false
    }

    const port = this.getPortForModel(targetModelId)

    try {
      const url = `http://${this.config.host}:${port}/health`
      await axios.get(url, { timeout: 500 })
      return true
    } catch (error) {
      // Health endpoint might not exist, try a simple connection test
      try {
        const url = `http://${this.config.host}:${port}`
        await axios.get(url, { timeout: 500 })
        return true
      } catch {
        return false
      }
    }
  }

  /**
   * Check if a server is ready without making a network request
   */
  public isServerReady(modelId?: string): boolean {
    const targetModelId = modelId || this.currentModelId
    const server = this.servers.get(targetModelId)
    return server?.isReady || false
  }

  /**
   * Get server status
   */
  public getStatus(): {
    isRunning: boolean
    isReady: boolean
    config: WhisperKitConfig
    currentModel: string
    servers: Map<string, { port: number; isReady: boolean }>
  } {
    const currentServer = this.servers.get(this.currentModelId)
    const serversStatus = new Map<string, { port: number; isReady: boolean }>()
    
    for (const [modelId, server] of this.servers) {
      serversStatus.set(modelId, {
        port: server.port,
        isReady: server.isReady
      })
    }

    return {
      isRunning: currentServer !== undefined,
      isReady: currentServer?.isReady || false,
      config: this.config,
      currentModel: this.currentModelId,
      servers: serversStatus
    }
  }

  /**
   * Switch to a different model
   * Starts a new server on a different port while keeping the old one running
   */
  public async switchModel(modelId: string): Promise<void> {
    console.log('[WhisperKit] Switching model to:', modelId)

    // Check if model exists
    const modelPath = this.getModelPath(modelId)
    if (!existsSync(modelPath)) {
      throw new Error(`Model ${modelId} is not installed. Please download it first.`)
    }

    // If already on this model and it's ready, do nothing
    if (this.currentModelId === modelId && this.servers.get(modelId)?.isReady) {
      console.log('[WhisperKit] Already on model:', modelId)
      return
    }

    const oldModelId = this.currentModelId
    
    // Update current model (but keep old server running)
    this.currentModelId = modelId
    this.config.model = modelId

    try {
      // Start server with new model (this will take time, but won't block)
      // The new server will run on a different port
      await this.startServerForModel(modelId)
      
      // New server is ready, stop old server if it's not the base model
      if (oldModelId !== 'openai_whisper-base' && oldModelId !== modelId) {
        console.log('[WhisperKit] New model ready, stopping old server:', oldModelId)
        this.stopServerForModel(oldModelId)
      }

      console.log('[WhisperKit] Model switched successfully to:', modelId)
    } catch (error) {
      // If new model fails, revert current model pointer
      console.error('[WhisperKit] Failed to switch model, reverting to:', oldModelId)
      this.currentModelId = oldModelId
      this.config.model = oldModelId
      
      throw error
    }
  }

  /**
   * Get the current model ID
   */
  public getCurrentModel(): string {
    return this.currentModelId
  }

  /**
   * Get list of available models (both bundled and downloaded)
   */
  public async getAvailableModels(): Promise<string[]> {
    const models: Set<string> = new Set()

    // Add bundled base model
    models.add('openai_whisper-base')

    // Add downloaded models
    const downloadedModels = await modelDownloadService.getInstalledModels()
    downloadedModels.forEach((model) => models.add(model))

    return Array.from(models)
  }
}

// Export singleton instance
export const whisperKitService = new WhisperKitService({
  model: 'openai_whisper-base', // Default to base model
  verbose: true
})

export default whisperKitService

