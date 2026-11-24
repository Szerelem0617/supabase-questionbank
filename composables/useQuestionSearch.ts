import { ref } from 'vue'
import { fetchAllSubjectRows } from '~/composables/useSubjectPool'
import { getPaperGroup, normalizePaperType, type PaperGroupOption } from '~/composables/usePaperGroup'

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
  // 1. Try reading from PhysicsPoolDB_v3 first (already populated by useSubjectPool)
  try {
    const poolDb = await openDB('PhysicsPoolDB_v3', 'pools')
    const poolData = await new Promise<any[]>((resolve) => {
      const tx = poolDb.transaction('pools', 'readonly')
      const req = tx.objectStore('pools').get(series)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
    if (poolData && poolData.length > 0) return poolData
  } catch {}

  // 2. Fallback to PhysicsCatalogDB_v3
  try {
    const catDb = await openDB('PhysicsCatalogDB_v3', 'catalogs')
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
    const poolDb = await openDB('PhysicsPoolDB_v3', 'pools')
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

function normalizeQNumStr(str: string): string {
  if (!str) return ''
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function matchesSubQuestionNumber(rawQNum: string, targetSubNorm: string): boolean {
  if (!rawQNum || !targetSubNorm) return false
  const norm = normalizeQNumStr(rawQNum)
  if (norm === targetSubNorm) return true
  if (norm.startsWith(targetSubNorm)) return true
  // Handle Arabic numeral typed instead of roman (e.g. "q1b1" for "1(b)(i)")
  const romanVariant = targetSubNorm.replace(/1+$/, (m) => 'i'.repeat(m.length))
  if (norm === romanVariant || norm.startsWith(romanVariant)) return true
  return false
}

export interface QuestionSpecifier {
  raw: string
  mainNum: string          // e.g. "1", "3", "37"
  subNormalized: string    // e.g. "1bi", "1b", "3"
  isSpecificSub: boolean   // true if subpart like (a), (b)(i) is present
}

export interface ParsedQuery {
  mode: 'qp' | 'keyword'
  qpQuery?: string
  tokens: string[]         // ordinary text tokens (keywords or pure numbers)
  qSpecifier: QuestionSpecifier | null
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
      qSpecifier: null,
      rawQuery: trimmed
    }
  }

  // Pre-normalize: normalize "q 3", "q:3", "Q 3" into "q3"
  const preNormalized = trimmed.replace(/\b[qQ][:\s]+(\d)/g, 'q$1')

  // Split by '+' or whitespace
  const rawParts = preNormalized.replace(/\+/g, ' ').split(/\s+/).map(p => p.trim()).filter(Boolean)

  let qSpecifier: QuestionSpecifier | null = null
  const tokens: string[] = []

  for (const part of rawParts) {
    const lower = part.toLowerCase()
    // A question number specifier must start with 'q' followed immediately by digits:
    // e.g., "q1", "q3", "q37", "q1bi", "q1(b)(i)", "q2a"
    const qMatch = lower.match(/^q(\d+.*)$/)
    if (qMatch && !qSpecifier) {
      const rest = qMatch[1]
      const mainDigitsMatch = rest.match(/^(\d+)/)
      const mainNum = mainDigitsMatch ? mainDigitsMatch[1] : ''
      const subNormalized = normalizeQNumStr(rest)
      const isSpecificSub = subNormalized.length > mainNum.length

      qSpecifier = {
        raw: part,
        mainNum,
        subNormalized,
        isSpecificSub
      }
    } else {
      tokens.push(lower)
    }
  }

  return {
    mode: 'keyword',
    tokens,
    qSpecifier,
    rawQuery: trimmed
  }
}

export function useQuestionSearch(client: any, showToast?: (msg: string) => void, getSeries?: () => string) {
  const { t, locale } = useI18n()
  const sqKeyword = ref('')
  const sqSelectedPaper = ref('')
  const sqPaperOptions = ref<PaperGroupOption[]>([])

  const mcqKeyword = ref('')
  const mcqSelectedPaper = ref('')
  const mcqPaperOptions = ref<PaperGroupOption[]>([])

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

    // 1. Try reading from IndexedDB first (0ms network)
    const cached = await getCachedPoolOrCatalog(seriesId)

    if (cached && cached.length > 0) {
      inMemoryCatalog.value = cached
      isCatalogReady.value = true
      populatePaperOptions(cached)
    }

    // 2. Check if server has different count (e.g. newly added papers or truncated)
    let needsFetch = !cached || cached.length < 50 || cached.length === 1000
    if (cached && cached.length > 0 && !needsFetch) {
      try {
        const { count: serverCount, error: countErr } = await client
          .from('questions_data')
          .select('id', { count: 'exact', head: true })
          .eq('series', seriesId)
        if (!countErr && typeof serverCount === 'number' && serverCount !== cached.length) {
          needsFetch = true
        }
      } catch {}
    }

    // 3. Fetch fresh complete catalog if not cached or cache is stale
    if (needsFetch) {
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
    const sqMap = new Map<string, PaperGroupOption>()
    const mcqMap = new Map<string, PaperGroupOption>()

    for (const item of items) {
      if (!item) continue
      const pType = normalizePaperType(item.paper_type, item.paper_filename, item.id, item.series, item.image_path)
      const group = getPaperGroup(item.paper_filename, item.id, pType, item.series, item.image_path)
      if (pType === 'SQ') {
        if (!sqMap.has(group.value)) sqMap.set(group.value, group)
      } else if (pType === 'MCQ') {
        if (!mcqMap.has(group.value)) mcqMap.set(group.value, group)
      }
    }

    const sortFn = (a: PaperGroupOption, b: PaperGroupOption) => a.value.localeCompare(b.value, undefined, { numeric: true })
    sqPaperOptions.value = Array.from(sqMap.values()).sort(sortFn)
    mcqPaperOptions.value = Array.from(mcqMap.values()).sort(sortFn)
  }

  // Lighting-Fast In-Memory Search (~1ms execution)
  function performLocalSearch() {
    const type = searchActiveType.value
    const rawKw = searchActiveKeyword.value.trim()
    const paper = searchActivePaper.value
    const parsed = parseSearchQuery(rawKw)

    if (type === 'MCQ') {
      const filtered = inMemoryCatalog.value.filter(item => {
        const itemPType = normalizePaperType(item.paper_type, item.paper_filename, item.id, item.series, item.image_path)
        if (itemPType !== 'MCQ') return false
        if (paper) {
          const group = getPaperGroup(item.paper_filename, item.id, itemPType, item.series, item.image_path)
          if (group.value !== paper && item.paper_filename !== paper) return false
        }

        if (parsed.mode === 'qp') {
          if (!parsed.qpQuery) return true
          const pFile = String(item.paper_filename || '').toLowerCase()
          const pId = String(item.id || '').toLowerCase()
          return pFile.includes(parsed.qpQuery) || pId.includes(parsed.qpQuery)
        }

        const itemRawNum = String(item.question_raw_number || '').toLowerCase()
        const pFile = String(item.paper_filename || '').toLowerCase()
        const details = String(item.details || '').toLowerCase()
        const itemId = String(item.id || '').toLowerCase()

        // 1. If user specified a question number (e.g. q37 or q3)
        if (parsed.qSpecifier) {
          const mainNum = parsed.qSpecifier.mainNum
          const qNumMatch = itemRawNum === mainNum ||
                            getMainQuestionNumber(itemRawNum) === mainNum ||
                            itemId.includes(`_q${mainNum}`)
          if (!qNumMatch) return false
        }

        // 2. If no tokens and no qSpecifier, match all
        if (parsed.tokens.length === 0 && !parsed.qSpecifier) return true

        // 3. Match keyword tokens
        if (parsed.tokens.length > 0) {
          return parsed.tokens.every(tok => {
            // Pure number token (e.g. "1" or "37"): matches ONLY inside details text, NEVER question number!
            const isNum = /^\d+$/.test(tok)
            if (isNum) {
              return details.includes(tok)
            }
            return details.includes(tok) || pFile.includes(tok) || itemId.includes(tok)
          })
        }

        return true
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
    const sqRows = inMemoryCatalog.value.filter(r => {
      const pType = normalizePaperType(r.paper_type, r.paper_filename, r.id, r.series, r.image_path)
      return pType === 'SQ'
    })
    
    // Group all SQ rows by (paper_filename, main_question_number)
    const groupsMap = new Map<string, {
      groupKey: string
      paper_filename: string
      main_question_number: string
      subQuestions: any[]
    }>()

    for (const row of sqRows) {
      if (paper) {
        const group = getPaperGroup(row.paper_filename, row.id, row.paper_type, row.series, row.image_path)
        if (group.value !== paper && row.paper_filename !== paper) continue
      }

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
      } else if (parsed.tokens.length === 0 && !parsed.qSpecifier) {
        isGroupMatched = true
        matchedSubQIds = group.subQuestions.map(s => s.id)
      } else {
        // Step 1: Question Specifier Check (e.g. q3, q1bi)
        if (parsed.qSpecifier) {
          if (group.main_question_number !== parsed.qSpecifier.mainNum) {
            continue
          }

          if (parsed.qSpecifier.isSpecificSub) {
            const specificSubs = group.subQuestions.filter(s =>
              matchesSubQuestionNumber(s.question_raw_number, parsed.qSpecifier!.subNormalized)
            )
            if (specificSubs.length === 0) {
              continue
            }
            matchedSubQIds = specificSubs.map(s => s.id)
          } else {
            matchedSubQIds = group.subQuestions.map(s => s.id)
          }
        }

        // Step 2: Keyword tokens check (e.g. "train" in "q3 + train" or "1" in "1")
        if (parsed.tokens.length > 0) {
          // Check if big question contains all tokens
          // Pure numbers (e.g. "1", "37") match ONLY inside details text, NEVER question number!
          const groupMatchesAllTokens = parsed.tokens.every(tok => {
            const isNum = /^\d+$/.test(tok)
            return group.subQuestions.some(s => {
              const details = String(s.details || '').toLowerCase()
              if (isNum) {
                return details.includes(tok)
              }
              const pFile = String(s.paper_filename || '').toLowerCase()
              const sId = String(s.id || '').toLowerCase()
              return details.includes(tok) || pFile.includes(tok) || sId.includes(tok)
            })
          })

          if (!groupMatchesAllTokens) {
            continue
          }

          // If keyword matched, refine matchedSubQIds to sub-questions that actually contain the keyword tokens
          const candidateSubs = (parsed.qSpecifier && parsed.qSpecifier.isSpecificSub)
            ? group.subQuestions.filter(s => matchedSubQIds.includes(s.id))
            : group.subQuestions

          const subsMatchingTokens = candidateSubs.filter(s => {
            const details = String(s.details || '').toLowerCase()
            const pFile = String(s.paper_filename || '').toLowerCase()
            const sId = String(s.id || '').toLowerCase()
            return parsed.tokens.every(tok => {
              const isNum = /^\d+$/.test(tok)
              if (isNum) return details.includes(tok)
              return details.includes(tok) || pFile.includes(tok) || sId.includes(tok)
            })
          })

          if (subsMatchingTokens.length > 0) {
            matchedSubQIds = subsMatchingTokens.map(s => s.id)
          } else {
            const subsMatchingAny = candidateSubs.filter(s => {
              const details = String(s.details || '').toLowerCase()
              return parsed.tokens.some(tok => details.includes(tok))
            })
            if (subsMatchingAny.length > 0) {
              matchedSubQIds = subsMatchingAny.map(s => s.id)
            } else if (matchedSubQIds.length === 0) {
              matchedSubQIds = group.subQuestions.map(s => s.id)
            }
          }
        }

        isGroupMatched = true
        if (matchedSubQIds.length === 0) {
          matchedSubQIds = group.subQuestions.map(s => s.id)
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
        const pVal = searchActivePaper.value.toLowerCase()
        if (pVal.startsWith('p') && /^p\d+$/.test(pVal)) {
          const pNum = pVal.slice(1)
          const seriesStr = String(getSeries ? getSeries() : '').toLowerCase()
          const is0625 = seriesStr.includes('0625')
          if (is0625 && pNum === '2') {
            query = query.or(`paper_filename.ilike.%_qp_2%,paper_filename.ilike.%_qp_1%,paper_filename.ilike.%_qp_2%.pdf,paper_filename.ilike.%_qp_1%.pdf,paper_filename.ilike.%_p2%,paper_filename.ilike.%_p1%,paper_filename.ilike.%_2%.pdf,paper_filename.ilike.%_1%.pdf,id.ilike.%_2%_q%,id.ilike.%_1%_q%`)
          } else {
            query = query.or(`paper_filename.ilike.%_qp_${pNum}%,paper_filename.ilike.%_qp_${pNum}%.pdf,paper_filename.ilike.%_p${pNum}%,paper_filename.ilike.%_${pNum}%.pdf,id.ilike.%_${pNum}%_q%`)
          }
        } else if (pVal.startsWith('u') && /^u\d+$/.test(pVal)) {
          query = query.ilike('paper_filename', `%_${pVal}%`)
        } else {
          query = query.eq('paper_filename', searchActivePaper.value)
        }
      } else if (getSeries && getSeries()) {
        query = query.eq('series', getSeries())
      }

      const rawKw = searchActiveKeyword.value.trim()
      const parsed = parseSearchQuery(rawKw)

      if (parsed.mode === 'qp' && parsed.qpQuery) {
        query = query.or(`paper_filename.ilike.%${parsed.qpQuery}%,id.ilike.%${parsed.qpQuery}%`)
      } else {
        if (parsed.qSpecifier) {
          const mainNum = parsed.qSpecifier.mainNum
          if (parsed.qSpecifier.isSpecificSub) {
            query = query.or(`question_raw_number.ilike.${mainNum}(%,id.ilike.%_q${mainNum}%`)
          } else {
            query = query.or(`question_raw_number.eq.${mainNum},question_raw_number.ilike.${mainNum}(%,id.ilike.%_q${mainNum}%`)
          }
        }
        if (parsed.tokens.length > 0) {
          for (const tok of parsed.tokens) {
            const isNum = /^\d+$/.test(tok)
            if (isNum) {
              query = query.ilike('details', `%${tok}%`)
            } else {
              query = query.or(`id.ilike.%${tok}%,paper_filename.ilike.%${tok}%,details.ilike.%${tok}%`)
            }
          }
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
