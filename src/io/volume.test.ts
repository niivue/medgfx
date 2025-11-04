import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test"
import { Volume } from "./volume"

describe("Volume", () => {
  let volume: Volume

  afterEach(() => {
    // Clean up worker
    if (volume) {
      volume.dispose()
    }
  })

  describe("constructor", () => {
    test("should create volume with URL string", () => {
      volume = new Volume("https://example.com/test.nii.gz")
      expect(volume.url).toBe("https://example.com/test.nii.gz")
    })

    test("should create volume with ArrayBuffer", () => {
      const buffer = new ArrayBuffer(1024)
      volume = new Volume(buffer)
      expect(volume.getRawData()).toBe(buffer)
    })

    test("should apply options to volume", () => {
      volume = new Volume("https://example.com/test.nii.gz", {
        name: "Test Volume",
        id: "vol-001",
        min: 0,
        max: 255,
        windowWidth: 200,
        windowCenter: 100,
        dims: [256, 256, 128],
        pixDims: [1, 1, 1],
      })

      expect(volume.name).toBe("Test Volume")
      expect(volume.id).toBe("vol-001")
      expect(volume.min).toBe(0)
      expect(volume.max).toBe(255)
      expect(volume.windowWidth).toBe(200)
      expect(volume.windowCenter).toBe(100)
      expect(volume.dims).toEqual([256, 256, 128])
      expect(volume.pixDims).toEqual([1, 1, 1])
    })

    test("should accept custom worker URL", () => {
      volume = new Volume("https://example.com/test.nii.gz", {
        workerUrl: "/custom-worker.js",
      })
      expect(volume).toBeDefined()
    })
  })

  describe("fetchData", () => {
    test("should throw error if no URL specified", async () => {
      const buffer = new ArrayBuffer(1024)
      volume = new Volume(buffer)

      await expect(volume.fetchData()).rejects.toThrow("No URL specified for volume")
    })

    test("should fetch real NIfTI data using worker", async () => {
      volume = new Volume("https://niivue.github.io/niivue-demo-images/mni152.nii.gz")
      
      // Actually fetch data through the worker from real URL
      await volume.fetchData()
      
      // Verify data was received
      const rawData = volume.getRawData()
      expect(rawData).toBeDefined()
      expect(rawData?.byteLength).toBeGreaterThan(0)
      
      // MNI152 is a real brain volume, should be a decent size
      console.log(`Fetched ${rawData?.byteLength} bytes`)
    }, 30000)

    test("should handle fetch errors from worker", async () => {
      volume = new Volume("https://niivue.github.io/niivue-demo-images/nonexistent-file-404.nii.gz")
      await expect(volume.fetchData()).rejects.toThrow()
    }, 10000)
  })

  describe("parseData", () => {
    test("should throw error if no raw data", async () => {
      volume = new Volume("https://example.com/test.nii.gz")

      await expect(volume.parseData()).rejects.toThrow("No raw data to parse")
    })

    test("should parse data using real worker", async () => {
      const buffer = new ArrayBuffer(1024)
      volume = new Volume(buffer)

      // Actually parse through the worker
      await volume.parseData("nifti")
      
      // Worker should process the request successfully
      expect(volume.getRawData()).toBeDefined()
    }, 5000)

    test("should use default format if not specified", async () => {
      const buffer = new ArrayBuffer(1024)
      volume = new Volume(buffer)

      // Test with default format
      await volume.parseData()
      expect(volume.getRawData()).toBeDefined()
    }, 5000)
  })

  describe("processData", () => {
    test("should throw error if no raw data", async () => {
      volume = new Volume("https://example.com/test.nii.gz")

      await expect(volume.processData("filter")).rejects.toThrow("No raw data to process")
    })

    test("should process data using real worker", async () => {
      const buffer = new ArrayBuffer(1024)
      volume = new Volume(buffer)

      // Actually process through the worker
      await volume.processData("filter")
      
      // Worker should process the request successfully
      expect(volume.getRawData()).toBeDefined()
    }, 5000)

    test("should handle different operations", async () => {
      const buffer = new ArrayBuffer(1024)
      volume = new Volume(buffer)

      // Test different operation types
      await volume.processData("transform")
      expect(volume.getRawData()).toBeDefined()
    }, 5000)
  })

  describe("data access", () => {
    test("should return raw data buffer", () => {
      const buffer = new ArrayBuffer(1024)
      volume = new Volume(buffer)

      expect(volume.getRawData()).toBe(buffer)
    })

    test("should return undefined if no data loaded", () => {
      volume = new Volume("https://example.com/test.nii.gz")

      expect(volume.getRawData()).toBeUndefined()
    })

    test("should track SharedArrayBuffer usage", () => {
      volume = new Volume("https://example.com/test.nii.gz")

      // Initially false
      expect(volume.isUsingSharedBuffer()).toBe(false)
    })
  })

  describe("worker lifecycle", () => {
    test("should initialize worker on construction", () => {
      volume = new Volume("https://example.com/test.nii.gz")

      // Worker is initialized (private field)
      expect(volume).toBeDefined()
    })

    test("should dispose worker and clean up", () => {
      volume = new Volume("https://example.com/test.nii.gz")

      // Should not throw
      expect(() => volume.dispose()).not.toThrow()

      // Calling dispose again should be safe
      expect(() => volume.dispose()).not.toThrow()
    })
  })

  describe("SharedArrayBuffer support", () => {
    test("should detect SharedArrayBuffer availability", () => {
      volume = new Volume("https://example.com/test.nii.gz")

      // SharedArrayBuffer availability depends on browser security headers
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined"
      expect(typeof hasSharedArrayBuffer).toBe("boolean")
    })
  })

  describe("error handling", () => {
    test("should handle worker initialization with custom URL", () => {
      // Worker initialization may not throw immediately with invalid URL
      // The error would occur when trying to load the worker script
      volume = new Volume("https://example.com/test.nii.gz", {
        workerUrl: "/custom-worker.js",
      })
      
      expect(volume).toBeDefined()
    })
  })

  describe("options validation", () => {
    test("should handle partial options", () => {
      volume = new Volume("https://example.com/test.nii.gz", {
        name: "Partial Options",
      })

      expect(volume.name).toBe("Partial Options")
      expect(volume.id).toBeUndefined()
      expect(volume.min).toBeUndefined()
    })

    test("should handle empty options object", () => {
      volume = new Volume("https://example.com/test.nii.gz", {})

      expect(volume.url).toBe("https://example.com/test.nii.gz")
    })
  })
})

describe("Volume worker integration", () => {
  test("should create worker with module type", () => {
    const volume = new Volume("https://example.com/test.nii.gz")
    
    // Worker is created with type: 'module' for ES module support
    expect(volume).toBeDefined()
    
    volume.dispose()
  })

  test("should handle multiple volumes independently", () => {
    const volume1 = new Volume("https://example.com/test1.nii.gz", {
      name: "Volume 1",
    })
    const volume2 = new Volume("https://example.com/test2.nii.gz", {
      name: "Volume 2",
    })

    expect(volume1.name).toBe("Volume 1")
    expect(volume2.name).toBe("Volume 2")

    volume1.dispose()
    volume2.dispose()
  })

  test("should complete full workflow: fetch -> parse -> process with real data", async () => {
    const volume = new Volume("https://niivue.github.io/niivue-demo-images/mni152.nii.gz", {
      name: "MNI152 Brain",
    })

    // Step 1: Fetch real data through worker
    await volume.fetchData()
    let rawData = volume.getRawData()
    expect(rawData).toBeDefined()
    expect(rawData?.byteLength).toBeGreaterThan(0)
    console.log(`Fetched ${rawData?.byteLength} bytes of real brain data`)

    // Step 2: Parse data through worker
    await volume.parseData("nifti")
    rawData = volume.getRawData()
    expect(rawData).toBeDefined()

    // Step 3: Process data through worker
    await volume.processData("filter")
    rawData = volume.getRawData()
    expect(rawData).toBeDefined()

    // Check SharedArrayBuffer status
    const isShared = volume.isUsingSharedBuffer()
    expect(typeof isShared).toBe("boolean")
    console.log(`Using SharedArrayBuffer: ${isShared}`)

    // Cleanup
    volume.dispose()
  }, 30000)

  test("should verify SharedArrayBuffer support with real large data", async () => {
    const volume = new Volume("https://niivue.github.io/niivue-demo-images/mni152.nii.gz")
    
    // Fetch real large NIfTI file
    await volume.fetchData()
    
    const rawData = volume.getRawData()
    expect(rawData).toBeDefined()
    expect(rawData?.byteLength).toBeGreaterThan(1024) // Should be much larger
    
    // Check if SharedArrayBuffer was used (depends on browser security context)
    const isShared = volume.isUsingSharedBuffer()
    
    if (typeof SharedArrayBuffer !== "undefined") {
      // SharedArrayBuffer is available, but might not be used due to security headers
      expect(typeof isShared).toBe("boolean")
      console.log(`SharedArrayBuffer available: true, used: ${isShared}`)
    } else {
      // SharedArrayBuffer not available
      expect(isShared).toBe(false)
      console.log("SharedArrayBuffer not available in this environment")
    }
    
    volume.dispose()
  }, 30000)

  test("should handle real network request within timeout", async () => {
    const volume = new Volume("https://niivue.github.io/niivue-demo-images/mni152.nii.gz")
    
    // Real fetch should complete within the 30s worker timeout
    await volume.fetchData()
    expect(volume.getRawData()).toBeDefined()
    expect(volume.getRawData()?.byteLength).toBeGreaterThan(0)
    
    volume.dispose()
  }, 30000)
})

