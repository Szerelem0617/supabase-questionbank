import { ref } from 'vue'

export interface PaperPdfLinks {
  qpUrl: string | null
  msUrl: string | null
  qpName: string | null
  msName: string | null
}

const manifest = ref<Record<string, any>>({})
let isLoaded = false
let loadPromise: Promise<void> | null = null

const CDN_BASE = 'https://assets.66367749.xyz'

export function usePaperPdf() {
  const ensureLoaded = async (): Promise<void> => {
    if (isLoaded) return
    if (loadPromise) return loadPromise

    loadPromise = (async () => {
      try {
        const res = await fetch('/paper_pdf_manifest.json')
        if (res.ok) {
          manifest.value = await res.json()
          isLoaded = true
        }
      } catch (err) {
        console.warn('[usePaperPdf] Failed to load paper manifest:', err)
      } finally {
        loadPromise = null
      }
    })()

    return loadPromise
  }

  // Auto trigger load on client
  if (import.meta.client && !isLoaded && !loadPromise) {
    ensureLoaded()
  }

  const buildUrl = (relPath: string | null): string | null => {
    if (!relPath) return null
    // Clean and encode path parts
    const encoded = relPath
      .split('/')
      .map(encodeURIComponent)
      .join('/')
    return `${CDN_BASE}/physics/raw_pdfs/${encoded}`
  }

  const getPdfLinks = (questionData: any): PaperPdfLinks => {
    if (!questionData) {
      return { qpUrl: null, msUrl: null, qpName: null, msName: null }
    }

    const candidates: string[] = []

    // 1. From image_path parent folder
    if (questionData.image_path) {
      const parts = String(questionData.image_path).split('/')
      if (parts.length >= 2) {
        candidates.push(parts[parts.length - 2])
      }
    }

    // 2. From paper_filename
    if (questionData.paper_filename) {
      const fn = String(questionData.paper_filename).trim()
      candidates.push(fn)
      if (fn.toLowerCase().endsWith('.pdf')) {
        candidates.push(fn.slice(0, -4))
      }
    }

    // 3. Fallback from ID (e.g. 9702_s24_13_q25 -> 9702_s24_qp_13 or 0625_w20_61_q1 -> 0625_w20_qp_61)
    if (questionData.id) {
      const qid = String(questionData.id)
      const parts = qid.split('_')
      if (parts.length >= 3 && /^\d+$/.test(parts[2])) {
        candidates.push(`${parts[0]}_${parts[1]}_qp_${parts[2]}`)
      }
      const seasonMatch = qid.match(/^([a-z0-9]+)_([wsmWSM]\d{2})_([1-6]\d)/i)
      if (seasonMatch) {
        candidates.push(`${seasonMatch[1]}_${seasonMatch[2]}_qp_${seasonMatch[3]}`)
        candidates.push(`${seasonMatch[1]}_${seasonMatch[2]}_${seasonMatch[3]}`)
      }
    }

    // Look up in manifest
    for (const key of candidates) {
      const entry: any = manifest.value[key]
      if (entry) {
        if (Array.isArray(entry)) {
          const [qpRel, msRel] = entry
          const qpName = qpRel ? qpRel.split('/').pop() || 'Question Paper' : null
          const msName = msRel ? msRel.split('/').pop() || 'Mark Scheme' : null
          return {
            qpUrl: buildUrl(qpRel),
            msUrl: buildUrl(msRel),
            qpName,
            msName
          }
        } else if (typeof entry === 'object') {
          const qpUrl = entry.qp_url || buildUrl(entry.qp_key)
          const msUrl = entry.ms_url || buildUrl(entry.ms_key)
          const qpName = entry.qp_key ? entry.qp_key.split('/').pop() : (qpUrl ? qpUrl.split('/').pop() : 'Question Paper')
          const msName = entry.ms_key ? entry.ms_key.split('/').pop() : (msUrl ? msUrl.split('/').pop() : 'Mark Scheme')
          return {
            qpUrl,
            msUrl,
            qpName,
            msName
          }
        }
      }
    }

    return { qpUrl: null, msUrl: null, qpName: null, msName: null }
  }

  const openPdf = (url: string | null) => {
    if (!url) return
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return {
    ensureLoaded,
    getPdfLinks,
    openPdf
  }
}

