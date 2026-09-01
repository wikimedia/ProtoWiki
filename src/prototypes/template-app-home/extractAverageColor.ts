export interface Rgb {
  r: number
  g: number
  b: number
}

/** Downsamples the image onto a tiny canvas and averages its pixels. */
function sampleAverageColor(img: HTMLImageElement): Rgb | null {
  const size = 16
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(img, 0, 0, size, size)

  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, size, size).data
  } catch {
    // CORS-tainted canvas — can't read pixels.
    return null
  }

  let r = 0
  let g = 0
  let b = 0
  let count = 0

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count += 1
  }

  if (count === 0) return null
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image failed to load'))
    img.src = url
  })
}

/** The image's average color, darkened for use as a scrim behind white text. */
export async function extractDarkenedColor(imageUrl: string, factor = 0.35): Promise<Rgb | null> {
  try {
    const img = await loadImage(imageUrl)
    const average = sampleAverageColor(img)
    if (!average) return null
    return {
      r: Math.round(average.r * factor),
      g: Math.round(average.g * factor),
      b: Math.round(average.b * factor),
    }
  } catch {
    return null
  }
}
