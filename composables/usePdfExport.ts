import { ref } from 'vue'
import { jsPDF } from 'jspdf'
import type { FavoriteItem } from '~/composables/useFavorites'

export function usePdfExport() {
  const isExporting = ref(false)
  const exportProgress = ref('')

  async function fetchImageBlob(imagePath: string, cdnBase: string, r2DevUrl?: string): Promise<Blob> {
    if (!imagePath) throw new Error('Image path is missing')

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      const res = await fetch(imagePath)
      if (res.ok) return await res.blob()
    }

    if (imagePath.startsWith('/seed-questions/')) {
      const res = await fetch(imagePath)
      if (res.ok) return await res.blob()
    }

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
    throw lastError || new Error(`Failed to load image: ${imagePath}`)
  }

  function loadImageElement(blob: Blob): Promise<{ img: HTMLImageElement; url: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        resolve({
          img,
          url,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 600
        })
      }
      img.onerror = (e) => {
        URL.revokeObjectURL(url)
        reject(e)
      }
      img.src = url
    })
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 15000)
  }

  async function exportFavoritesPdf({
    folderName,
    items,
    cdnBase,
    r2DevUrl,
    showToast,
    locale = 'zh'
  }: {
    folderName: string
    items: FavoriteItem[]
    cdnBase: string
    r2DevUrl?: string
    showToast?: (msg: string) => void
    locale?: string
  }): Promise<boolean> {
    if (!items || items.length === 0) {
      if (showToast) {
        showToast(locale === 'zh' ? '⚠️ 收藏夹暂无题目可供导出' : '⚠️ No questions in favorites to export')
      }
      return false
    }

    if (isExporting.value) return false
    isExporting.value = true
    exportProgress.value = '0%'

    const safeFolderName = (folderName || (locale === 'zh' ? '收藏题目' : 'Favorites'))
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()

    if (showToast) {
      showToast(locale === 'zh'
        ? `⏳ 正在导出「${safeFolderName}」PDF（试题与答案各1份，共 ${items.length} 题）...`
        : `⏳ Generating PDFs for "${safeFolderName}" (${items.length} questions)...`
      )
    }

    const createdUrls: string[] = []

    try {
      // Document 1: Questions PDF
      const docQ = new jsPDF({ format: 'a4', unit: 'mm', compress: true })
      // Document 2: Mark Scheme PDF
      const docMs = new jsPDF({ format: 'a4', unit: 'mm', compress: true })

      const pageWidth = 210
      const pageHeight = 297
      const marginX = 15
      const marginTop = 20
      const marginBottom = 18
      const contentWidth = pageWidth - 2 * marginX
      const contentHeight = pageHeight - marginTop - marginBottom

      const todayStr = new Date().toISOString().slice(0, 10)

      let currentY_Q = marginTop
      let currentY_Ms = marginTop

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const qIndexLabel = `Q${i + 1}`
        const boardTag = item.board || 'CAIE'
        const paperTag = item.paperFilename || ''
        const subTag = item.isSub ? `Part ${item.subQNum || ''}` : `Q${item.subQNum || ''}`
        const scoreTag = item.score ? `[${item.score} Marks]` : ''

        exportProgress.value = `${Math.round(((i + 1) / items.length) * 100)}%`

        // ----------------------------------------------------
        // 1. Process Question Item
        // ----------------------------------------------------
        const qHeaderTitle = `${qIndexLabel}.  [${boardTag}] ${paperTag} ${subTag} ${scoreTag}`.trim()
        
        let qImageObj: { img: HTMLImageElement; url: string; width: number; height: number } | null = null
        if (item.imagePath) {
          try {
            const blob = await fetchImageBlob(item.imagePath, cdnBase, r2DevUrl)
            qImageObj = await loadImageElement(blob)
            createdUrls.push(qImageObj.url)
          } catch (e) {
            console.warn(`Failed to load Q image for item ${i + 1}:`, e)
          }
        }

        // Calculate needed vertical space for Question item
        let qRenderWidth = contentWidth
        let qRenderHeight = 20
        if (qImageObj) {
          const aspect = qImageObj.height / qImageObj.width
          qRenderHeight = Math.min(contentWidth * aspect, contentHeight - 15)
          qRenderWidth = qRenderHeight / aspect
        } else if (item.details) {
          qRenderHeight = 30
        }

        const qTotalNeeded = 8 + qRenderHeight + 8 // Header + Image/Text + Gap

        if (currentY_Q + qTotalNeeded > pageHeight - marginBottom) {
          if (currentY_Q > marginTop + 5) {
            docQ.addPage()
            currentY_Q = marginTop
          }
        }

        // Draw Question Header Tag
        docQ.setFont('helvetica', 'bold')
        docQ.setFontSize(10)
        docQ.setTextColor(194, 65, 40) // Accent primary color
        docQ.text(qHeaderTitle, marginX, currentY_Q)
        currentY_Q += 6

        // Draw Question Body (Image or text fallback)
        if (qImageObj) {
          const drawX = marginX + (contentWidth - qRenderWidth) / 2
          docQ.addImage(qImageObj.img, 'PNG', drawX, currentY_Q, qRenderWidth, qRenderHeight, undefined, 'FAST')
          currentY_Q += qRenderHeight + 6
        } else if (item.details) {
          docQ.setFont('helvetica', 'normal')
          docQ.setFontSize(9)
          docQ.setTextColor(40, 40, 40)
          const lines = docQ.splitTextToSize(item.details, contentWidth)
          docQ.text(lines, marginX, currentY_Q)
          currentY_Q += lines.length * 4.5 + 6
        } else {
          docQ.setFont('helvetica', 'italic')
          docQ.setFontSize(8)
          docQ.setTextColor(140, 140, 140)
          docQ.text('[Question diagram/details not provided]', marginX, currentY_Q)
          currentY_Q += 8
        }

        // Draw subtle divider between items
        if (i < items.length - 1 && currentY_Q < pageHeight - marginBottom - 15) {
          docQ.setDrawColor(228, 228, 231)
          docQ.setLineWidth(0.3)
          docQ.line(marginX, currentY_Q, marginX + contentWidth, currentY_Q)
          currentY_Q += 6
        }

        // ----------------------------------------------------
        // 2. Process Mark Scheme Item
        // ----------------------------------------------------
        const msHeaderTitle = `${qIndexLabel} Mark Scheme.  [${boardTag}] ${paperTag} ${subTag}`.trim()

        let msImageObj: { img: HTMLImageElement; url: string; width: number; height: number } | null = null
        if (item.msImagePath) {
          try {
            const blob = await fetchImageBlob(item.msImagePath, cdnBase, r2DevUrl)
            msImageObj = await loadImageElement(blob)
            createdUrls.push(msImageObj.url)
          } catch (e) {
            console.warn(`Failed to load MS image for item ${i + 1}:`, e)
          }
        }

        let msRenderWidth = contentWidth
        let msRenderHeight = 20
        if (msImageObj) {
          const aspect = msImageObj.height / msImageObj.width
          msRenderHeight = Math.min(contentWidth * aspect, contentHeight - 15)
          msRenderWidth = msRenderHeight / aspect
        } else if (item.msDetails) {
          msRenderHeight = 25
        }

        const msTotalNeeded = 8 + msRenderHeight + 8

        if (currentY_Ms + msTotalNeeded > pageHeight - marginBottom) {
          if (currentY_Ms > marginTop + 5) {
            docMs.addPage()
            currentY_Ms = marginTop
          }
        }

        // Draw MS Header Tag
        docMs.setFont('helvetica', 'bold')
        docMs.setFontSize(10)
        docMs.setTextColor(43, 114, 186) // Slate blue accent
        docMs.text(msHeaderTitle, marginX, currentY_Ms)
        currentY_Ms += 6

        // Draw MS Body
        if (msImageObj) {
          const drawX = marginX + (contentWidth - msRenderWidth) / 2
          docMs.addImage(msImageObj.img, 'PNG', drawX, currentY_Ms, msRenderWidth, msRenderHeight, undefined, 'FAST')
          currentY_Ms += msRenderHeight + 6
        } else if (item.msDetails) {
          docMs.setFont('helvetica', 'normal')
          docMs.setFontSize(9)
          docMs.setTextColor(40, 40, 40)
          const lines = docMs.splitTextToSize(item.msDetails, contentWidth)
          docMs.text(lines, marginX, currentY_Ms)
          currentY_Ms += lines.length * 4.5 + 6
        } else {
          docMs.setFont('helvetica', 'italic')
          docMs.setFontSize(8)
          docMs.setTextColor(140, 140, 140)
          docMs.text('[Official mark scheme notes not provided]', marginX, currentY_Ms)
          currentY_Ms += 8
        }

        // Draw subtle divider between items
        if (i < items.length - 1 && currentY_Ms < pageHeight - marginBottom - 15) {
          docMs.setDrawColor(228, 228, 231)
          docMs.setLineWidth(0.3)
          docMs.line(marginX, currentY_Ms, marginX + contentWidth, currentY_Ms)
          currentY_Ms += 6
        }
      }

      // ----------------------------------------------------
      // 3. Add Running Headers & Footers to All Pages
      // ----------------------------------------------------
      const totalPagesQ = docQ.getNumberOfPages()
      for (let p = 1; p <= totalPagesQ; p++) {
        docQ.setPage(p)
        docQ.setFont('helvetica', 'normal')
        docQ.setFontSize(8)
        docQ.setTextColor(120, 120, 120)

        // Top Header
        docQ.text(`Physics Past Paper Archive — ${safeFolderName} (Questions)`, marginX, 12)
        docQ.text(`${todayStr}  •  Total ${items.length} Questions`, pageWidth - marginX, 12, { align: 'right' })
        docQ.setDrawColor(220, 220, 220)
        docQ.setLineWidth(0.2)
        docQ.line(marginX, 14, pageWidth - marginX, 14)

        // Bottom Footer
        docQ.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12)
        docQ.text(`Page ${p} of ${totalPagesQ}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
        docQ.text('https://physics.66367749.xyz', marginX, pageHeight - 8)
      }

      const totalPagesMs = docMs.getNumberOfPages()
      for (let p = 1; p <= totalPagesMs; p++) {
        docMs.setPage(p)
        docMs.setFont('helvetica', 'normal')
        docMs.setFontSize(8)
        docMs.setTextColor(120, 120, 120)

        // Top Header
        docMs.text(`Physics Past Paper Archive — ${safeFolderName} (Mark Scheme & Answers)`, marginX, 12)
        docMs.text(`${todayStr}  •  Total ${items.length} Solutions`, pageWidth - marginX, 12, { align: 'right' })
        docMs.setDrawColor(220, 220, 220)
        docMs.setLineWidth(0.2)
        docMs.line(marginX, 14, pageWidth - marginX, 14)

        // Bottom Footer
        docMs.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12)
        docMs.text(`Page ${p} of ${totalPagesMs}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
        docMs.text('https://physics.66367749.xyz', marginX, pageHeight - 8)
      }

      // ----------------------------------------------------
      // 4. Trigger Two Downloads
      // ----------------------------------------------------
      const qBlob = docQ.output('blob')
      const msBlob = docMs.output('blob')

      const qFilename = `${safeFolderName}_Questions_试题.pdf`
      const msFilename = `${safeFolderName}_MarkScheme_评分标准.pdf`

      console.log('Starting triggerDownload 1:', qFilename)
      triggerDownload(qBlob, qFilename)

      // Delay so the browser initiates both downloads reliably
      await new Promise(resolve => setTimeout(resolve, 800))
      console.log('Starting triggerDownload 2:', msFilename)
      triggerDownload(msBlob, msFilename)

      if (showToast) {
        showToast(locale === 'zh'
          ? `✨ 导出完成！已开始下载试题卷与评分标准 2 份 PDF`
          : `✨ Export complete! Downloaded 2 PDFs (Questions & Mark Scheme).`
        )
      }

      return true
    } catch (err: any) {
      console.error('Error exporting PDF:', err)
      if (showToast) {
        showToast((locale === 'zh' ? '⚠️ 导出 PDF 失败: ' : '⚠️ Failed to export PDF: ') + (err.message || err))
      }
      return false
    } finally {
      // Clean up object URLs
      createdUrls.forEach(url => URL.revokeObjectURL(url))
      isExporting.value = false
      exportProgress.value = ''
    }
  }

  return {
    isExporting,
    exportProgress,
    exportFavoritesPdf
  }
}
