import { ref } from 'vue'
import { fetchAllSubjectRows } from '~/composables/useSubjectPool'

// Native Lightweight IndexedDB Storage (0 extra bundles, ~0ms access)
function openDB(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'))
    }
    const req = window.indexedDB.open(dbName, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getCachedPoolOrCatalog(series: string): Promise<any[] | null> {
  // 1. Try reading from PhysicsPoolDB first (already populated by useSubjectPool)
  try {
    const poolDb = await openDB('PhysicsPoolDB', 'pools')
    const poolData = await new Promise<any[]>((resolve) => {
      const tx = poolDb.transaction('pools', 'readonly')
      const req = tx.objectStore('pools').get(series)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
    if (poolData && poolData.length > 0) return poolData
  } catch {}

  // 2. Fallback to PhysicsCatalogDB
  try {
    const catDb = await openDB('PhysicsCatalogDB', 'catalogs')
    const catData = await new Promise<any[]>((resolve) => {
      const tx = catDb.transaction('catalogs', 'readonly')
      const req = tx.objectStore('catalogs').get(series)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
    if (catData && catData.length > 0) return catData
  } catch {}

  return null
}

async function setCachedCatalog(series: string, data: any[]): Promise<void> {
  try {
    const poolDb = await openDB('PhysicsPoolDB', 'pools')
    const tx = poolDb.transaction('pools', 'readwrite')
    tx.objectStore('pools').put(data, series)
  } catch {}
}

function getMainQuestionNumber(raw: any): string {
  if (!raw) return ''
  const str = String(raw).trim()
  const match = str.match(/^(\d+)/)
  return match ? match[1] : str
}

interface ParsedQuery {
  mode: 'qp' | 'keyword'
  qpQuery?: string
  tokens: string[]
  isPureNumber: boolean
  baseNum: string | null
  rawQuery: string
}

function parseSearchQuery(rawKw: string): ParsedQuery {
  const trimmed = rawKw.trim()
  if (trimmed.toLowerCase().startsWith('qp:')) {
    const qpArg = trimmed.slice(3).trim()
    return {
      mode: 'qp',
      qpQuery: qpArg.toLowerCase(),
      tokens: [],
      isPureNumber: false,
      baseNum: null,
      rawQuery: trimmed
    }
  }

  const hasPlus = trimmed.includes('+')
  const tokens = hasPlus
    ? trimmed.split('+').map(t => t.trim().toLowerCase()).filter(Boolean)
    : trimmed.split(/\s+/).map(t => t.trim().toLowerCase()).filter(Boolean)

  const isPureNumber = /^[qQ]?\d+[a-z0-9()]*$/i.test(trimmed)
  const numMatch = trimmed.match(/^[qQ]?(\d+)/)
  const baseNum = numMatch ? numMatch[1] : null

  return {
    mode: 'keyword',
    tokens,
    isPureNumber,
    baseNum,
    rawQuery: trimmed
  }
}

export function useQuestionSearch(client: any, showToast?: (msg: string) => void, getSeries?: () => string) {
  const { t, locale } = useI18n()
  const sqKeyword = ref('')
  const sqSelectedPaper = ref('')
  const sqPaperOptions = ref<string[]>([])

  const mcqKeyword = ref('')
  const mcqSelectedPaper = ref('')
  const mcqPaperOptions = ref<string[]>([])

  // In-Memory Catalog State
  const inMemoryCatalog = ref<any[]>([])
  const isCatalogReady = ref(false)
  const isCatalogLoading = ref(false)
  let allFilteredLocalResults: any[] = []

  // Search Results & Infinite Scroll State
  const isSearchMode = ref(false)
  const searchActiveType = ref<'SQ' | 'MCQ'>('SQ')
  const searchActiveKeyword = ref('')
  const searchActivePaper = ref('')
  const searchResults = ref<any[]>([])
  const searchTotalCount = ref(0)
  const searchTotalSubCount = ref(0)
  const searchPage = ref(0)
  const isSearching = ref(false)
  const isLoadingMore = ref(false)
  const hasMoreSearch = ref(false)
  const SEARCH_PAGE_SIZE = 10
  const searchExpandedAnswers = ref<Record<string | number, boolean>>({})

  // Initialize and warm up catalog for the current series
  async function warmUpCatalog(seriesId: string) {
    if (!seriesId) return
    if (isCatalogReady.value && inMemoryCatalog.value.length > 1000) return

    // 1. Try reading from IndexedDB first (0ms network)
    const cached = await getCachedPoolOrCatalog(seriesId)
    const isTruncated = cached && cached.length === 1000

    if (cached && cached.length > 0) {
      inMemoryCatalog.value = cached
      isCatalogReady.value = true
      populatePaperOptions(cached)
    }

    // 2. Fetch fresh complete catalog if not cached or previously truncated to 1000 rows
    if (!cached || cached.length < 50 || isTruncated) {
      isCatalogLoading.value = true
      try {
        const allRows = await fetchAllSubjectRows(client, seriesId)
        if (allRows && allRows.length > 0) {
          inMemoryCatalog.value = allRows
          isCatalogReady.value = true
          populatePaperOptions(allRows)
          await setCachedCatalog(seriesId, allRows)
        }
      } catch (err) {
        console.warn('Background catalog sync failed:', err)
      } finally {
        isCatalogLoading.value = false
      }
    }
  }

  function populatePaperOptions(items: any[]) {
    const sqSet = new Set<string>()
    const mcqSet = new Set<string>()
    for (const item of items) {
      if (item.paper_filename) {
        if (item.paper_type === 'SQ') sqSet.add(item.paper_filename)
        if (item.paper_type === 'MCQ') mcqSet.add(item.paper_filename)
      }
    }
    sqPaperOptions.value = Array.from(sqSet).sort()
    mcqPaperOptions.value = Array.from(mcqSet).sort()
  }

  // Lighting-Fast In-Memory Search (~1ms execution)
  function performLocalSearch() {
    const type = searchActiveType.value
    const rawKw = searchActiveKeyword.value.trim()
    const paper = searchActivePaper.value
    const parsed = parseSearchQuery(rawKw)

    if (type === 'MCQ') {
      const filtered = inMemoryCatalog.value.filter(item => {
        if (item.paper_type !== 'MCQ') return false
        if (paper && item.paper_filename !== paper) return false

        if (parsed.mode === 'qp') {
          if (!parsed.qpQuery) return true
          const pFile = String(item.paper_filename || '').toLowerCase()
          const pId = String(item.id || '').toLowerCase()
          return pFile.includes(parsed.qpQuery) || pId.includes(parsed.qpQuery)
        }

        if (parsed.tokens.length === 0) return true

        const rawNum = String(item.question_raw_number || '').toLowerCase()
        const pFile = String(item.paper_filename || '').toLowerCase()
        const details = String(item.details || '').toLowerCase()
        const itemId = String(item.id || '').toLowerCase()

        if (parsed.isPureNumber && parsed.baseNum) {
          if (rawNum === parsed.baseNum || itemId.includes(`_q${parsed.baseNum}`)) {
            return true
          }
        }

        return parsed.tokens.every(tok =>
          details.includes(tok) || rawNum.includes(tok) || pFile.includes(tok) || itemId.includes(tok)
        )
      })

      filtered.sort((a, b) => {
        if (a.paper_filename !== b.paper_filename) {
          return (b.paper_filename || '').localeCompare(a.paper_filename || '')
        }
        if (a.start_page !== b.start_page) {
          return (a.start_page || 0) - (b.start_page || 0)
        }
        return (a.start_y || 0) - (b.start_y || 0)
      })

      allFilteredLocalResults = filtered
      searchTotalCount.value = filtered.length
      searchTotalSubCount.value = filtered.length
      searchPage.value = 0
      searchResults.value = filtered.slice(0, SEARCH_PAGE_SIZE)
      hasMoreSearch.value = filtered.length > SEARCH_PAGE_SIZE
      isSearching.value = false
      isLoadingMore.value = false
      return
    }

    // --- SQ SEARCH: Big Question Grouping & Matched Sub-part Highlighting ---
    const sqRows = inMemoryCatalog.value.filter(r => r.paper_type === 'SQ')
    
    // Group all SQ rows by (paper_filename, main_question_number)
    const groupsMap = new Map<string, {
      groupKey: string
      paper_filename: string
      main_question_number: string
      subQuestions: any[]
    }>()

    for (const row of sqRows) {
      if (paper && row.paper_filename !== paper) continue

      const mainNum = getMainQuestionNumber(row.question_raw_number)
      const groupKey = `${row.paper_filename}___${mainNum}`

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          groupKey,
          paper_filename: row.paper_filename,
          main_question_number: mainNum,
          subQuestions: []
        })
      }
      groupsMap.get(groupKey)!.subQuestions.push(row)
    }

    const matchedBigQuestions: any[] = []
    let totalMatchedSubQuestions = 0

    for (const group of groupsMap.values()) {
      // Sort subquestions chronologically within big question
      group.subQuestions.sort((a, b) => {
        if (a.start_page !== b.start_page) return (a.start_page || 0) - (b.start_page || 0)
        return (a.start_y || 0) - (b.start_y || 0)
      })

      let isGroupMatched = false
      let matchedSubQIds: string[] = []

      if (parsed.mode === 'qp') {
        if (!parsed.qpQuery) {
          isGroupMatched = true
          matchedSubQIds = group.subQuestions.map(s => s.id)
        } else {
          const pFile = String(group.paper_filename || '').toLowerCase()
          const matchesPaper = pFile.includes(parsed.qpQuery) || group.subQuestions.some(s => String(s.id || '').toLowerCase().includes(parsed.qpQuery!))
          if (matchesPaper) {
            isGroupMatched = true
            matchedSubQIds = group.subQuestions.map(s => s.id)
          }
        }
      } else if (parsed.tokens.length === 0) {
        isGroupMatched = true
        matchedSubQIds = group.subQuestions.map(s => s.id)
      } else if (parsed.isPureNumber && parsed.baseNum) {
        const matchesMainNum = group.main_question_number === parsed.baseNum
        const matchesSubNum = group.subQuestions.some(s => {
          const raw = String(s.question_raw_number || '').toLowerCase()
          const idStr = String(s.id || '').toLowerCase()
          return raw === parsed.baseNum || raw.startsWith(`${parsed.baseNum}(`) || idStr.includes(`_q${parsed.baseNum}`)
        })

        if (matchesMainNum || matchesSubNum) {
          isGroupMatched = true
          const specificMatches = group.subQuestions.filter(s => {
            const raw = String(s.question_raw_number || '').toLowerCase()
            const idStr = String(s.id || '').toLowerCase()
            return raw === parsed.baseNum || raw.startsWith(`${parsed.baseNum}(`) || idStr.includes(`_q${parsed.baseNum}`)
          })
          matchedSubQIds = (specificMatches.length > 0 ? specificMatches : group.subQuestions).map(s => s.id)
        }
      } else {
        // Keyword mode with tokens (e.g. "gravity + field" or "circular motion")
        // Check if the big question AS A WHOLE contains all tokens
        const combinedText = group.subQuestions.map(s => 
          `${s.details || ''} ${s.question_raw_number || ''} ${s.paper_filename || ''} ${s.id || ''}`
        ).join(' ').toLowerCase()

        const groupMatchesAllTokens = parsed.tokens.every(tok => combinedText.includes(tok))

        if (groupMatchesAllTokens) {
          isGroupMatched = true
          // Identify which individual sub-questions contributed to matching
          // 1. First, check if any sub-question matches ALL tokens
          const subsMatchingAll = group.subQuestions.filter(s => {
            const sText = `${s.details || ''} ${s.question_raw_number || ''} ${s.paper_filename || ''} ${s.id || ''}`.toLowerCase()
            return parsed.tokens.every(tok => sText.includes(tok))
          })

          if (subsMatchingAll.length > 0) {
            matchedSubQIds = subsMatchingAll.map(s => s.id)
          } else {
            // Tokens are spread across multiple sub-questions; highlight all sub-questions matching ANY token
            const subsMatchingAny = group.subQuestions.filter(s => {
              const sText = `${s.details || ''} ${s.question_raw_number || ''} ${s.paper_filename || ''} ${s.id || ''}`.toLowerCase()
              return parsed.tokens.some(tok => sText.includes(tok))
            })
            matchedSubQIds = subsMatchingAny.map(s => s.id)
          }
        }
      }

      if (isGroupMatched) {
        totalMatchedSubQuestions += matchedSubQIds.length
        const totalScore = group.subQuestions.reduce((sum, s) => sum + (Number(s.score) || 0), 0)
        matchedBigQuestions.push({
          id: group.groupKey,
          series: group.subQuestions[0]?.series,
          paper_filename: group.paper_filename,
          paper_type: 'SQ' as const,
          main_question_number: group.main_question_number,
          question_raw_number: group.main_question_number,
          score: totalScore,
          matchedSubQIds: matchedSubQIds,
          subQuestions: group.subQuestions,
          primaryQuestion: group.subQuestions[0],
          details: group.subQuestions[0]?.details
        })
      }
    }

    // Sort Big Questions: paper_filename DESC, then numeric main_question_number ASC
    matchedBigQuestions.sort((a, b) => {
      if (a.paper_filename !== b.paper_filename) {
        return (b.paper_filename || '').localeCompare(a.paper_filename || '')
      }
      const numA = parseInt(a.main_question_number, 10) || 0
      const numB = parseInt(b.main_question_number, 10) || 0
      return numA - numB
    })

    allFilteredLocalResults = matchedBigQuestions
    searchTotalCount.value = matchedBigQuestions.length
    searchTotalSubCount.value = totalMatchedSubQuestions
    searchPage.value = 0
    searchResults.value = matchedBigQuestions.slice(0, SEARCH_PAGE_SIZE)
    hasMoreSearch.value = matchedBigQuestions.length > SEARCH_PAGE_SIZE
    isSearching.value = false
    isLoadingMore.value = false
  }

  async function triggerSearch(type: 'SQ' | 'MCQ') {
    searchActiveType.value = type
    searchActiveKeyword.value = (type === 'SQ' ? sqKeyword.value : mcqKeyword.value).trim()
    searchActivePaper.value = type === 'SQ' ? sqSelectedPaper.value : mcqSelectedPaper.value

    if (!searchActiveKeyword.value && !searchActivePaper.value) {
      if (showToast) showToast(locale.value === 'zh' ? `请输入 ${type} 搜索关键词或指定试卷` : `Please enter ${type} search keywords or select paper`)
      return
    }

    isSearchMode.value = true
    isSearching.value = true
    searchPage.value = 0
    searchResults.value = []
    searchTotalCount.value = 0
    searchTotalSubCount.value = 0
    searchExpandedAnswers.value = {}

    // Ensure catalog is ready
    if (!isCatalogReady.value && getSeries) {
      await warmUpCatalog(getSeries())
    }

    if (isCatalogReady.value && inMemoryCatalog.value.length > 0) {
      performLocalSearch()
      return
    }

    // Fallback: network search if catalog not yet ready
    await fetchSearchPage(0)
  }

  function searchPaper(paperFilename: string, type: 'SQ' | 'MCQ' = 'SQ') {
    if (!paperFilename) return
    if (type === 'SQ') {
      sqKeyword.value = `qp:${paperFilename}`
    } else {
      mcqKeyword.value = `qp:${paperFilename}`
    }
    triggerSearch(type)
  }

  async function fetchSearchPage(page: number) {
    try {
      let query = client
        .from('questions_data')
        .select('*', { count: 'exact' })
        .eq('paper_type', searchActiveType.value)

      if (searchActivePaper.value) {
        query = query.eq('paper_filename', searchActivePaper.value)
      } else if (getSeries && getSeries()) {
        query = query.eq('series', getSeries())
      }

      const rawKw = searchActiveKeyword.value.trim()
      const parsed = parseSearchQuery(rawKw)

      if (parsed.mode === 'qp' && parsed.qpQuery) {
        query = query.or(`paper_filename.ilike.%${parsed.qpQuery}%,id.ilike.%${parsed.qpQuery}%`)
      } else if (parsed.tokens.length > 0) {
        if (parsed.isPureNumber && parsed.baseNum) {
          query = query.or(`question_raw_number.eq.${parsed.baseNum},question_raw_number.ilike.${parsed.baseNum}(%,id.ilike.%_q${parsed.baseNum}%`)
        } else {
          const wildcardJoined = parsed.tokens.join('%')
          query = query.or(`id.ilike.%${wildcardJoined}%,paper_filename.ilike.%${wildcardJoined}%,details.ilike.%${wildcardJoined}%`)
        }
      }

      query = query
        .order('paper_filename', { ascending: false })
        .order('start_page', { ascending: true })
        .order('start_y', { ascending: true })
        .range(page * SEARCH_PAGE_SIZE, (page + 1) * SEARCH_PAGE_SIZE - 1)

      const { data, count, error } = await query
      if (error) throw error

      if (searchActiveType.value === 'MCQ') {
        if (page === 0) {
          searchResults.value = data || []
        } else {
          searchResults.value = [...searchResults.value, ...(data || [])]
        }
        searchTotalCount.value = count || 0
      } else {
        // Format fallback SQ data
        const rows = data || []
        const fallbackGroups = rows.map((r: any) => ({
          id: r.id,
          series: r.series,
          paper_filename: r.paper_filename,
          paper_type: 'SQ' as const,
          main_question_number: getMainQuestionNumber(r.question_raw_number),
          question_raw_number: r.question_raw_number,
          score: r.score,
          matchedSubQIds: [r.id],
          subQuestions: [r],
          primaryQuestion: r,
          details: r.details
        }))
        if (page === 0) {
          searchResults.value = fallbackGroups
        } else {
          searchResults.value = [...searchResults.value, ...fallbackGroups]
        }
        searchTotalCount.value = count || 0
      }

      searchPage.value = page
      hasMoreSearch.value = searchResults.value.length < (count || 0)
    } catch (err: any) {
      console.error('Search error:', err)
      if (showToast) showToast((locale.value === 'zh' ? '搜索失败: ' : 'Search failed: ') + err.message)
    } finally {
      isSearching.value = false
      isLoadingMore.value = false
    }
  }

  async function loadMoreSearchResults() {
    if (isSearching.value || isLoadingMore.value || !hasMoreSearch.value) return
    isLoadingMore.value = true

    if (isCatalogReady.value && inMemoryCatalog.value.length > 0) {
      const nextPage = searchPage.value + 1
      const nextBatch = allFilteredLocalResults.slice(nextPage * SEARCH_PAGE_SIZE, (nextPage + 1) * SEARCH_PAGE_SIZE)
      searchResults.value = [...searchResults.value, ...nextBatch]
      searchPage.value = nextPage
      hasMoreSearch.value = searchResults.value.length < allFilteredLocalResults.length
      isLoadingMore.value = false
      return
    }

    await fetchSearchPage(searchPage.value + 1)
  }

  function exitSearchMode() {
    isSearchMode.value = false
  }

  return {
    sqKeyword,
    sqSelectedPaper,
    sqPaperOptions,
    mcqKeyword,
    mcqSelectedPaper,
    mcqPaperOptions,
    isCatalogReady,
    isSearchMode,
    searchActiveType,
    searchActiveKeyword,
    searchActivePaper,
    searchResults,
    searchTotalCount,
    searchTotalSubCount,
    searchPage,
    isSearching,
    isLoadingMore,
    hasMoreSearch,
    searchExpandedAnswers,
    warmUpCatalog,
    triggerSearch,
    searchPaper,
    fetchSearchPage,
    loadMoreSearchResults,
    exitSearchMode
  }
}
