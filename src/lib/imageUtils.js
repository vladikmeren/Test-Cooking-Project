/**
 * Resize + compress an image File to a JPEG data URL.
 * Max dimension 1200px, quality 0.78 — output ~80-150KB regardless of input.
 */
export function compressImage(file, maxDim = 1200, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        // Calculate new size keeping aspect ratio
        let { width, height } = img
        if (width > height) {
          if (width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim }
        } else {
          if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim }
        }

        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl) // base64 data URL, ~80-150KB
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
