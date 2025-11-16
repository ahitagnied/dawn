import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'
import { existsSync } from 'fs'
import FormData from 'form-data'
import { createReadStream } from 'fs'
import axios from 'axios'

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

class WhisperKitService {
  private serverProcess: ChildProcess | null = null
  private config: WhisperKitConfig
  private isServerReady: boolean = false
  private serverStartPromise: Promise<void> | null = null

  constructor(config?: Partial<WhisperKitConfig>) {
    this.config = {
      host: '127.0.0.1',
      port: 50060,
      model: 'base',
      verbose: false,
      ...config
    }
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
   * Start the WhisperKit local server
   */
  public async startServer(): Promise<void> {
    // If server is already starting, wait for that promise
    if (this.serverStartPromise) {
      return this.serverStartPromise
    }

    // If server is already running, return immediately
    if (this.isServerReady && this.serverProcess) {
      return Promise.resolve()
    }

    this.serverStartPromise = new Promise<void>((resolve, reject) => {
      try {
        const { binaryPath, workingDir } = this.getWhisperKitPath()

        if (!existsSync(binaryPath)) {
          const error = new Error(
            'WhisperKit binary not found. Please ensure WhisperKit is built and available.'
          )
          console.error(error.message)
          this.serverStartPromise = null
          reject(error)
          return
        }

        console.log('[WhisperKit] Starting server...')
        console.log('[WhisperKit] Binary path:', binaryPath)
        console.log('[WhisperKit] Working directory:', workingDir)
        console.log('[WhisperKit] Model:', this.config.model)

        // Model path should point to the local model directory
        const modelPath = join(workingDir, 'Models', 'whisperkit-coreml', this.config.model)
        console.log('[WhisperKit] Model path:', modelPath)
        
        const args = [
          'serve',
          '--model-path',
          modelPath,
          '--host',
          this.config.host,
          '--port',
          this.config.port.toString()
        ]

        if (this.config.verbose) {
          args.push('--verbose')
        }

        this.serverProcess = spawn(binaryPath, args, {
          cwd: workingDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env }
        })

        let serverOutput = ''

        this.serverProcess.stdout?.on('data', (data: Buffer) => {
          const output = data.toString()
          serverOutput += output
          if (this.config.verbose) {
            console.log('[WhisperKit Server]:', output)
          }

          // Check if server is ready (look for typical server startup messages)
          if (
            output.includes('Server running') ||
            output.includes('listening') ||
            output.includes(`${this.config.port}`)
          ) {
            if (!this.isServerReady) {
              this.isServerReady = true
              console.log(
                `[WhisperKit] Server ready at http://${this.config.host}:${this.config.port}`
              )
              resolve()
            }
          }
        })

        this.serverProcess.stderr?.on('data', (data: Buffer) => {
          const error = data.toString()
          console.error('[WhisperKit Server Error]:', error)
          
          // Some servers log startup info to stderr, check for ready state
          if (
            error.includes('Server running') ||
            error.includes('listening') ||
            error.includes(`${this.config.port}`)
          ) {
            if (!this.isServerReady) {
              this.isServerReady = true
              console.log(
                `[WhisperKit] Server ready at http://${this.config.host}:${this.config.port}`
              )
              resolve()
            }
          }
        })

        this.serverProcess.on('error', (error) => {
          console.error('[WhisperKit] Server process error:', error)
          this.isServerReady = false
          this.serverStartPromise = null
          reject(error)
        })

        this.serverProcess.on('exit', (code, signal) => {
          console.log(`[WhisperKit] Server exited with code ${code} and signal ${signal}`)
          this.isServerReady = false
          this.serverProcess = null
          this.serverStartPromise = null
        })

        // Timeout fallback: assume server is ready after 5 seconds if no explicit ready message
        setTimeout(() => {
          if (!this.isServerReady) {
            console.log('[WhisperKit] Server startup timeout - assuming ready')
            this.isServerReady = true
            resolve()
          }
        }, 5000)
      } catch (error) {
        console.error('[WhisperKit] Failed to start server:', error)
        this.serverStartPromise = null
        reject(error)
      }
    })

    return this.serverStartPromise
  }

  /**
   * Stop the WhisperKit server
   */
  public stopServer(): void {
    if (this.serverProcess) {
      console.log('[WhisperKit] Stopping server...')
      this.serverProcess.kill('SIGTERM')
      this.serverProcess = null
      this.isServerReady = false
      this.serverStartPromise = null
    }
  }

  /**
   * Transcribe audio file using the local WhisperKit server
   */
  public async transcribe(
    audioFilePath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    // Ensure server is running
    if (!this.isServerReady) {
      await this.startServer()
    }

    try {
      const formData = new FormData()
      formData.append('file', createReadStream(audioFilePath))
      formData.append('model', this.config.model)

      if (options.language) {
        formData.append('language', options.language)
      }

      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString())
      }

      formData.append('response_format', 'verbose_json')

      const url = `http://${this.config.host}:${this.config.port}/v1/audio/transcriptions`

      console.log('[WhisperKit] Sending transcription request to:', url)

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
        console.error('[WhisperKit] Transcription request failed:', {
          message: error.message,
          code: error.code,
          response: error.response?.data
        })
      } else {
        console.error('[WhisperKit] Transcription failed:', error)
      }
      throw error
    }
  }

  /**
   * Check if the server is running and healthy
   */
  public async healthCheck(): Promise<boolean> {
    if (!this.isServerReady) {
      return false
    }

    try {
      const url = `http://${this.config.host}:${this.config.port}/health`
      await axios.get(url, { timeout: 2000 })
      return true
    } catch (error) {
      // Health endpoint might not exist, try a simple connection test
      try {
        const url = `http://${this.config.host}:${this.config.port}`
        await axios.get(url, { timeout: 2000 })
        return true
      } catch {
        return false
      }
    }
  }

  /**
   * Get server status
   */
  public getStatus(): {
    isRunning: boolean
    isReady: boolean
    config: WhisperKitConfig
  } {
    return {
      isRunning: this.serverProcess !== null,
      isReady: this.isServerReady,
      config: this.config
    }
  }
}

// Export singleton instance
export const whisperKitService = new WhisperKitService({
  model: 'openai_whisper-base', // This matches the downloaded model folder name
  verbose: true
})

export default whisperKitService

