<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  subjectId: {
    type: String,
    default: 'CAIE-AL-9702'
  }
})

const client = useSupabaseClient()
const config = useRuntimeConfig()
const cdnBase = computed(() => config.public.cdnBaseUrl || 'https://assets.66367749.xyz')

// --- State ---
const loading = ref(true)
const loadingText = ref('Loading questions...')
const currentQuestionData = ref(null)
const groupQuestions = ref([]) // All subquestions belonging to the active main question
const isSqGroup = computed(() => groupQuestions.value.length > 0 && currentQuestionData.value?.paper_type === 'SQ')

// Subquestion individual states
const expandedAnswers = ref({}) // { [subQId]: boolean }
const expandedComments = ref({}) // { [subQId]: boolean }
const isShortSubQ = ref({}) // { [subQId]: boolean }
const subQComments = ref({}) // { [subQId]: [] }
const newCommentText = ref({}) // { [subQId]: string }
const submittingComment = ref({}) // { [subQId]: boolean }

// Filter & Navigation
const paperTypeFilter = ref('ALL') // 'ALL' | 'SQ' | 'MCQ'
const selectedPaper = ref('')
const availablePapers = ref([])
const questionList = ref([]) // Current pool of question IDs
const currentIndex = ref(0)
const totalCount = ref(0)

// Search State
const searchKeyword = ref('')
const isSearching = ref(false)
const searchResults = ref([])
const showSearchResults = ref(false)

// Toast Notification
const toastMessage = ref('')
const showToastNotification = ref(false)
let toastTimer = null

function showToast(msg) {
  toastMessage.value = msg
  showToastNotification.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    showToastNotification.value = false
  }, 2800)
}

// Copy Image State
const copyingImage = ref(false)

// Helper: Extract main question number
function getMainQuestionNumber(raw) {
  if (!raw) return ''
  const str = String(raw).trim()
  const match = str.match(/^(\d+)/)
  return match ? match[1] : str
}

// --- Methods ---

// 1. Fetch available papers for this series
async function fetchPapers() {
  try {
    const { data, error } = await client
      .from('questions_data')
      .select('paper_filename')
      .eq('series', props.subjectId)
      .neq('paper_filename', '')

    if (error) throw error

    if (data) {
      const unique = Array.from(new Set(data.map(d => d.paper_filename).filter(Boolean))).sort()
      availablePapers.value = unique
    }
  } catch (err) {
    console.error('Error fetching papers:', err)
  }
}

// 2. Load Question Pool
async function loadQuestionPool() {
  loading.value = true
  loadingText.value = 'Fetching question list...'
  try {
    let query = client
      .from('questions_data')
      .select('id, question_raw_number, score, paper_type, paper_filename')
      .eq('series', props.subjectId)

    if (paperTypeFilter.value !== 'ALL') {
      query = query.eq('paper_type', paperTypeFilter.value)
    }

    if (selectedPaper.value) {
      query = query.eq('paper_filename', selectedPaper.value)
    }

    query = query.limit(500)

    const { data, error } = await query
    if (error) throw error

    questionList.value = data || []
    totalCount.value = questionList.value.length

    if (questionList.value.length > 0) {
      currentIndex.value = 0
      await loadQuestionById(questionList.value[0].id)
    } else {
      currentQuestionData.value = null
      groupQuestions.value = []
      loadingText.value = 'No questions found for the selected filters.'
      loading.value = false
    }
  } catch (err) {
    console.error('Error loading question pool:', err)
    loadingText.value = `Error loading questions: ${err.message}`
    loading.value = false
  }
}

// 3. Load specific question and resolve its SQ Group
async function loadQuestionById(id) {
  loading.value = true
  expandedAnswers.value = {}
  expandedComments.value = {}
  isShortSubQ.value = {}

  try {
    const { data: primaryQ, error } = await client
      .from('questions_data')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    currentQuestionData.value = primaryQ

    // If it's a Structured Question (SQ), fetch all siblings belonging to this main question!
    if (primaryQ.paper_type === 'SQ' && primaryQ.paper_filename) {
      const mainNum = getMainQuestionNumber(primaryQ.question_raw_number)
      
      const { data: siblings, error: sibError } = await client
        .from('questions_data')
        .select('*')
        .eq('paper_filename', primaryQ.paper_filename)
        .eq('paper_type', 'SQ')
        .order('start_page', { ascending: true })
        .order('start_y', { ascending: true })

      if (!sibError && siblings && siblings.length > 0) {
        const matchedSiblings = siblings.filter(s => {
          return getMainQuestionNumber(s.question_raw_number) === mainNum
        })
        groupQuestions.value = matchedSiblings.length > 0 ? matchedSiblings : [primaryQ]
      } else {
        groupQuestions.value = [primaryQ]
      }
    } else {
      groupQuestions.value = [primaryQ]
    }
  } catch (err) {
    console.error('Error loading question:', err)
    loadingText.value = `Failed to load question details: ${err.message}`
  } finally {
    loading.value = false
  }
}

// 4. Subquestion Image Height Check for Adaptive Right Dock
function onSubQImageLoad(event, subQId) {
  const h = event.target.naturalHeight || event.target.clientHeight || 0
  // If subquestion height is short (< 140px), arrange side buttons horizontally to prevent overflow
  isShortSubQ.value[subQId] = h < 140
}

// 5. Navigation
function nextQuestion() {
  if (questionList.value.length === 0) return
  if (currentIndex.value < questionList.value.length - 1) {
    currentIndex.value++
  } else {
    currentIndex.value = 0
  }
  loadQuestionById(questionList.value[currentIndex.value].id)
}

function prevQuestion() {
  if (questionList.value.length === 0) return
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = questionList.value.length - 1
  }
  loadQuestionById(questionList.value[currentIndex.value].id)
}

function randomQuestion() {
  if (questionList.value.length === 0) return
  const randIdx = Math.floor(Math.random() * questionList.value.length)
  currentIndex.value = randIdx
  loadQuestionById(questionList.value[randIdx].id)
}

// 6. Subquestion Mark Scheme Controls
function toggleSubQAnswer(subQId) {
  expandedAnswers.value[subQId] = !expandedAnswers.value[subQId]
}

function expandAllAnswers() {
  groupQuestions.value.forEach(q => {
    expandedAnswers.value[q.id] = true
  })
}

function collapseAllAnswers() {
  expandedAnswers.value = {}
}

// 7. Search Functionality
async function handleSearch() {
  const kw = searchKeyword.value.trim()
  if (!kw) {
    showSearchResults.value = false
    await loadQuestionPool()
    return
  }

  isSearching.value = true
  showSearchResults.value = true
  try {
    const { data, error } = await client
      .from('questions_data')
      .select('id, question_raw_number, score, paper_type, paper_filename, series, details, image_path, ms_image_path')
      .or(`details.ilike.%${kw}%,paper_filename.ilike.%${kw}%,question_raw_number.ilike.%${kw}%`)
      .limit(30)

    if (error) throw error
    searchResults.value = data || []
  } catch (err) {
    console.error('Search error:', err)
    showToast('Search failed: ' + err.message)
  } finally {
    isSearching.value = false
  }
}

function selectSearchResult(item) {
  showSearchResults.value = false
  loadQuestionById(item.id)
}

// 8. Copy Single Subquestion Image directly to Clipboard
async function copySingleSubQImage(subQ) {
  if (!subQ.image_path) {
    showToast('⚠️ No image available for this sub-question.')
    return
  }

  showToast(`⏳ 正在复制小问 ${subQ.question_raw_number}...`)
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = `${cdnBase.value}/${subQ.image_path}`
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context unavailable')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    canvas.toBlob(async (blob) => {
      if (!blob) throw new Error('Blob creation failed')
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      showToast(`✅ 小问 ${subQ.question_raw_number} 切图已复制到剪贴板！`)
    }, 'image/png')
  } catch (err) {
    console.error('Failed to copy subq image:', err)
    showToast(`❌ 复制小题失败: ${err.message}`)
  }
}

// 9. Stitched Full Main Question Image Copy (Adaptive Canvas)
async function copyStitchedQuestion() {
  const validQuestions = groupQuestions.value.filter(q => q.image_path)
  if (validQuestions.length === 0) {
    showToast('⚠️ No question images available to copy.')
    return
  }

  copyingImage.value = true
  showToast('⏳ 正在拼接整题高清图片...')

  try {
    const loadedImgs = await Promise.all(
      validQuestions.map(q => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error(`Failed to load ${q.image_path}`))
          img.src = `${cdnBase.value}/${q.image_path}`
        })
      })
    )

    const totalHeight = loadedImgs.reduce((sum, img) => sum + img.height, 0)
    const maxWidth = Math.max(...loadedImgs.map(img => img.width))

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create canvas context')

    if (totalHeight <= 1800 || loadedImgs.length === 1) {
      canvas.width = maxWidth
      canvas.height = totalHeight

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      let currentY = 0
      for (const img of loadedImgs) {
        ctx.drawImage(img, 0, currentY)
        currentY += img.height
      }
    } else {
      const heights = loadedImgs.map(img => img.height)
      const n = loadedImgs.length

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

      const leftGroup = loadedImgs.slice(0, bestSplitIndex + 1)
      const rightGroup = loadedImgs.slice(bestSplitIndex + 1)

      const leftHeight = leftGroup.reduce((sum, img) => sum + img.height, 0)
      const rightHeight = rightGroup.reduce((sum, img) => sum + img.height, 0)
      const leftWidth = Math.max(...leftGroup.map(img => img.width))
      const rightWidth = Math.max(...rightGroup.map(img => img.width))

      const gap = 24
      canvas.width = leftWidth + gap + rightWidth
      canvas.height = Math.max(leftHeight, rightHeight)

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      let leftY = 0
      for (const img of leftGroup) {
        ctx.drawImage(img, 0, leftY)
        leftY += img.height
      }

      let rightY = 0
      for (const img of rightGroup) {
        ctx.drawImage(img, leftWidth + gap, rightY)
        rightY += img.height
      }
    }

    canvas.toBlob(async (blob) => {
      if (!blob) throw new Error('Canvas conversion to blob failed')
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      showToast('✅ 整题切图已成功拼接并复制到剪贴板！可直接粘贴。')
    }, 'image/png')
  } catch (err) {
    console.error('Failed to copy stitched image:', err)
    showToast('❌ 复制整题失败: ' + err.message)
  } finally {
    copyingImage.value = false
  }
}

// 10. Subquestion Comments
async function toggleSubQComment(subQId) {
  expandedComments.value[subQId] = !expandedComments.value[subQId]
  if (expandedComments.value[subQId] && !subQComments.value[subQId]) {
    await fetchSubQComments(subQId)
  }
}

async function fetchSubQComments(subQId) {
  try {
    const { data, error } = await client
      .from('comments')
      .select('id, created_at, message, user_id, question_id, profiles(display_name, avatar_url)')
      .eq('question_id', subQId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      subQComments.value[subQId] = data
    } else {
      subQComments.value[subQId] = []
    }
  } catch (err) {
    console.error('Error fetching subQ comments:', err)
    subQComments.value[subQId] = []
  }
}

async function addSubQComment(subQ) {
  const text = (newCommentText.value[subQ.id] || '').trim()
  if (!text) return

  submittingComment.value[subQ.id] = true
  try {
    const { data: { user } } = await client.auth.getUser()
    if (!user) {
      showToast('⚠️ Please log in to post comments or notes.')
      return
    }

    const { error } = await client.from('comments').insert({
      message: text,
      user_id: user.id,
      question_id: subQ.id,
      sub_q_number: subQ.question_raw_number
    })

    if (error) throw error

    newCommentText.value[subQ.id] = ''
    await fetchSubQComments(subQ.id)
    showToast('💬 Note posted successfully!')
  } catch (err) {
    console.error('Error posting comment:', err)
    showToast('Failed to post: ' + err.message)
  } finally {
    submittingComment.value[subQ.id] = false
  }
}

// Watch filters
watch(paperTypeFilter, () => {
  loadQuestionPool()
})

watch(selectedPaper, () => {
  loadQuestionPool()
})

watch(() => props.subjectId, async () => {
  selectedPaper.value = ''
  paperTypeFilter.value = 'ALL'
  searchKeyword.value = ''
  showSearchResults.value = false
  await fetchPapers()
  await loadQuestionPool()
})

onMounted(async () => {
  await fetchPapers()
  await loadQuestionPool()
})
</script>

<template>
  <div class="gallery-wrapper">
    <!-- Floating Toast Notification -->
    <transition name="toast-fade">
      <div v-if="showToastNotification" class="toast-popup">
        {{ toastMessage }}
      </div>
    </transition>

    <!-- Top Search & Filter Bar -->
    <div class="control-panel">
      <!-- Search Input Section -->
      <div class="search-section">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchKeyword" 
            type="text" 
            placeholder="Search questions by keyword, topic, paper or year (e.g. circuit, momentum, 2022)..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button v-if="searchKeyword" @click="searchKeyword = ''; handleSearch()" class="search-clear-btn">&times;</button>
          <button @click="handleSearch" :disabled="isSearching" class="btn btn-search">
            {{ isSearching ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </div>

      <!-- Filters & Controls -->
      <div class="filter-controls-row">
        <div class="filters">
          <div class="filter-group">
            <label>Type:</label>
            <div class="pill-tabs">
              <button 
                :class="{ active: paperTypeFilter === 'ALL' }" 
                @click="paperTypeFilter = 'ALL'"
              >All</button>
              <button 
                :class="{ active: paperTypeFilter === 'SQ' }" 
                @click="paperTypeFilter = 'SQ'"
              >Structured (SQ)</button>
              <button 
                :class="{ active: paperTypeFilter === 'MCQ' }" 
                @click="paperTypeFilter = 'MCQ'"
              >Multiple Choice (MCQ)</button>
            </div>
          </div>

          <div class="filter-group paper-select-group" v-if="availablePapers.length > 0">
            <label>Paper:</label>
            <select v-model="selectedPaper" class="paper-select">
              <option value="">All Papers ({{ availablePapers.length }})</option>
              <option v-for="p in availablePapers" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>

        <div class="nav-controls">
          <span class="count-badge" v-if="questionList.length > 0">
            {{ currentIndex + 1 }} / {{ questionList.length }}
          </span>
          <button @click="prevQuestion" :disabled="loading || questionList.length <= 1" class="btn btn-secondary">
            &larr; Prev
          </button>
          <button @click="nextQuestion" :disabled="loading || questionList.length <= 1" class="btn btn-secondary">
            Next &rarr;
          </button>
          <button @click="randomQuestion" :disabled="loading || questionList.length <= 1" class="btn btn-primary">
            🎲 Random
          </button>
        </div>
      </div>
    </div>

    <!-- Search Results Flyout Drawer -->
    <div v-if="showSearchResults" class="search-results-panel">
      <div class="search-results-header">
        <h4>Search Results ({{ searchResults.length }} matches)</h4>
        <button @click="showSearchResults = false" class="close-results-btn">&times;</button>
      </div>
      <div v-if="searchResults.length === 0" class="no-results">
        No questions matched your search query.
      </div>
      <div v-else class="results-list">
        <div 
          v-for="res in searchResults" 
          :key="res.id"
          class="result-card"
          @click="selectSearchResult(res)"
        >
          <div class="result-top">
            <span class="tag tag-series">{{ res.series }}</span>
            <span class="tag tag-paper">{{ res.paper_filename }}</span>
            <span class="tag tag-qnum">Q: {{ res.question_raw_number }}</span>
            <span class="tag tag-score" v-if="res.score">[{{ res.score }}m]</span>
          </div>
          <p class="result-snippet">{{ res.details ? res.details.slice(0, 160) + '...' : 'No text preview' }}</p>
        </div>
      </div>
    </div>

    <!-- Main Viewport Card -->
    <div class="viewport-card">
      <div v-if="loading" class="state-container">
        <div class="spinner"></div>
        <p>{{ loadingText }}</p>
      </div>

      <div v-else-if="!currentQuestionData" class="state-container empty">
        <p>No questions found matching your filter.</p>
        <button @click="paperTypeFilter = 'ALL'; selectedPaper = ''; searchKeyword = ''; handleSearch()" class="btn btn-primary">
          Reset Filters
        </button>
      </div>

      <div v-else class="question-container">
        <!-- Main Question Header -->
        <div class="main-q-header">
          <div class="header-info">
            <div class="header-tags">
              <span class="tag tag-series">{{ currentQuestionData.series }}</span>
              <span class="tag tag-paper">{{ currentQuestionData.paper_filename }}</span>
              <span class="tag tag-type-badge">{{ currentQuestionData.paper_type }}</span>
            </div>
            <h2 class="main-q-title">
              <span v-if="currentQuestionData.paper_type === 'SQ'">
                Question {{ getMainQuestionNumber(currentQuestionData.question_raw_number) }}
                <span class="subparts-count">({{ groupQuestions.length }} subparts)</span>
              </span>
              <span v-else>
                Question {{ currentQuestionData.question_raw_number }}
              </span>
            </h2>
          </div>

          <!-- Header Action Buttons -->
          <div class="header-actions">
            <button 
              @click="copyStitchedQuestion" 
              :disabled="copyingImage" 
              class="btn btn-stitch"
              title="Stitch and copy full question image to clipboard"
            >
              📋 {{ copyingImage ? 'Stitching...' : '复制整题切图' }}
            </button>

            <template v-if="currentQuestionData.paper_type === 'SQ'">
              <button @click="expandAllAnswers" class="btn btn-secondary">
                💡 展开全部答案
              </button>
              <button @click="collapseAllAnswers" class="btn btn-secondary">
                📖 收起全部答案
              </button>
            </template>
          </div>
        </div>

        <!-- ================= SQ: CONTINUOUS SEAMLESS PAPER VIEW WITH RIGHT DOCK ================= -->
        <div v-if="currentQuestionData.paper_type === 'SQ'" class="seamless-paper-sheet">
          <div 
            v-for="(subQ, idx) in groupQuestions" 
            :key="subQ.id" 
            class="subq-row-container"
          >
            <!-- Subquestion Row (Left Image, Right Action Dock) -->
            <div class="subq-main-row">
              <!-- Left: Subquestion Question Image (Touches seamlessly with adjacent slices) -->
              <div class="subq-img-wrap">
                <img 
                  v-if="subQ.image_path"
                  :src="`${cdnBase}/${subQ.image_path}`" 
                  :alt="`Sub-question ${subQ.question_raw_number}`"
                  class="exam-subq-image"
                  loading="lazy"
                  @load="(e) => onSubQImageLoad(e, subQ.id)"
                />
              </div>

              <!-- Right: Subquestion Dedicated Action Dock -->
              <div 
                class="subq-action-dock" 
                :class="{ 'dock-horizontal': isShortSubQ[subQ.id] }"
              >
                <!-- Question Number & Marks Pill -->
                <div class="dock-badge">
                  <span class="dock-qnum">{{ subQ.question_raw_number }}</span>
                  <span v-if="subQ.score" class="dock-marks">[{{ subQ.score }}m]</span>
                </div>

                <!-- 1. Toggle Mark Scheme -->
                <button 
                  v-if="subQ.ms_image_path || subQ.ms_details"
                  @click="toggleSubQAnswer(subQ.id)" 
                  class="dock-btn"
                  :class="{ 'dock-btn-active': expandedAnswers[subQ.id] }"
                  title="查看/收起此问答案"
                >
                  <span class="dock-icon">💡</span>
                  <span class="dock-label">{{ expandedAnswers[subQ.id] ? '收起答案' : '查看答案' }}</span>
                </button>

                <!-- 2. Copy this Subquestion Image directly -->
                <button 
                  @click="copySingleSubQImage(subQ)" 
                  class="dock-btn"
                  title="复制本小问切图到剪贴板"
                >
                  <span class="dock-icon">📋</span>
                  <span class="dock-label">复制此问</span>
                </button>

                <!-- 3. Subquestion Notes / Comments -->
                <button 
                  @click="toggleSubQComment(subQ.id)" 
                  class="dock-btn"
                  :class="{ 'dock-btn-active': expandedComments[subQ.id] }"
                  title="小问笔记与做题讨论"
                >
                  <span class="dock-icon">💬</span>
                  <span class="dock-label">笔记{{ subQComments[subQ.id]?.length ? `(${subQComments[subQ.id].length})` : '' }}</span>
                </button>
              </div>
            </div>

            <!-- Subquestion Expanded Mark Scheme Drawer -->
            <transition name="slide-down">
              <div v-if="expandedAnswers[subQ.id]" class="subq-ms-drawer">
                <div class="ms-drawer-tag">
                  <span>✨ {{ subQ.question_raw_number }} 评分标准 (Mark Scheme)</span>
                  <button @click="expandedAnswers[subQ.id] = false" class="close-drawer-mini">&times;</button>
                </div>
                <div class="ms-drawer-body">
                  <img 
                    v-if="subQ.ms_image_path"
                    :src="`${cdnBase}/${subQ.ms_image_path}`" 
                    alt="Mark Scheme"
                    class="exam-ms-image"
                    loading="lazy"
                  />
                  <div v-if="subQ.ms_details" class="ms-text-details">
                    <pre>{{ subQ.ms_details }}</pre>
                  </div>
                </div>
              </div>
            </transition>

            <!-- Subquestion Discussion / Notes Drawer -->
            <transition name="slide-down">
              <div v-if="expandedComments[subQ.id]" class="subq-notes-drawer">
                <div class="notes-drawer-header">
                  <h5>📝 小问笔记与讨论 ({{ subQ.question_raw_number }})</h5>
                  <button @click="expandedComments[subQ.id] = false" class="close-drawer-mini">&times;</button>
                </div>

                <div class="notes-messages-list">
                  <div v-if="!subQComments[subQ.id] || subQComments[subQ.id].length === 0" class="empty-notes">
                    暂无本小题的专属笔记。记录下解题关键点或困惑吧！
                  </div>
                  <div v-for="c in subQComments[subQ.id]" :key="c.id" class="notes-item">
                    <div class="notes-author">
                      <span class="author-name">{{ c.profiles?.display_name || '同学' }}</span>
                      <span class="notes-time">{{ new Date(c.created_at).toLocaleString() }}</span>
                    </div>
                    <div class="notes-body">{{ c.message }}</div>
                  </div>
                </div>

                <div class="notes-input-row">
                  <input 
                    v-model="newCommentText[subQ.id]" 
                    type="text" 
                    placeholder="输入本问做题笔记或疑问..." 
                    @keyup.enter="addSubQComment(subQ)"
                  />
                  <button 
                    @click="addSubQComment(subQ)" 
                    :disabled="submittingComment[subQ.id]" 
                    class="btn btn-primary btn-sm"
                  >
                    {{ submittingComment[subQ.id] ? '保存中...' : '保存笔记' }}
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- ================= MCQ: MULTIPLE CHOICE QUESTION DISPLAY ================= -->
        <div v-else class="mcq-view">
          <div class="mcq-main-row">
            <div class="mcq-img-wrap">
              <img 
                v-if="currentQuestionData.image_path"
                :src="`${cdnBase}/${currentQuestionData.image_path}`" 
                alt="Multiple Choice Question"
                class="exam-subq-image"
              />
            </div>

            <!-- MCQ Right Dock -->
            <div class="subq-action-dock">
              <div class="dock-badge">
                <span class="dock-qnum">{{ currentQuestionData.question_raw_number }}</span>
                <span class="dock-marks">[1m]</span>
              </div>

              <button 
                @click="toggleSubQAnswer(currentQuestionData.id)" 
                class="dock-btn"
                :class="{ 'dock-btn-active': expandedAnswers[currentQuestionData.id] }"
              >
                <span class="dock-icon">💡</span>
                <span class="dock-label">{{ expandedAnswers[currentQuestionData.id] ? '隐藏答案' : '显示答案' }}</span>
              </button>

              <button 
                @click="copySingleSubQImage(currentQuestionData)" 
                class="dock-btn"
              >
                <span class="dock-icon">📋</span>
                <span class="dock-label">复制此题</span>
              </button>
            </div>
          </div>

          <!-- MCQ Answer Revelation -->
          <div v-if="expandedAnswers[currentQuestionData.id]" class="mcq-answer-reveal">
            <h3>Correct Option</h3>
            <div class="answer-badge-large">{{ currentQuestionData.ms_details || 'Answer not recorded' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Community Comment Section -->
    <Comment />
  </div>
</template>

<style scoped>
.gallery-wrapper {
  margin-top: 10px;
  position: relative;
}

/* Floating Toast */
.toast-popup {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: #1e293b;
  color: #f8fafc;
  padding: 14px 22px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 10px;
}
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateY(20px); }

/* Control Panel */
.control-panel {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.search-section {
  width: 100%;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 14px;
  font-size: 1rem;
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 10px 100px 10px 42px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 0.92rem;
  color: #1e293b;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #3e635f;
  box-shadow: 0 0 0 3px rgba(62, 99, 95, 0.12);
}

.search-clear-btn {
  position: absolute;
  right: 90px;
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: #94a3b8;
  cursor: pointer;
}

.btn-search {
  position: absolute;
  right: 6px;
  background: #3e635f;
  color: white;
  padding: 6px 16px;
  font-size: 0.85rem;
}

.filter-controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
}

.pill-tabs {
  display: flex;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 8px;
  gap: 2px;
}

.pill-tabs button {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-tabs button.active {
  background: white;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.paper-select {
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #1e293b;
  background: white;
  max-width: 260px;
  outline: none;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.count-badge {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  margin-right: 4px;
}

/* Search Results Panel */
.search-results-panel {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.search-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.search-results-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #1e293b;
}

.close-results-btn {
  background: transparent;
  border: none;
  font-size: 1.4rem;
  color: #94a3b8;
  cursor: pointer;
}

.results-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  max-height: 350px;
  overflow-y: auto;
}

.result-card {
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.result-card:hover {
  background: #f1f5f9;
  border-color: #3e635f;
  transform: translateY(-2px);
}

.result-top {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.result-snippet {
  margin: 0;
  font-size: 0.82rem;
  color: #475569;
  line-height: 1.4;
}

/* Viewport Card */
.viewport-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  min-height: 480px;
}

.state-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 400px;
  gap: 16px;
  color: #64748b;
}

/* Main Question Header */
.main-q-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 18px 24px;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.header-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.main-q-title {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
}

.subparts-count {
  font-size: 0.95rem;
  font-weight: 500;
  color: #64748b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-stitch {
  background: #0284c7;
  color: white;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);
}
.btn-stitch:hover:not(:disabled) {
  background: #0369a1;
}

/* Tag Styles */
.tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}
.tag-series { background: #e0f2fe; color: #0369a1; }
.tag-paper { background: #f1f5f9; color: #475569; }
.tag-qnum { background: #fef3c7; color: #b45309; }
.tag-score { background: #dcfce7; color: #15803d; }
.tag-type-badge { background: #f3e8ff; color: #7e22ce; font-weight: 700; }

/* ================= SQ Continuous Paper Sheet ================= */
.seamless-paper-sheet {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  padding: 20px 24px;
  gap: 0; /* Consecutive slices touch seamlessly */
}

.subq-row-container {
  display: flex;
  flex-direction: column;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 12px;
  margin-bottom: 12px;
}
.subq-row-container:last-child {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}

.subq-main-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
}

/* Left Image Wrap */
.subq-img-wrap {
  flex: 1;
  max-width: 1240px;
  line-height: 0;
}

.exam-subq-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
}

/* Right Side Action Dock */
.subq-action-dock {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 110px;
  padding: 4px 0;
  flex-shrink: 0;
}

/* When subquestion is particularly short, layout buttons horizontally to avoid overflow */
.subq-action-dock.dock-horizontal {
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.dock-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #1e293b;
  width: fit-content;
}

.dock-marks {
  color: #15803d;
  font-size: 0.75rem;
}

.dock-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.dock-btn:hover {
  background: #f8fafc;
  border-color: #3e635f;
  color: #3e635f;
}

.dock-btn-active {
  background: #e0f2fe !important;
  border-color: #0284c7 !important;
  color: #0369a1 !important;
}

.dock-icon {
  font-size: 0.9rem;
}

/* Subquestion Mark Scheme Drawer */
.subq-ms-drawer {
  margin-top: 12px;
  padding: 16px;
  background: #f0fdf4;
  border: 1.5px dashed #86efac;
  border-radius: 10px;
  position: relative;
}

.ms-drawer-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #166534;
  margin-bottom: 10px;
}

.close-drawer-mini {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: #166534;
  cursor: pointer;
}

.exam-ms-image {
  width: 100%;
  max-width: 1240px;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.ms-text-details pre {
  margin-top: 10px;
  padding: 10px;
  background: white;
  border: 1px solid #dcfce7;
  border-radius: 6px;
  font-size: 0.85rem;
  white-space: pre-wrap;
  color: #166534;
}

/* Subquestion Notes Drawer */
.subq-notes-drawer {
  margin-top: 12px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
}

.notes-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.notes-drawer-header h5 {
  margin: 0;
  color: #334155;
  font-size: 0.88rem;
}

.notes-messages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.empty-notes {
  font-size: 0.82rem;
  color: #94a3b8;
  text-align: center;
  padding: 10px 0;
}

.notes-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
}

.notes-author {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 3px;
}

.author-name {
  font-weight: 700;
  color: #1e293b;
}

.notes-time {
  color: #94a3b8;
}

.notes-body {
  font-size: 0.85rem;
  color: #334155;
}

.notes-input-row {
  display: flex;
  gap: 8px;
}

.notes-input-row input {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.85rem;
  outline: none;
}

.notes-input-row input:focus {
  border-color: #3e635f;
}

/* ================= MCQ View ================= */
.mcq-view {
  padding: 24px;
}

.mcq-main-row {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.mcq-img-wrap {
  flex: 1;
  max-width: 1240px;
}

.mcq-answer-reveal {
  margin: 30px auto;
  padding: 24px;
  max-width: 450px;
  background: #fffbeb;
  border: 2px dashed #f59e0b;
  border-radius: 12px;
  text-align: center;
}

.mcq-answer-reveal h3 {
  margin: 0 0 10px 0;
  color: #b45309;
}

.answer-badge-large {
  font-size: 2rem;
  font-weight: 900;
  color: #b45309;
}

/* Common Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 0.8rem;
  border-radius: 6px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary { background: #3e635f; color: white; }
.btn-primary:hover:not(:disabled) { background: #2f4d4a; }

.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
.btn-secondary:hover:not(:disabled) { background: #e2e8f0; }

/* Transitions */
.slide-down-enter-active { transition: all 0.25s ease-out; }
.slide-down-leave-active { transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-8px); opacity: 0; }

/* Spinner */
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #3e635f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .subq-main-row, .mcq-main-row {
    flex-direction: column;
  }
  .subq-action-dock {
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
  }
  .filter-controls-row {
    flex-direction: column;
    align-items: stretch;
  }
  .nav-controls {
    justify-content: space-between;
  }
}
</style>
