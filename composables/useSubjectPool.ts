import { ref } from 'vue'

export interface QuestionGroup {
  id: string
  series: string
  paper_filename: string
  paper_type: 'SQ' | 'MCQ'
  main_question_number: string
  question_raw_number: string
  score: number
  primaryQuestion: any
  subQuestions: any[]
}

// Native IndexedDB for Subject Pools (0 extra bundles, ~3ms disk access)
function openPoolDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'))
    }
    const req = window.indexedDB.open('PhysicsPoolDB', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('pools')) {
        db.createObjectStore('pools')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getCachedPool(series: string): Promise<any[] | null> {
  try {
    const db = await openPoolDB()
    return new Promise((resolve) => {
      const tx = db.transaction('pools', 'readonly')
      const store = tx.objectStore('pools')
      const req = store.get(series)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function setCachedPool(series: string, data: any[]): Promise<void> {
  try {
    const db = await openPoolDB()
    const tx = db.transaction('pools', 'readwrite')
    const store = tx.objectStore('pools')
    store.put(data, series)
  } catch (e) {
    console.warn('Failed to cache pool in IndexedDB:', e)
  }
}

function getMainQuestionNumber(raw: any): string {
  if (!raw) return ''
  const str = String(raw).trim()
  const match = str.match(/^(\d+)/)
  return match ? match[1] : str
}

export function groupQuestionsData(rows: any[]): QuestionGroup[] {
  const groupMap = new Map<string, QuestionGroup>()

  for (const row of rows) {
    const mainNum = row.paper_type === 'SQ' ? getMainQuestionNumber(row.question_raw_number) : (row.question_raw_number || row.id)
    const groupKey = `${row.paper_filename}___${mainNum}___${row.paper_type}`

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        id: row.id,
        series: row.series,
        paper_filename: row.paper_filename,
        paper_type: row.paper_type,
        main_question_number: mainNum,
        question_raw_number: row.question_raw_number,
        score: row.score || 0,
        primaryQuestion: row,
        subQuestions: []
      })
    }

    const g = groupMap.get(groupKey)!
    g.subQuestions.push(row)
  }

  return Array.from(groupMap.values())
}

export async function fetchAllSubjectRows(
  client: any,
  seriesId: string,
  onFirstBatch?: (rows: any[]) => void
): Promise<any[]> {
  const PAGE_SIZE = 1000
  // 1. Fetch Page 0 + exact total count
  const { data: page0, count, error } = await client
    .from('questions_data')
    .select('id, series, paper_filename, question_raw_number, paper_type, score, details, image_path, ms_image_path, ms_details, start_page, start_y', { count: 'exact' })
    .eq('series', seriesId)
    .order('paper_filename', { ascending: false })
    .order('start_page', { ascending: true })
    .order('start_y', { ascending: true })
    .range(0, PAGE_SIZE - 1)

  if (error) throw error
  if (!page0 || page0.length === 0) return []

  if (onFirstBatch) {
    onFirstBatch(page0)
  }

  const total = count || page0.length
  if (total <= PAGE_SIZE) {
    return page0
  }

  // 2. Fetch remaining pages in parallel chunks
  const numPages = Math.ceil(total / PAGE_SIZE)
  const pagePromises = []
  for (let p = 1; p < numPages; p++) {
    pagePromises.push(
      client
        .from('questions_data')
        .select('id, series, paper_filename, question_raw_number, paper_type, score, details, image_path, ms_image_path, ms_details, start_page, start_y')
        .eq('series', seriesId)
        .order('paper_filename', { ascending: false })
        .order('start_page', { ascending: true })
        .order('start_y', { ascending: true })
        .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)
        .then((res: any) => res.data || [])
    )
  }

  const remainingBatches = await Promise.all(pagePromises)
  const allRows = page0.concat(...remainingBatches)
  return allRows
}

export function useSubjectPool(client: any) {
  const groupedQuestions = ref<QuestionGroup[]>([])
  const currentIndex = ref(0)
  const isPoolLoading = ref(false)
  const isPoolReady = ref(false)
  const availablePapers = ref<string[]>([])
  const sqPaperOptions = ref<string[]>([])
  const mcqPaperOptions = ref<string[]>([])

  // Preload adjacent images into browser cache so clicking Next/Prev has 0 image latency
  function preloadAdjacentImages(idx: number, cdnBase: string, r2DevUrl: string) {
    if (typeof window === 'undefined') return
    const list = groupedQuestions.value
    if (!list || list.length === 0) return

    // Preload next 3 questions and previous 1 question
    const indices = [idx + 1, idx + 2, idx + 3, idx - 1].filter(i => i >= 0 && i < list.length)
    for (const i of indices) {
      const group = list[i]
      if (group && group.subQuestions) {
        for (const sub of group.subQuestions) {
          const path = sub.image_path
          if (path && !path.startsWith('/seed-questions/')) {
            const cleanPath = path.startsWith('/') ? path.slice(1) : path
            const img = new Image()
            img.src = `${cdnBase}/${cleanPath}`
          }
          const msPath = sub.ms_image_path
          if (msPath && !msPath.startsWith('/seed-questions/')) {
            const cleanMsPath = msPath.startsWith('/') ? msPath.slice(1) : msPath
            const msImg = new Image()
            msImg.src = `${cdnBase}/${cleanMsPath}`
          }
        }
      }
    }
  }

  async function loadSubjectPool(seriesId: string, onFastFirstQuestion?: (group: QuestionGroup) => void) {
    if (!seriesId) return
    isPoolLoading.value = true

    // 1. Try reading from local IndexedDB first (Takes ~2-4ms, 0 network communication!)
    const cachedRows = await getCachedPool(seriesId)
    // Supabase PostgREST default hard limit is 1000.
    // If cached rows count is <= 1000 for subjects with more questions, it was truncated by previous buggy code.
    const isTruncated = cachedRows && cachedRows.length === 1000

    if (cachedRows && cachedRows.length > 0) {
      const groups = groupQuestionsData(cachedRows)
      if (groups.length > 0) {
        groupedQuestions.value = groups
        currentIndex.value = 0
        isPoolReady.value = true
        isPoolLoading.value = false
        extractPaperOptions(cachedRows)
      }
    }

    // 2. Fetch complete dataset from Supabase using parallel pagination if not cached or cache was truncated
    if (!cachedRows || cachedRows.length < 5 || isTruncated) {
      try {
        const allRows = await fetchAllSubjectRows(client, seriesId, (firstBatch) => {
          // Deliver first batch immediately to UI if nothing cached
          if (!cachedRows || cachedRows.length === 0) {
            const firstGroups = groupQuestionsData(firstBatch)
            if (firstGroups.length > 0) {
              groupedQuestions.value = firstGroups
              currentIndex.value = 0
              isPoolReady.value = true
              isPoolLoading.value = false
              extractPaperOptions(firstBatch)
              if (onFastFirstQuestion) {
                onFastFirstQuestion(firstGroups[0])
              }
            }
          }
        })

        if (allRows && allRows.length > 0) {
          const fullGroups = groupQuestionsData(allRows)
          groupedQuestions.value = fullGroups
          extractPaperOptions(allRows)
          isPoolReady.value = true
          await setCachedPool(seriesId, allRows)
        }
      } catch (err) {
        console.error('Error loading subject pool for ' + seriesId, err)
      } finally {
        isPoolLoading.value = false
      }
    }
  }

  function extractPaperOptions(rows: any[]) {
    const papers = new Set<string>()
    const sqSet = new Set<string>()
    const mcqSet = new Set<string>()

    for (const r of rows) {
      if (r.paper_filename) {
        papers.add(r.paper_filename)
        if (r.paper_type === 'SQ') sqSet.add(r.paper_filename)
        if (r.paper_type === 'MCQ') mcqSet.add(r.paper_filename)
      }
    }

    availablePapers.value = Array.from(papers).sort()
    sqPaperOptions.value = Array.from(sqSet).sort()
    mcqPaperOptions.value = Array.from(mcqSet).sort()
  }

  return {
    groupedQuestions,
    currentIndex,
    isPoolLoading,
    isPoolReady,
    availablePapers,
    sqPaperOptions,
    mcqPaperOptions,
    loadSubjectPool,
    preloadAdjacentImages
  }
}

