interface ImageData {
  data: Uint8ClampedArray
  width: number
  height: number
}

interface Point {
  x: number
  y: number
}

interface ColorRGB {
  r: number
  g: number
  b: number
  a?: number
}

interface ColorExtractionOptions {
  method: 'dominant' | 'average' | 'point'
  coordinates?: Point
  sampleSize?: number
  tolerance?: number
}

interface ColorCluster {
  color: ColorRGB
  count: number
  percentage: number
}

export class CanvasImageProcessor {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor() {
    this.canvas = document.createElement('canvas')
    const context = this.canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context not supported')
    }
    this.ctx = context
  }

  async loadImage(source: string | File | HTMLImageElement): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))

      if (typeof source === 'string') {
        img.src = source
      } else if (source instanceof File) {
        const reader = new FileReader()
        reader.onload = (e) => {
          img.src = e.target?.result as string
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(source)
      } else {
        // Already an HTMLImageElement
        resolve(source)
      }
    })
  }

  getImageData(img: HTMLImageElement, maxSize: number = 800): ImageData {
    // Calculate scaled dimensions
    let { width, height } = img

    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height)
      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)
    }

    // Set canvas size and draw image
    this.canvas.width = width
    this.canvas.height = height
    this.ctx.drawImage(img, 0, 0, width, height)

    return this.ctx.getImageData(0, 0, width, height)
  }

  extractColor(imageData: ImageData, options: ColorExtractionOptions): ColorRGB {
    switch (options.method) {
      case 'point':
        return this.extractPointColor(imageData, options.coordinates!)
      case 'average':
        return this.extractAverageColor(imageData, options.sampleSize)
      case 'dominant':
        return this.extractDominantColor(imageData, options.tolerance)
      default:
        throw new Error(`Unknown extraction method: ${options.method}`)
    }
  }

  private extractPointColor(imageData: ImageData, coordinates: Point): ColorRGB {
    const { width, height, data } = imageData
    const { x, y } = coordinates

    // Validate coordinates
    if (x < 0 || x >= width || y < 0 || y >= height) {
      throw new Error('Coordinates out of image bounds')
    }

    // Calculate pixel index (4 bytes per pixel: RGBA)
    const index = (y * width + x) * 4

    return {
      r: data[index],
      g: data[index + 1],
      b: data[index + 2],
      a: data[index + 3]
    }
  }

  private extractAverageColor(imageData: ImageData, sampleSize?: number): ColorRGB {
    const { data } = imageData
    const step = sampleSize ? Math.max(1, Math.floor(data.length / (sampleSize * 4))) : 1

    let totalR = 0
    let totalG = 0
    let totalB = 0
    let pixelCount = 0

    for (let i = 0; i < data.length; i += step * 4) {
      // Skip transparent pixels
      if (data[i + 3] < 128) continue

      totalR += data[i]
      totalG += data[i + 1]
      totalB += data[i + 2]
      pixelCount++
    }

    if (pixelCount === 0) {
      throw new Error('No valid pixels found for color extraction')
    }

    return {
      r: Math.round(totalR / pixelCount),
      g: Math.round(totalG / pixelCount),
      b: Math.round(totalB / pixelCount)
    }
  }

  private extractDominantColor(imageData: ImageData, tolerance: number = 32): ColorRGB {
    const { data } = imageData
    const colorMap = new Map<string, number>()

    // Count colors with tolerance-based clustering
    for (let i = 0; i < data.length; i += 4) {
      // Skip transparent pixels
      if (data[i + 3] < 128) continue

      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Quantize colors to reduce similar colors
      const quantizedR = Math.floor(r / tolerance) * tolerance
      const quantizedG = Math.floor(g / tolerance) * tolerance
      const quantizedB = Math.floor(b / tolerance) * tolerance

      const colorKey = `${quantizedR},${quantizedG},${quantizedB}`
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1)
    }

    if (colorMap.size === 0) {
      throw new Error('No valid pixels found for color extraction')
    }

    // Find the most frequent color
    let dominantColor = ''
    let maxCount = 0

    for (const [color, count] of colorMap) {
      if (count > maxCount) {
        maxCount = count
        dominantColor = color
      }
    }

    const [r, g, b] = dominantColor.split(',').map(Number)
    return { r, g, b }
  }

  getColorPalette(imageData: ImageData, maxColors: number = 5, tolerance: number = 32): ColorCluster[] {
    const { data } = imageData
    const colorMap = new Map<string, number>()
    let totalPixels = 0

    // Count colors
    for (let i = 0; i < data.length; i += 4) {
      // Skip transparent pixels
      if (data[i + 3] < 128) continue

      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Quantize colors
      const quantizedR = Math.floor(r / tolerance) * tolerance
      const quantizedG = Math.floor(g / tolerance) * tolerance
      const quantizedB = Math.floor(b / tolerance) * tolerance

      const colorKey = `${quantizedR},${quantizedG},${quantizedB}`
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1)
      totalPixels++
    }

    // Convert to clusters and sort by frequency
    const clusters: ColorCluster[] = Array.from(colorMap.entries())
      .map(([colorKey, count]) => {
        const [r, g, b] = colorKey.split(',').map(Number)
        return {
          color: { r, g, b },
          count,
          percentage: (count / totalPixels) * 100
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, maxColors)

    return clusters
  }

  resizeImage(img: HTMLImageElement, maxWidth: number, maxHeight: number): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    // Calculate new dimensions maintaining aspect ratio
    let { width, height } = img
    const ratio = Math.min(maxWidth / width, maxHeight / height)

    if (ratio < 1) {
      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)
    }

    canvas.width = width
    canvas.height = height

    // Enable smooth scaling
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    ctx.drawImage(img, 0, 0, width, height)

    return canvas.toDataURL('image/jpeg', 0.9)
  }

  validateImageFile(file: File): { valid: boolean; error?: string } {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.'
      }
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File too large. Please upload images smaller than 10MB.'
      }
    }

    return { valid: true }
  }

  dispose(): void {
    // Clean up canvas
    this.canvas.width = 0
    this.canvas.height = 0
  }
}

// Utility functions for color processing
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function hexToRgb(hex: string): ColorRGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export function calculateColorDistance(color1: ColorRGB, color2: ColorRGB): number {
  // Simple Euclidean distance in RGB space
  const deltaR = color1.r - color2.r
  const deltaG = color1.g - color2.g
  const deltaB = color1.b - color2.b

  return Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB)
}

export function isColorSimilar(color1: ColorRGB, color2: ColorRGB, threshold: number = 30): boolean {
  return calculateColorDistance(color1, color2) <= threshold
}