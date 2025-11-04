import type { VolumeWorkerRequest, VolumeWorkerResponse } from "../types"
import type { TypedNumberArray } from "../types/utils"
import { logger } from "../logger"

export type VolumeOptions = {
  name?: string
  id?: string
  url?: string
  min?: number // global_min from niivue
  max?: number // global_max from niivue
  windowWidth?: number
  windowCenter?: number
  dims?: number[]
  pixDims?: number[]
  img?: TypedNumberArray
  workerUrl?: string // Optional custom worker URL
}

/**
 * Handles loading, saving, and manipulating volume based imaging formats
 * Uses web workers for efficient data fetching and CPU-intensive operations
 * Leverages SharedArrayBuffer when available for zero-copy data sharing
 */
export class Volume {
  name?: string
  id?: string
  url?: string
  min?: number // global_min from niivue
  max?: number // global_max from niivue
  windowWidth?: number
  windowCenter?: number
  dims?: number[]
  pixDims?: number[]
  img?: TypedNumberArray
  
  private worker?: Worker
  private workerReady: boolean = false
  private pendingRequests: Map<string, {
    resolve: (value: any) => void
    reject: (reason?: any) => void
  }> = new Map()
  private requestIdCounter: number = 0
  private rawData?: ArrayBuffer | SharedArrayBuffer
  private isSharedBuffer: boolean = false

  constructor(dataSource: string | ArrayBuffer, options?: VolumeOptions) {
    if (typeof dataSource === 'string') {
      this.url = dataSource
    } else {
      // Store the ArrayBuffer for future parsing
      this.rawData = dataSource
    }
    
    // Apply options if provided
    if (options) {
      Object.assign(this, options)
    }

    // Initialize worker
    this.initWorker(options?.workerUrl)
  }

  /**
   * Initialize the web worker
   */
  private initWorker(workerUrl?: string): void {
    try {
      // Use provided worker URL or default to bundled worker
      const url = workerUrl || new URL('./volume.worker.ts', import.meta.url).href
      this.worker = new Worker(url, { type: 'module' })
      
      this.worker.onmessage = (event: MessageEvent<VolumeWorkerResponse>) => {
        this.handleWorkerMessage(event.data)
      }

      this.worker.onerror = (error) => {
        logger.error({ error: error.message }, 'Volume worker error')
      }

      logger.debug('Volume worker initialized')
    } catch (error) {
      logger.error({ error }, 'Failed to initialize volume worker')
      throw error
    }
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(response: VolumeWorkerResponse): void {
    if (response.type === 'ready') {
      this.workerReady = true
      logger.debug('Volume worker ready')
      return
    }

    if (response.type === 'error') {
      const id = response.id
      if (id) {
        const request = this.pendingRequests.get(id)
        if (request) {
          request.reject(new Error(response.payload?.error || 'Unknown worker error'))
          this.pendingRequests.delete(id)
        }
      }
      logger.error({ error: response.payload?.error }, 'Worker error response')
      return
    }

    const id = response.id
    if (!id) {
      logger.warn('Received worker response without ID')
      return
    }

    const request = this.pendingRequests.get(id)
    if (!request) {
      logger.warn({ id }, 'Received response for unknown request ID')
      return
    }

    request.resolve(response)
    this.pendingRequests.delete(id)
  }

  /**
   * Send a request to the worker and wait for response
   */
  private async sendWorkerRequest<T = any>(
    type: VolumeWorkerRequest['type'],
    payload: VolumeWorkerRequest['payload'],
    transfer?: Transferable[]
  ): Promise<T> {
    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    // Wait for worker to be ready
    if (!this.workerReady) {
      await new Promise<void>((resolve) => {
        const checkReady = setInterval(() => {
          if (this.workerReady) {
            clearInterval(checkReady)
            resolve()
          }
        }, 10)
      })
    }

    return new Promise((resolve, reject) => {
      const id = `req_${this.requestIdCounter++}`
      this.pendingRequests.set(id, { resolve, reject })

      const request: VolumeWorkerRequest = { id, type, payload }

      if (transfer && transfer.length > 0) {
        this.worker!.postMessage(request, transfer)
      } else {
        this.worker!.postMessage(request)
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Worker request timeout'))
        }
      }, 30000)
    })
  }

  /**
   * Fetch volume data from URL using worker
   */
  async fetchData(): Promise<void> {
    if (!this.url) {
      throw new Error('No URL specified for volume')
    }

    logger.info({ url: this.url }, 'Fetching volume data in worker')

    try {
      const response = await this.sendWorkerRequest<VolumeWorkerResponse>(
        'fetch',
        { url: this.url }
      )

      if (response.payload?.data) {
        this.rawData = response.payload.data
        this.isSharedBuffer = response.payload.isShared || false
        
        logger.info({
          byteLength: response.payload.byteLength,
          isShared: this.isSharedBuffer
        }, 'Volume data fetched successfully')
      }
    } catch (error) {
      logger.error({ error, url: this.url }, 'Failed to fetch volume data')
      throw error
    }
  }

  /**
   * Parse volume data using worker
   */
  async parseData(format: string = 'nifti'): Promise<void> {
    if (!this.rawData) {
      throw new Error('No raw data to parse')
    }

    logger.info({ format }, 'Parsing volume data in worker')

    try {
      await this.sendWorkerRequest('parse', {
        data: this.rawData,
        format
      })

      logger.info('Volume data parsed successfully')
    } catch (error) {
      logger.error({ error, format }, 'Failed to parse volume data')
      throw error
    }
  }

  /**
   * Process volume data using worker (e.g., filtering, transformations)
   */
  async processData(operation: string): Promise<void> {
    if (!this.rawData) {
      throw new Error('No raw data to process')
    }

    logger.info({ operation }, 'Processing volume data in worker')

    try {
      await this.sendWorkerRequest('process', {
        data: this.rawData,
        operation
      })

      logger.info('Volume data processed successfully')
    } catch (error) {
      logger.error({ error, operation }, 'Failed to process volume data')
      throw error
    }
  }

  /**
   * Get the raw data buffer (SharedArrayBuffer or ArrayBuffer)
   */
  getRawData(): ArrayBuffer | SharedArrayBuffer | undefined {
    return this.rawData
  }

  /**
   * Check if using SharedArrayBuffer for data
   */
  isUsingSharedBuffer(): boolean {
    return this.isSharedBuffer
  }

  /**
   * Terminate the worker and clean up resources
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = undefined
      this.workerReady = false
      this.pendingRequests.clear()
      logger.debug('Volume worker terminated')
    }
  }
}