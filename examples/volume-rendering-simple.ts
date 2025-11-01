/**
 * Simple Volume Rendering Example
 * Demonstrates basic usage of VolumeRenderer with Three.js
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { VolumeRenderer } from '../src/rendering/volume-renderer'
import { colortables } from '../src/colortables'

// Create canvas
const canvas = document.createElement('canvas')
canvas.style.width = '100%'
canvas.style.height = '100%'
canvas.style.display = 'block'
document.body.appendChild(canvas)

// Setup Three.js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(1.5, 1.5, 1.5)
camera.lookAt(0, 0, 0)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

// Create synthetic volume data (sphere with noise)
function createSphereVolume(size: number): Uint8Array {
  const data = new Uint8Array(size * size * size)
  const center = size / 2
  const radius = size / 3

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - center
        const dy = y - center
        const dz = z - center
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        let value = 0
        if (dist < radius) {
          // Sphere with smooth falloff
          const normalized = 1 - dist / radius
          // Add some noise for texture
          const noise = Math.random() * 0.2 - 0.1
          value = Math.floor(255 * Math.max(0, Math.min(1, normalized + noise)))
        }

        const index = x + y * size + z * size * size
        data[index] = value
      }
    }
  }

  return data
}

// Initialize volume
const volumeSize = 128
const volumeData = createSphereVolume(volumeSize)

const volumeRenderer = new VolumeRenderer({
  width: volumeSize,
  height: volumeSize,
  depth: volumeSize,
  data: volumeData,
  samplesPerVoxel: 2.0,
  alphaCorrection: 1.5
})

// Apply a colormap (using medgfx colortables)
const hotLUT = colortables.colormap('hot')
volumeRenderer.setColormap(hotLUT)

// Set intensity window
volumeRenderer.setIntensityWindow({
  min: 0.2,
  max: 1.0
})

// Add to scene
const volumeMesh = volumeRenderer.getMesh()
scene.add(volumeMesh)

// Optional: Add bounding box wireframe for reference
const boxGeometry = new THREE.BoxGeometry(
  volumeSize / volumeSize,
  volumeSize / volumeSize,
  volumeSize / volumeSize
)
const boxEdges = new THREE.EdgesGeometry(boxGeometry)
const boxLine = new THREE.LineSegments(
  boxEdges,
  new THREE.LineBasicMaterial({ color: 0x444444 })
)
scene.add(boxLine)

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Animation loop
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

animate()

// Log info
console.log('Volume Rendering Example')
console.log('- Drag to rotate')
console.log('- Scroll to zoom')
console.log('- Volume size:', volumeSize)
console.log('- Available colormaps:', colortables.colormaps())
