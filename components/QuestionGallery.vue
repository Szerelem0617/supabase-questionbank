<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useFavorites, getItemSubject } from '~/composables/useFavorites'
import { useQuestionSearch } from '~/composables/useQuestionSearch'
import { useDanmaku, MOCK_SUBQ_COMMENTS, checkIsLiked } from '~/composables/useDanmaku'
import { useImageStitcher } from '~/composables/useImageStitcher'
import { getSubjectSeedQuestion } from '~/composables/useSeedQuestion'
import { useSubjectPool } from '~/composables/useSubjectPool'

import DualSearchBar from './gallery/DualSearchBar.vue'
import DanmakuStage from './gallery/DanmakuStage.vue'
import UnifiedQuestionStream from './gallery/UnifiedQuestionStream.vue'
import QuickAlbumPicker from './gallery/QuickAlbumPicker.vue'

const props = defineProps({
  subjectId: {
    type: String,
    default: 'CAIE-AL-9702'
  }
})

const { t, locale } = useI18n()
const client = useSupabaseClient()
const config = useRuntimeConfig()
const cdnBase = computed(() => config.public.cdnBaseUrl || 'https://assets.66367749.xyz')
const r2DevUrl = computed(() => config.public.r2DevUrl || 'https://pub-b20547c0488b456f8b6c033d9a7a1ca1.r2.dev')

// --- Toast & Xiaohongshu Album Picker State ---
const toastMessage = ref('')
const showToastNotification = ref(false)
const toastLastFavoritedItem = ref(null)
let toastTimer = null

function showToast(msg) {
  toastMessage.value = msg
  toastLastFavoritedItem.value = null
  showToastNotification.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    showToastNotification.value = false
  }, 2800)
}

function showFavoriteToast(msg, favItem = null) {
  toastMessage.value = msg
  toastLastFavoritedItem.value = favItem
  showToastNotification.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    showToastNotification.value = false
    toastLastFavoritedItem.value = null
  }, 4800)
}

// --- Composables Layer ---
const favoritesStore = useFavorites()
const poolStore = useSubjectPool(client)
const searchStore = useQuestionSearch(client, showToast, () => props.subjectId)
const danmakuStore = useDanmaku()
const stitcherStore = useImageStitcher()

// --- Core Gallery & Question State ---
const loading = ref(true)
const loadingText = ref('Loading questions...')
const currentQuestionData = ref(null)
const groupQuestions = ref([])

// Navigation & Unified Stream State (Scheme D)
const unifiedStreamRef = ref(null)
const selectedPaper = ref('')
const availablePapers = poolStore.availablePapers
const currentIndex = poolStore.currentIndex
const totalCount = computed(() => poolStore.groupedQuestions.value.length)
const questionList = computed(() => poolStore.groupedQuestions.value)

// Mode and Dataset resolution for Unified Stream
const currentMode = computed(() => {
  if (favoritesStore.isFavoriteMode.value) return 'favorites'
  if (searchStore.isSearchMode.value) return 'search'
  return 'normal'
})

const currentStreamQuestions = computed(() => {
  if (favoritesStore.isFavoriteMode.value) {
    return filteredFavoriteItems.value
  }
  if (searchStore.isSearchMode.value) {
    return searchStore.searchResults.value
  }
  if (selectedPaper.value) {
    return poolStore.groupedQuestions.value.filter(g => g.paper_filename === selectedPaper.value)
  }
  return poolStore.groupedQuestions.value
})

function initSeedQuestion() {
  const seed = getSubjectSeedQuestion(props.subjectId)
  if (seed) {
    currentQuestionData.value = seed.primaryQuestion
    groupQuestions.value = seed.groupQuestions
    loading.value = false
    loadingText.value = ''
  }
}

// Immediately seed deterministic initial question for 0ms instant display
initSeedQuestion()

// Subquestion individual states
const expandedAnswers = ref({})
const expandedComments = ref({})
const isShortSubQ = ref({})
const subQComments = ref({})
const newCommentText = ref({})
const submittingComment = ref({})

// Favorites Viewport Mode & Filters (Synchronized with global favorites store)
const isFavoriteMode = favoritesStore.isFavoriteMode
const favFilterBoard = ref('')
const favFilterType = ref('')
const favFilterPaper = ref('')

// Subject Scoping Rule:
// When viewing favorites from a Subject page, default to current subject (props.subjectId).
// When viewing from Home page, default to 'ALL'.
// Users can also freely toggle/select between 'ALL', current subject, or any subject with items.
const favFilterSubject = ref(favoritesStore.targetSubjectScope.value || props.subjectId || 'ALL')

watch(() => favoritesStore.targetSubjectScope.value, (newScope) => {
  if (newScope) {
    favFilterSubject.value = newScope
  }
})

watch(() => props.subjectId, (newSubj) => {
  if (newSubj && favoritesStore.targetSubjectScope.value !== 'ALL') {
    favFilterSubject.value = newSubj
  }
})

// Compute items for the currently active folder
const currentFolderAllItems = computed(() => {
  return favoritesStore.favorites.value.filter(
    item => item.folderId === favoritesStore.activeFolderId.value
  )
})

// Available subjects present in the active folder
const favAvailableSubjects = computed(() => {
  const map = new Map()
  currentFolderAllItems.value.forEach(item => {
    const subj = item.series || getItemSubject(item) || 'CAIE-AL-9702'
    map.set(subj, (map.get(subj) || 0) + 1)
  })
  return Array.from(map.entries()).map(([id, count]) => ({ id, count }))
})

const favAvailablePapers = computed(() => {
  const set = new Set()
  currentFolderAllItems.value.forEach(item => {
    if (item.paperFilename) set.add(item.paperFilename)
  })
  return Array.from(set).sort()
})

const filteredFavoriteItems = computed(() => {
  return currentFolderAllItems.value.filter(item => {
    // Subject filter
    if (favFilterSubject.value && favFilterSubject.value !== 'ALL') {
      const itemSubj = item.series || getItemSubject(item) || 'CAIE-AL-9702'
      if (itemSubj !== favFilterSubject.value) return false
    }
    if (favFilterBoard.value && item.board !== favFilterBoard.value) return false
    if (favFilterType.value && item.paperType !== favFilterType.value) return false
    if (favFilterPaper.value && item.paperFilename !== favFilterPaper.value) return false
    return true
  })
})

// Danmaku computed stream for current question
const allDanmakuList = computed(() => {
  if (!danmakuStore.danmakuEnabled.value || groupQuestions.value.length === 0) return []
  const list = []
  groupQuestions.value.forEach(subQ => {
    const comments = subQComments.value[subQ.id] || []
    comments.forEach(c => {
      list.push({
        id: c.id,
        subQId: subQ.id,
        qnum: subQ.question_raw_number,
        author: c.profiles?.display_name || c.author || '做题同学',
        message: c.message,
        time: c.time || '刚刚',
        likes: c.likes || 0,
        liked: c.liked || false
      })
    })
  })
  return list
})

// Favorite Status Helpers
const isWholeSqFav = computed(() => {
  if (!currentQuestionData.value) return false
  return favoritesStore.isQuestionFavorited(currentQuestionData.value.id, null)
})

function isSubQFav(subQId) {
  if (!currentQuestionData.value || !subQId) return false
  return favoritesStore.isQuestionFavorited(currentQuestionData.value.id, subQId)
}

const isMcqFav = computed(() => {
  if (!currentQuestionData.value) return false
  return favoritesStore.isQuestionFavorited(currentQuestionData.value.id, null)
})

function isSearchItemFav(qId) {
  return favoritesStore.isQuestionFavorited(qId, null)
}

// --- Methods & Handlers ---

// In-Memory cache for comments to avoid any network requests when flipping through questions
const subQCommentsCache = new Map()
let commentsDebounceTimer = null

function queueFetchComments(questions) {
  if (commentsDebounceTimer) clearTimeout(commentsDebounceTimer)
  commentsDebounceTimer = setTimeout(() => {
    questions.forEach(sub => {
      fetchSubQComments(sub.id, sub.question_raw_number)
    })
  }, 100)
}

// Display a question group completely from memory (0.01ms, 0 network)
function displayGroup(group) {
  if (!group) return
  currentQuestionData.value = group.primaryQuestion || group
  groupQuestions.value = (group.subQuestions && group.subQuestions.length > 0) ? group.subQuestions : [group]
  expandedAnswers.value = {}
  expandedComments.value = {}
  isShortSubQ.value = {}
  loading.value = false

  // Preload adjacent images into memory for 0ms next click
  poolStore.preloadAdjacentImages(poolStore.currentIndex.value, cdnBase.value, r2DevUrl.value)

  // Fetch comments in background without blocking UI (debounced to avoid network traffic during rapid navigation)
  queueFetchComments(groupQuestions.value)
}

// Filter current subject pool by paper
function filterByPaper(paper) {
  selectedPaper.value = paper
  if (!paper) {
    if (poolStore.groupedQuestions.value.length > 0) {
      poolStore.currentIndex.value = 0
      displayGroup(poolStore.groupedQuestions.value[0])
    }
    return
  }
  const filtered = poolStore.groupedQuestions.value.filter(g => g.paper_filename === paper)
  if (filtered.length > 0) {
    poolStore.currentIndex.value = 0
    displayGroup(filtered[0])
  }
}

// 4. Subquestion Comments Fetch & Add
async function fetchSubQComments(subQId, rawNum = '') {
  if (subQCommentsCache.has(subQId)) {
    subQComments.value[subQId] = subQCommentsCache.get(subQId)
    return
  }
  try {
    const { data, error } = await client
      .from('comments')
      .select('id, created_at, message, user_id, question_id, likes, profiles(display_name, avatar_url)')
      .eq('question_id', subQId)
      .order('created_at', { ascending: true })

    const dbComments = (!error && data) ? data.map(c => ({
      ...c,
      liked: checkIsLiked(c.id)
    })) : []

    const seedKey = String(rawNum).trim()
    const mockList = (MOCK_SUBQ_COMMENTS[seedKey] || MOCK_SUBQ_COMMENTS['default'] || []).map(m => ({
      ...m,
      isMock: true,
      liked: checkIsLiked(m.id)
    }))

    const combined = [...mockList, ...dbComments]
    subQCommentsCache.set(subQId, combined)
    subQComments.value[subQId] = combined
  } catch (err) {
    console.error('Error fetching subQ comments:', err)
    const fallback = (MOCK_SUBQ_COMMENTS['default'] || []).map(m => ({
      ...m,
      isMock: true,
      liked: checkIsLiked(m.id)
    }))
    subQCommentsCache.set(subQId, fallback)
    subQComments.value[subQId] = fallback
  }
}

async function addSubQComment(subQ) {
  const text = (newCommentText.value[subQ.id] || '').trim()
  if (!text) return

  submittingComment.value[subQ.id] = true
  try {
    const { data: { user } } = await client.auth.getUser()
    if (!user) {
      showToast(locale.value === 'zh' ? '⚠️ 请登录后发布做题笔记（笔记将自动弹幕上墙）' : '⚠️ Please sign in to post notes')
      return
    }

    const { data: inserted, error } = await client.from('comments').insert({
      message: text,
      user_id: user.id,
      question_id: subQ.id,
      sub_q_number: subQ.question_raw_number
    }).select('id, created_at, message, user_id, question_id, profiles(display_name, avatar_url)').single()

    if (error) throw error

    newCommentText.value[subQ.id] = ''
    if (!subQComments.value[subQ.id]) subQComments.value[subQ.id] = []
    subQComments.value[subQ.id].push(inserted)
    subQCommentsCache.set(subQ.id, subQComments.value[subQ.id])

    danmakuStore.initDanmakuSlots(allDanmakuList.value)
    showToast('💬 ' + t('toast.commentSuccess'))
  } catch (err) {
    console.error('Error posting comment:', err)
    showToast((locale.value === 'zh' ? '发布笔记失败: ' : 'Failed to post note: ') + err.message)
  } finally {
    submittingComment.value[subQ.id] = false
  }
}

// 5. Unified Stream Navigation & Smooth Snap Scrolling (Scheme D)
function handleNavNext() {
  if (typeof document === 'undefined') return
  const cards = Array.from(document.querySelectorAll('.stream-question-card'))
  if (!cards.length) return

  const nextCard = cards.find(card => {
    const rect = card.getBoundingClientRect()
    return rect.top > 130
  })

  if (nextCard) {
    const cardRect = nextCard.getBoundingClientRect()
    const targetY = window.scrollY + cardRect.top - 100
    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: 'smooth'
    })

    const index = cards.indexOf(nextCard)
    if (index >= cards.length - 3) {
      if (searchStore.isSearchMode.value && searchStore.hasMoreSearch.value && !searchStore.isLoadingMore.value) {
        searchStore.loadMoreSearchResults()
      }
      unifiedStreamRef.value?.loadMoreItems()
    }
  } else {
    if (searchStore.isSearchMode.value && searchStore.hasMoreSearch.value && !searchStore.isLoadingMore.value) {
      searchStore.loadMoreSearchResults()
    }
    unifiedStreamRef.value?.loadMoreItems()
  }
}

function handleNavPrev() {
  if (typeof document === 'undefined') return
  const cards = Array.from(document.querySelectorAll('.stream-question-card'))
  if (!cards.length) return

  let prevCard = null
  for (let i = cards.length - 1; i >= 0; i--) {
    const rect = cards[i].getBoundingClientRect()
    if (rect.top < 70) {
      prevCard = cards[i]
      break
    }
  }

  if (prevCard) {
    const cardRect = prevCard.getBoundingClientRect()
    const targetY = window.scrollY + cardRect.top - 100
    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: 'smooth'
    })
  } else {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

const isNavPrevDisabled = computed(() => {
  return currentStreamQuestions.value.length === 0
})

const isNavNextDisabled = computed(() => {
  return currentStreamQuestions.value.length === 0
})

function handleKeyDown(e) {
  if (typeof document === 'undefined') return
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) {
    return
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    handleNavPrev()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    handleNavNext()
  }
}

// Top-Left Favorites Folder Bar State
const isFolderDropdownOpen = ref(false)
const isCreatingFolder = ref(false)
const newFolderName = ref('')
const favDropdownRef = ref(null)

function formatFolderName(folder) {
  if (!folder) return ''
  if (folder.isDefault) return t('galleryNav.defaultFolder')
  return folder.name
}

function handleSelectFolderFromBar(folderId) {
  onSelectFolderFromDropdown(folderId)
  isFolderDropdownOpen.value = false
}

function handleCreateFolderFromBar() {
  const name = newFolderName.value.trim()
  if (!name) {
    isCreatingFolder.value = false
    return
  }
  handleCreateFolder(name)
  newFolderName.value = ''
  isCreatingFolder.value = false
  isFolderDropdownOpen.value = false
}

function handleGlobalClick(e) {
  if (favDropdownRef.value && !favDropdownRef.value.contains(e.target)) {
    isFolderDropdownOpen.value = false
    isCreatingFolder.value = false
  }
}

// 6. Favorites Toggles & Handlers
function onToggleWholeQuestionFavorite(group) {
  if (!group) return
  const itemToFav = group.primaryQuestion || group
  if (!itemToFav.series && props.subjectId) {
    itemToFav.series = props.subjectId
  }
  const res = favoritesStore.toggleFavorite({ question: itemToFav, subQ: null })
  if (res.action === 'added') {
    showFavoriteToast(res.message, res.item)
  } else {
    showToast(t('toast.unfavSuccess'))
  }
}

function onToggleSubQuestionFavorite(subQ) {
  if (!subQ) return
  if (!subQ.series && props.subjectId) {
    subQ.series = props.subjectId
  }
  const res = favoritesStore.toggleFavorite({ question: subQ, subQ: subQ })
  if (res.action === 'added') {
    showFavoriteToast(res.message, res.item)
  } else {
    showToast(t('toast.unfavSuccess'))
  }
}

async function handleCopyStitched(group) {
  const subs = group.subQuestions && group.subQuestions.length > 0 ? group.subQuestions : [group]
  await stitcherStore.copyStitchedQuestion(subs, cdnBase.value, r2DevUrl.value, showToast)
}

function handleSearchPaper(paper, type = 'SQ') {
  searchStore.searchPaper(paper, type)
}

function onSelectFolderFromDropdown(folderId) {
  favoritesStore.selectActiveFolder(folderId)
  isFavoriteMode.value = true
  searchStore.isSearchMode.value = false
  favFilterBoard.value = ''
  favFilterType.value = ''
  favFilterPaper.value = ''
}

function handleCreateFolder(name) {
  try {
    const created = favoritesStore.createFolder(name)
    favoritesStore.selectActiveFolder(created.id)
    isFavoriteMode.value = true
    searchStore.isSearchMode.value = false
    showToast(locale.value === 'zh' ? `✨ 已创建并切换至「${created.name}」` : `✨ Created & switched to "${created.name}"`)
  } catch (e) {
    showToast('⚠️ ' + e.message)
  }
}

function onRemoveFavorite(item) {
  favoritesStore.removeFavoriteById(item.id)
  showToast(t('toast.unfavSuccess'))
}

function handleQuickMoveFolder(folderId) {
  if (!toastLastFavoritedItem.value) return
  const folder = favoritesStore.moveFavorite(toastLastFavoritedItem.value.id, folderId)
  if (folder) {
    showToast(t('toast.movedTo', { name: folder.name }))
  }
}

function handleQuickCreateAndMove(name) {
  if (!toastLastFavoritedItem.value) return
  try {
    const newF = favoritesStore.createFolder(name)
    favoritesStore.moveFavorite(toastLastFavoritedItem.value.id, newF.id)
    showToast(locale.value === 'zh' ? `✨ 已创建并移至专辑「${newF.name}」` : `✨ Created & moved to "${newF.name}"`)
  } catch (e) {
    showToast('⚠️ ' + e.message)
  }
}

function focusQuestionFromFlow(item) {
  isFavoriteMode.value = false
  searchStore.isSearchMode.value = false
  const targetId = item.questionId || item.id

  const list = poolStore.groupedQuestions.value
  const foundIdx = list.findIndex(g => {
    if (g.id === targetId) return true
    if (g.subQuestions && g.subQuestions.some(sq => sq.id === targetId)) return true
    if (item.paper_filename && item.main_question_number) {
      return g.paper_filename === item.paper_filename && g.main_question_number === item.main_question_number
    }
    return false
  })

  if (foundIdx >= 0) {
    poolStore.currentIndex.value = foundIdx
    displayGroup(list[foundIdx])
  } else {
    currentQuestionData.value = item.primaryQuestion || item
    groupQuestions.value = item.subQuestions || [item]
    loading.value = false
  }

  const targetSubId = item.subQId || (item.matchedSubQIds && item.matchedSubQIds[0])
  if (targetSubId) {
    setTimeout(() => {
      danmakuStore.focusSubQuestion(targetSubId)
    }, 350)
  }
}

function onSubQImageLoad(event, subQId) {
  const img = event.target
  if (img && img.naturalHeight > 0 && img.naturalHeight < 140) {
    isShortSubQ.value[subQId] = true
  }
}

// Watchers & Lifecycle
watch(selectedPaper, (paper) => {
  filterByPaper(paper)
})

async function initSubject(seriesId) {
  initSeedQuestion()
  // Warm up search catalog in background
  searchStore.warmUpCatalog(seriesId)

  // Load subject pool: reads from local IndexedDB in ~2-4ms, or parallel fast fetch
  await poolStore.loadSubjectPool(seriesId, (firstGroup) => {
    // If subject didn't have a seed question, display first question immediately upon first batch arrival
    if (!currentQuestionData.value) {
      displayGroup(firstGroup)
    }
  })
  if (poolStore.groupedQuestions.value.length > 0) {
    if (!currentQuestionData.value) {
      displayGroup(poolStore.groupedQuestions.value[0])
    } else {
      const seedIdx = poolStore.groupedQuestions.value.findIndex(g => g.id === currentQuestionData.value.id)
      if (seedIdx >= 0) {
        poolStore.currentIndex.value = seedIdx
      }
    }
  } else {
    loading.value = false
    loadingText.value = 'No questions found for this subject.'
  }
}

watch(() => props.subjectId, async (newSubject) => {
  currentQuestionData.value = null
  groupQuestions.value = []
  loading.value = true
  selectedPaper.value = ''
  searchStore.sqKeyword.value = ''
  searchStore.sqSelectedPaper.value = ''
  searchStore.mcqKeyword.value = ''
  searchStore.mcqSelectedPaper.value = ''
  searchStore.isSearchMode.value = false
  isFavoriteMode.value = false
  await initSubject(newSubject)
})

let sentinelObserver = null
function setupSentinelObserver() {
  if (typeof document === 'undefined') return
  const el = document.getElementById('searchSentinelTarget')
  if (sentinelObserver) sentinelObserver.disconnect()
  if (el && typeof IntersectionObserver !== 'undefined') {
    sentinelObserver = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        searchStore.loadMoreSearchResults()
      }
    }, { rootMargin: '350px' })
    sentinelObserver.observe(el)
  }
}

watch(() => searchStore.searchResults.value.length, () => {
  setTimeout(setupSentinelObserver, 150)
})

onMounted(async () => {
  favoritesStore.initFavorites()
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', handleGlobalClick)
  }
  await initSubject(props.subjectId)
})

onUnmounted(() => {
  if (sentinelObserver) sentinelObserver.disconnect()
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('click', handleGlobalClick)
  }
})
</script>

<template>
  <div class="gallery-wrapper">
    <!-- 1. Quick Album Picker (Xiaohongshu-style interactive toast & popover) -->
    <QuickAlbumPicker 
      :showToast="showToastNotification"
      :toastMessage="toastMessage"
      :lastFavoritedItem="toastLastFavoritedItem"
      :folders="favoritesStore.folders.value"
      @move-folder="handleQuickMoveFolder"
      @create-and-move="handleQuickCreateAndMove"
      @close-toast="showToastNotification = false"
    />

    <!-- 2. Dual Independent Search Bars (SQ & MCQ) -->
    <DualSearchBar 
      v-model:sqKeyword="searchStore.sqKeyword.value"
      v-model:sqSelectedPaper="searchStore.sqSelectedPaper.value"
      v-model:mcqKeyword="searchStore.mcqKeyword.value"
      v-model:mcqSelectedPaper="searchStore.mcqSelectedPaper.value"
      :sqPaperOptions="poolStore.sqPaperOptions.value.length > 0 ? poolStore.sqPaperOptions.value : searchStore.sqPaperOptions.value"
      :mcqPaperOptions="poolStore.mcqPaperOptions.value.length > 0 ? poolStore.mcqPaperOptions.value : searchStore.mcqPaperOptions.value"
      :isSearching="searchStore.isSearching.value"
      :searchActiveType="searchStore.searchActiveType.value"
      @search="(type) => { isFavoriteMode = false; searchStore.triggerSearch(type) }"
    />

    <!-- 3. Unified Question Stream with Danmaku (Scheme D) -->
    <div class="stream-with-danmaku-container">
      <DanmakuStage 
        :activeSlots="danmakuStore.activeSlots.value"
        :laneTops="danmakuStore.laneTops"
        :danmakuEnabled="danmakuStore.danmakuEnabled.value"
        :hasDanmaku="allDanmakuList.length > 0"
        @slot-iteration="(sIdx) => danmakuStore.onSlotIteration(sIdx, allDanmakuList)"
        @toggle-like="(item) => danmakuStore.toggleLike(item, client, showToast)"
        @focus-subq="(subQId) => danmakuStore.focusSubQuestion(subQId)"
      />

      <UnifiedQuestionStream
        ref="unifiedStreamRef"
        :mode="currentMode"
        :subjectId="props.subjectId"
        :questions="currentStreamQuestions"
        :availablePapers="poolStore.availablePapers.value"
        v-model:selectedPaper="selectedPaper"
        :searchActiveType="searchStore.searchActiveType.value"
        :searchActiveKeyword="searchStore.searchActiveKeyword.value"
        :searchActivePaper="searchStore.searchActivePaper.value"
        :searchTotalCount="searchStore.searchTotalCount.value"
        :searchTotalSubCount="searchStore.searchTotalSubCount.value"
        :isSearching="searchStore.isSearching.value"
        :activeFolder="favoritesStore.activeFolder.value"
        :favFilterSubject="favFilterSubject"
        :favAvailableSubjects="favAvailableSubjects"
        :filteredFavoriteItems="filteredFavoriteItems"
        :currentFolderTotalCount="currentFolderAllItems.length"
        :favAvailablePapers="favAvailablePapers"
        :folders="favoritesStore.folders.value"
        :getFolderCount="favoritesStore.getFolderCount"
        :isItemFav="(id) => favoritesStore.isQuestionFavorited(id)"
        :isSubQFav="(subQId) => favoritesStore.isQuestionFavorited(subQId, subQId)"
        :cdnBase="cdnBase"
        :r2DevUrl="r2DevUrl"
        :subQComments="subQComments"
        :newCommentText="newCommentText"
        :submittingComment="submittingComment"
        @update:favFilterSubject="(val) => favFilterSubject = val"
        @exit-search="searchStore.exitSearchMode()"
        @exit-favorites="isFavoriteMode = false"
        @select-folder="onSelectFolderFromDropdown"
        @create-folder="handleCreateFolder"
        @delete-folder="(id) => favoritesStore.deleteFolder(id)"
        @clear-folder="(id) => favoritesStore.clearFolder(id)"
        @toggle-whole-fav="onToggleWholeQuestionFavorite"
        @toggle-subq-fav="onToggleSubQuestionFavorite"
        @remove-favorite="onRemoveFavorite"
        @copy-stitched="handleCopyStitched"
        @search-paper="handleSearchPaper"
        @add-subq-comment="addSubQComment"
        @toggle-like-comment="(c) => danmakuStore.toggleLike(c, client, showToast)"
        @subq-image-load="onSubQImageLoad"
      />
    </div>
  </div>
</template>

<style scoped>
.gallery-wrapper {
  margin-top: 10px;
  position: relative;
}

.stream-with-danmaku-container {
  position: relative;
  width: 100%;
  margin-top: 16px;
}

/* Gallery Top Bar */
.gallery-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 0 2px;
}

/* Minimalist Favorites Dropdown at Top-Left */
.fav-dropdown-container {
  position: relative;
  display: inline-block;
}

.btn-fav-dropdown {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
  box-shadow: var(--shadow-sm);
}

.btn-fav-dropdown:hover,
.btn-fav-dropdown.btn-fav-dropdown-active {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  box-shadow: 0 2px 8px rgba(194, 65, 40, 0.12);
}

.f-icon {
  font-size: 0.96rem;
}

.f-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.f-badge {
  background: var(--accent-primary);
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 10px;
  font-variant-numeric: tabular-nums;
}

.f-arrow {
  font-size: 0.72rem;
  color: var(--text-muted);
  transition: transform 0.18s ease;
}

.btn-fav-dropdown-active .f-arrow {
  transform: rotate(180deg);
}

/* Minimalist Dropdown Menu */
.fav-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 250px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  padding: 8px;
  z-index: 1050;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.fav-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px 8px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 6px;
}

.menu-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

.btn-create-f {
  background: transparent;
  border: 1px dashed var(--border-color);
  color: var(--accent-primary);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.14s ease;
}

.btn-create-f:hover {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
}

.menu-new-folder-row {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
  padding: 0 4px;
}

.menu-input-field {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--accent-primary);
  border-radius: 4px;
  font-size: 0.78rem;
  outline: none;
  background: var(--bg-input);
}

.menu-btn-ok {
  background: var(--accent-primary);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

.fav-menu-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow-y: auto;
}

.fav-menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.12s ease;
}

.fav-menu-item:hover {
  background: var(--bg-surface-subtle);
}

.fav-menu-item.is-selected {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  font-weight: 700;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.item-emoji {
  font-size: 0.85rem;
}

.item-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-count {
  font-size: 0.74rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.fav-menu-item.is-selected .item-count {
  color: var(--accent-primary);
  font-weight: 700;
}

/* Exit Fav Mode Button */
.btn-exit-fav-mode {
  padding: 5px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-exit-fav-mode:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--accent-primary-light);
}

/* Subtle Progress Pill */
.nav-count-indicator {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--bg-surface);
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.danmaku-stage-wrapper {
  position: relative;
  width: 100%;
}

.subq-focus-highlight {
  animation: focusPulse 2.2s ease-out;
}

@keyframes focusPulse {
  0% { background-color: var(--accent-primary-light); }
  100% { background-color: transparent; }
}
</style>
