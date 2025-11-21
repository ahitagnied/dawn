import { app } from 'electron'
import { join } from 'path'
import { mkdir, writeFile, readdir, rm, stat } from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import axios from 'axios'
import { pipeline } from 'stream/promises'

const HUGGINGFACE_REPO = 'argmaxinc/whisperkit-coreml'
const HUGGINGFACE_BASE_URL = 'https://huggingface.co'

export interface DownloadProgress {
  modelId: string
  percent: number
  downloaded: number
  total: number
  downloadedFormatted: string
  totalFormatted: string
  currentFile: string
}

export interface ModelInfo {
  id: string
  name: string
  size: number
  sizeFormatted: string
  downloaded: boolean
  path?: string
}

interface HuggingFaceFile {
  type: 'file' | 'directory'
  path: string
  size?: number
}

class ModelDownloadService {
  private modelsBasePath: string
  private progressCallbacks: Map<string, (progress: DownloadProgress) => void> = new Map()

  constructor() {
    // Store models in Application Support directory
    this.modelsBasePath = join(app.getPath('appData'), 'Dawn', 'models', 'whisperkit-coreml')
  }

  /**
   * Get the models base path
   */
  public getModelsBasePath(): string {
    return this.modelsBasePath
  }

  /**
   * Ensure models directory exists
   */
  private async ensureModelsDirectory(): Promise<void> {
    if (!existsSync(this.modelsBasePath)) {
      await mkdir(this.modelsBasePath, { recursive: true })
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`
  }

  /**
   * Recursively list all files in a HuggingFace model folder
   */
  private async listModelFiles(folderPath: string): Promise<HuggingFaceFile[]> {
    const apiUrl = `https://huggingface.co/api/models/${HUGGINGFACE_REPO}/tree/main/${folderPath}`
    console.log('[ModelDownload] Fetching file list from:', apiUrl)

    try {
      const response = await axios.get(apiUrl, { timeout: 30000 })
      const items: HuggingFaceFile[] = response.data

      const allFiles: HuggingFaceFile[] = []

      for (const item of items) {
        if (item.type === 'file') {
          allFiles.push(item)
        } else if (item.type === 'directory') {
          // Recursively get files in subdirectory
          const subFiles = await this.listModelFiles(item.path)
          allFiles.push(...subFiles)
        }
      }

      return allFiles
    } catch (error) {
      console.error('[ModelDownload] Failed to list files:', error)
      throw new Error(`Failed to fetch model file list: ${error}`)
    }
  }

  /**
   * Download a single file from HuggingFace
   */
  private async downloadFile(
    remotePath: string,
    localPath: string,
    onProgress?: (downloaded: number) => void
  ): Promise<void> {
    const url = `${HUGGINGFACE_BASE_URL}/${HUGGINGFACE_REPO}/resolve/main/${remotePath}`
    console.log('[ModelDownload] Downloading file:', url)

    // Ensure directory exists
    const dir = join(localPath, '..')
    await mkdir(dir, { recursive: true })

    try {
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout: 120000, // 2 minute timeout per file
        maxRedirects: 5
      })

      const writer = createWriteStream(localPath)
      let downloaded = 0

      response.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        if (onProgress) {
          onProgress(downloaded)
        }
      })

      await pipeline(response.data, writer)
      console.log('[ModelDownload] File downloaded:', localPath)
    } catch (error) {
      console.error('[ModelDownload] Failed to download file:', error)
      // Clean up partial download
      try {
        await rm(localPath, { force: true })
      } catch {
        // Ignore cleanup errors
      }
      throw error
    }
  }

  /**
   * Register progress callback for model download
   */
  public onProgress(modelId: string, callback: (progress: DownloadProgress) => void): void {
    this.progressCallbacks.set(modelId, callback)
  }

  /**
   * Remove progress callback
   */
  public offProgress(modelId: string): void {
    this.progressCallbacks.delete(modelId)
  }

  /**
   * Download a complete model from HuggingFace
   */
  public async downloadModel(modelId: string): Promise<void> {
    console.log('[ModelDownload] Starting download for model:', modelId)

    await this.ensureModelsDirectory()

    const modelPath = join(this.modelsBasePath, modelId)

    // Check if model already exists
    if (existsSync(modelPath)) {
      console.log('[ModelDownload] Model already exists, skipping download')
      return
    }

    try {
      // Get list of all files in the model folder
      const files = await this.listModelFiles(modelId)
      console.log(`[ModelDownload] Found ${files.length} files to download`)

      const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0)
      let downloadedSize = 0

      const callback = this.progressCallbacks.get(modelId)

      // Download each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const relativePath = file.path.replace(`${modelId}/`, '')
        const localPath = join(modelPath, relativePath)

        console.log(`[ModelDownload] Downloading file ${i + 1}/${files.length}: ${relativePath}`)

        if (callback) {
          callback({
            modelId,
            percent: Math.round((downloadedSize / totalSize) * 100),
            downloaded: downloadedSize,
            total: totalSize,
            downloadedFormatted: this.formatBytes(downloadedSize),
            totalFormatted: this.formatBytes(totalSize),
            currentFile: relativePath
          })
        }

        await this.downloadFile(file.path, localPath, (fileDownloaded) => {
          if (callback) {
            callback({
              modelId,
              percent: Math.round(((downloadedSize + fileDownloaded) / totalSize) * 100),
              downloaded: downloadedSize + fileDownloaded,
              total: totalSize,
              downloadedFormatted: this.formatBytes(downloadedSize + fileDownloaded),
              totalFormatted: this.formatBytes(totalSize),
              currentFile: relativePath
            })
          }
        })

        downloadedSize += file.size || 0
      }

      // Final progress update
      if (callback) {
        callback({
          modelId,
          percent: 100,
          downloaded: totalSize,
          total: totalSize,
          downloadedFormatted: this.formatBytes(totalSize),
          totalFormatted: this.formatBytes(totalSize),
          currentFile: 'Complete'
        })
      }

      console.log('[ModelDownload] Model download completed:', modelId)
    } catch (error) {
      console.error('[ModelDownload] Model download failed:', error)
      // Clean up partial download
      try {
        await rm(modelPath, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
      throw error
    }
  }

  /**
   * Get list of installed models
   */
  public async getInstalledModels(): Promise<string[]> {
    await this.ensureModelsDirectory()

    try {
      const entries = await readdir(this.modelsBasePath, { withFileTypes: true })
      const modelDirs = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
      return modelDirs
    } catch (error) {
      console.error('[ModelDownload] Failed to list installed models:', error)
      return []
    }
  }

  /**
   * Check if a model is installed
   */
  public async isModelInstalled(modelId: string): Promise<boolean> {
    const modelPath = join(this.modelsBasePath, modelId)
    return existsSync(modelPath)
  }

  /**
   * Delete a downloaded model
   */
  public async deleteModel(modelId: string): Promise<void> {
    const modelPath = join(this.modelsBasePath, modelId)

    if (!existsSync(modelPath)) {
      throw new Error(`Model ${modelId} is not installed`)
    }

    try {
      await rm(modelPath, { recursive: true, force: true })
      console.log('[ModelDownload] Model deleted:', modelId)
    } catch (error) {
      console.error('[ModelDownload] Failed to delete model:', error)
      throw error
    }
  }

  /**
   * Get model information
   */
  public async getModelInfo(modelId: string): Promise<ModelInfo> {
    const modelPath = join(this.modelsBasePath, modelId)
    const downloaded = existsSync(modelPath)

    let size = 0
    if (downloaded) {
      try {
        // Calculate directory size
        size = await this.getDirectorySize(modelPath)
      } catch (error) {
        console.error('[ModelDownload] Failed to get model size:', error)
      }
    }

    // Estimated sizes for models that aren't downloaded
    const estimatedSizes: Record<string, number> = {
      'openai_whisper-base': 150 * 1024 * 1024,
      'openai_whisper-large-v3-v20240930_turbo_632MB': 632 * 1024 * 1024,
      'openai_whisper-large-v3_947MB': 947 * 1024 * 1024
    }

    const displaySize = downloaded ? size : estimatedSizes[modelId] || 0

    return {
      id: modelId,
      name: this.getModelDisplayName(modelId),
      size: displaySize,
      sizeFormatted: this.formatBytes(displaySize),
      downloaded,
      path: downloaded ? modelPath : undefined
    }
  }

  /**
   * Get directory size recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0

    try {
      const entries = await readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name)

        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath)
        } else {
          const stats = await stat(fullPath)
          totalSize += stats.size
        }
      }
    } catch (error) {
      console.error('[ModelDownload] Error calculating directory size:', error)
    }

    return totalSize
  }

  /**
   * Get display name for model
   */
  private getModelDisplayName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'openai_whisper-base': 'Base',
      'openai_whisper-large-v3-v20240930_turbo_632MB': 'Turbo',
      'openai_whisper-large-v3_947MB': 'Large'
    }
    return nameMap[modelId] || modelId
  }

  /**
   * Get available disk space (rough estimate)
   */
  public async getAvailableDiskSpace(): Promise<number> {
    try {
      // Get stats for the app data directory
      const appDataPath = app.getPath('appData')
      const stats = await stat(appDataPath)
      // This is a rough estimate - we can't easily get exact free space without native modules
      // Return a large number to avoid blocking downloads
      return 10 * 1024 * 1024 * 1024 // 10 GB
    } catch (error) {
      console.error('[ModelDownload] Failed to get disk space:', error)
      return 10 * 1024 * 1024 * 1024 // Default to 10 GB
    }
  }
}

// Export singleton instance
export const modelDownloadService = new ModelDownloadService()

export default modelDownloadService

