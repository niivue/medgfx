/**
 * Type definitions for web worker communication
 */

export type VolumeWorkerRequestType = "fetch" | "parse" | "process"
export type VolumeWorkerResponseType = "ready" | "fetch_complete" | "parse_complete" | "process_complete" | "error"

export interface VolumeWorkerRequest {
  id: string
  type: VolumeWorkerRequestType
  payload: {
    url?: string
    data?: ArrayBuffer | SharedArrayBuffer
    format?: string
    operation?: string
    [key: string]: unknown
  }
}

export interface VolumeWorkerResponse {
  id?: string
  type: VolumeWorkerResponseType
  payload?: {
    data?: ArrayBuffer | SharedArrayBuffer
    isShared?: boolean
    byteLength?: number
    success?: boolean
    error?: string
    [key: string]: unknown
  }
}

