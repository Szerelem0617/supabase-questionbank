import { ref } from 'vue'

export function useImageStitcher() {
  const copyingImage = ref(false)

  function getImageUrl(path: string, cdnBase: string): string {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    return `${cdnBase}/${cleanPath}`
  }

  function onImageError(e: any, path: string, fallbackBase = 'https://pub-b20547c0488b456f8b6c033d9a7a1ca1.r2.dev') {
    if (!e || !e.target || !path) return
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    const fallbackUrl = `${fallbackBase}/${cleanPath}`
    if (e.target.src !== fallbackUrl) {
      e.target.src = fallbackUrl
    }
  }

  async function fetchImageBlob(imagePath: string, cdnBase: string, r2DevUrl?: string): Promise<Blob> {
    if (!imagePath) throw new Error('Image path is missing')
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath

    const candidates = [
      `${cdnBase}/${cleanPath}`,
      `${r2DevUrl || 'https://pub-b20547c0488b456f8b6c033d9a7a1ca1.r2.dev'}/${cleanPath}`
    ]

    let lastError: any = null
    for (const url of candidates) {
      try {
        const fetchUrl = url.includes('?') ? `${url}&cors=1` : `${url}?cors=1`
        const res = await fetch(fetchUrl, { mode: 'cors' })
        if (res.ok) {
          return await res.blob()
        }
      } catch (e) {
        lastError = e
      }
    }
    throw lastError || new Error('无法从CDN加载图片资源')
  }

  async function copyStitchedQuestion(
    questions: any[],
    cdnBase: string,
    r2DevUrl?: string,
    showToast?: (msg: string) => void
  ) {
    const { t, locale } = useI18n()
    const validQuestions = questions.filter(q => q.image_path)
    if (validQuestions.length === 0) {
      if (showToast) showToast(locale.value === 'zh' ? '⚠️ 没有可供复制的题目切图' : '⚠️ No question images to stitch')
      return
    }

    copyingImage.value = true
    if (showToast) showToast(locale.value === 'zh' ? '⏳ 正在拼接整题高清图片...' : '⏳ Stitching question images...')

    let loadedBitmaps: ImageBitmap[] = []
    try {
      loadedBitmaps = await Promise.all(
        validQuestions.map(async (q) => {
          const blob = await fetchImageBlob(q.image_path, cdnBase, r2DevUrl)
          return await createImageBitmap(blob)
        })
      )

      const totalHeight = loadedBitmaps.reduce((sum, img) => sum + img.height, 0)
      const maxWidth = Math.max(...loadedBitmaps.map(img => img.width))

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('无法创建画板')

      if (totalHeight <= 1800 || loadedBitmaps.length === 1) {
        canvas.width = maxWidth
        canvas.height = totalHeight

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        let currentY = 0
        for (const img of loadedBitmaps) {
          ctx.drawImage(img, 0, currentY)
          currentY += img.height
        }
      } else {
        const heights = loadedBitmaps.map(img => img.height)
        const n = loadedBitmaps.length

        let bestSplitIndex = 0
        let minDiff = Infinity
        for (let i = 0; i < n - 1; i++) {
          const leftH = heights.slice(0, i + 1).reduce((a, b) => a + b, 0)
          const rightH = heights.slice(i + 1).reduce((a, b) => a + b, 0)
          const diff = Math.abs(leftH - rightH)
          if (diff < minDiff) {
            minDiff = diff
            bestSplitIndex = i
          }
        }

        const leftGroup = loadedBitmaps.slice(0, bestSplitIndex + 1)
        const rightGroup = loadedBitmaps.slice(bestSplitIndex + 1)

        const leftHeight = leftGroup.reduce((sum, img) => sum + img.height, 0)
        const rightHeight = rightGroup.reduce((sum, img) => sum + img.height, 0)
        const finalHeight = Math.max(leftHeight, rightHeight)

        canvas.width = maxWidth * 2 + 30
        canvas.height = finalHeight

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        let currentYLeft = 0
        for (const img of leftGroup) {
          ctx.drawImage(img, 0, currentYLeft)
          currentYLeft += img.height
        }

        let currentYRight = 0
        for (const img of rightGroup) {
          ctx.drawImage(img, maxWidth + 30, currentYRight)
          currentYRight += img.height
        }
      }

      const outBlob = await new Promise<Blob | null>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error('Canvas toBlob failed'))
        }, 'image/png')
      })

      if (!outBlob) throw new Error('生成图片失败')

      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({ 'image/png': outBlob })
        await navigator.clipboard.write([item])
        if (showToast) showToast('🎉 ' + t('toast.copySuccess'))
      } else {
        throw new Error(locale.value === 'zh' ? '当前浏览器环境不支持直接写入剪贴板图片' : 'Browser does not support clipboard write')
      }
    } catch (err: any) {
      console.error('Failed to copy stitched image:', err)
      if (showToast) showToast((locale.value === 'zh' ? '❌ 复制整题失败: ' : '❌ Failed to copy image: ') + err.message)
    } finally {
      loadedBitmaps.forEach(bmp => {
        if (bmp && typeof bmp.close === 'function') bmp.close()
      })
      copyingImage.value = false
    }
  }

  return {
    copyingImage,
    getImageUrl,
    onImageError,
    fetchImageBlob,
    copyStitchedQuestion
  }
}

