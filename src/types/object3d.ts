import type { mat4, vec3, vec4 } from "gl-matrix"

export type Object3DGeometry = {
  vertexBuffer: WebGLBuffer
  indexBuffer: WebGLBuffer
  indexCount: number
  vao: WebGLVertexArrayObject | null
}

export type Object3DOptions = {
  id: number
  vertexBuffer: WebGLBuffer
  mode: number
  indexCount: number
  indexBuffer?: WebGLVertexArrayObject | null
  vao?: WebGLVertexArrayObject | null
}
