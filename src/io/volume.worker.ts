/**
 * Web Worker for volume data fetching and processing
 * Handles CPU-intensive operations in background thread
 */

import type { VolumeWorkerRequest, VolumeWorkerResponse } from "../types"

// Worker message handler
self.onmessage = async (event: MessageEvent<VolumeWorkerRequest>) => {
  const { id, type, payload } = event.data

  try {
    switch (type) {
      case "fetch": {
        const url = payload.url
        if (!url) {
          throw new Error("URL is required for fetch operation")
        }
        const response = await fetch(url as string)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch volume: ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        
        // Try to use SharedArrayBuffer if available
        let data: ArrayBuffer | SharedArrayBuffer
        let isShared = false
        
        if (typeof SharedArrayBuffer !== "undefined") {
          try {
            // Create SharedArrayBuffer and copy data
            const sharedBuffer = new SharedArrayBuffer(arrayBuffer.byteLength)
            const sharedView = new Uint8Array(sharedBuffer)
            sharedView.set(new Uint8Array(arrayBuffer))
            data = sharedBuffer
            isShared = true
          } catch (e) {
            // SharedArrayBuffer might not be available or might fail
            // Fall back to regular ArrayBuffer
            data = arrayBuffer
          }
        } else {
          data = arrayBuffer
        }

        const responseMsg: VolumeWorkerResponse = {
          id,
          type: "fetch_complete",
          payload: {
            data,
            isShared,
            byteLength: data.byteLength,
          },
        }

        // Transfer ArrayBuffer if not shared (zero-copy transfer)
        if (isShared) {
          self.postMessage(responseMsg)
        } else {
          self.postMessage(responseMsg, [data as ArrayBuffer])
        }
        break
      }

      case "parse": {
        const { data, format } = payload
        
        // Placeholder for future parsing logic
        // Will handle NIfTI, DICOM, etc. parsing here
        
        const responseMsg: VolumeWorkerResponse = {
          id,
          type: "parse_complete",
          payload: {
            success: true,
          },
        }
        
        self.postMessage(responseMsg)
        break
      }

      case "process": {
        const { data, operation } = payload
        
        // Placeholder for future CPU-intensive operations
        // Will handle transformations, filtering, etc.
        
        const responseMsg: VolumeWorkerResponse = {
          id,
          type: "process_complete",
          payload: {
            success: true,
          },
        }
        
        self.postMessage(responseMsg)
        break
      }

      default: {
        throw new Error(`Unknown worker message type: ${type}`)
      }
    }
  } catch (error) {
    const errorMsg: VolumeWorkerResponse = {
      id,
      type: "error",
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    }
    self.postMessage(errorMsg)
  }
}

// Signal that worker is ready
self.postMessage({ type: "ready" })

