import { ref, computed, watch } from 'vue'

export interface FavoriteFolder {
  id: string
  name: string
  isDefault?: boolean
  createdAt: string
}

export interface FavoriteItem {
  id: string
  folderId: string
  questionId: number | string
  isSub: boolean
  subQId?: number | string | null
  subQNum?: string | null
  paperFilename: string
  paperType: 'SQ' | 'MCQ'
  board: string
  series?: string
  score?: string | number
  imagePath?: string
  msImagePath?: string
  msDetails?: string
  details?: string
  createdAt: string
}

// Global shared state across components
const folders = ref<FavoriteFolder[]>([])
const favorites = ref<FavoriteItem[]>([])
const activeFolderId = ref<string>('default')
const isInitialized = ref(false)
const isFavoriteMode = ref(false)
const targetSubjectScope = ref<string>('')

// Parse Exam Board from paper filename or series
export function detectExamBoard(filename = '', series = ''): string {
  const str = `${filename} ${series}`.toUpperCase()
  if (str.includes('9702') || str.includes('CAIE') || str.includes('CIE')) return 'CAIE'
  if (str.includes('WPH') || str.includes('EDEXCEL') || str.includes('4PH')) return 'Edexcel'
  if (str.includes('7408') || str.includes('AQA')) return 'AQA'
  if (str.includes('H556') || str.includes('OCR')) return 'OCR'
  if (str.includes('BPHO') || str.includes('PHYSICSBOWL') || str.includes('OLYMPIAD')) return 'Olympiad'
  return 'CAIE' // Default fallback
}

// Infer Subject Series identifier (e.g. CAIE-AL-9702) from paper filename or series
export function getItemSubject(item: { series?: string; paperFilename?: string; paper_filename?: string; board?: string } = {}): string {
  if (item.series) return item.series
  const fn = (item.paperFilename || item.paper_filename || '').toUpperCase()
  if (fn.includes('9702')) return 'CAIE-AL-9702'
  if (fn.includes('0625')) return 'CAIE-IG-0625'
  if (fn.includes('WPH')) return 'EDX-IAL'
  if (fn.includes('4PH')) return 'EDX-IG'
  if (fn.includes('9630')) return 'AQA-IAL-9630'
  if (fn.includes('7408')) return 'AQA-本土AL'
  if (fn.includes('8463')) return 'AQA-本土GCSE'
  return item.board || 'CAIE-AL-9702'
}

export function useFavorites() {
  const user = useSupabaseUser()
  const client = useSupabaseClient()

  // Initialize storage
  function initFavorites() {
    if (typeof window === 'undefined') return
    if (isInitialized.value) return

    // 1. Load Folders (Clean obsolete monthly wrong folders from previous versions)
    let storedFolders: FavoriteFolder[] = []
    try {
      const raw = localStorage.getItem('physics_user_folders')
      if (raw) {
        const parsed = JSON.parse(raw)
        storedFolders = parsed.filter((f: any) => !f.isMonthlyWrong && !f.id?.startsWith('wrong-'))
      }
    } catch (e) {
      console.warn('Failed to parse folders from localStorage', e)
    }

    // Ensure Default Folder exists
    const hasDefault = storedFolders.some(f => f.id === 'default')
    if (!hasDefault) {
      storedFolders.unshift({
        id: 'default',
        name: '默认收藏夹',
        isDefault: true,
        createdAt: new Date().toISOString()
      })
    }

    folders.value = storedFolders

    // 2. Load Favorites
    let storedFavs: FavoriteItem[] = []
    try {
      const raw = localStorage.getItem('physics_user_favorites')
      if (raw) storedFavs = JSON.parse(raw)
    } catch (e) {
      console.warn('Failed to parse favorites from localStorage', e)
    }

    // Point any orphan items whose folder was deleted to default folder
    storedFavs.forEach(item => {
      if (!folders.value.some(f => f.id === item.folderId)) {
        item.folderId = 'default'
      }
    })

    favorites.value = storedFavs

    // 3. Load Active Folder
    const savedActive = localStorage.getItem('physics_active_folder_id')
    if (savedActive && folders.value.some(f => f.id === savedActive)) {
      activeFolderId.value = savedActive
    } else {
      activeFolderId.value = 'default'
    }

    saveFolders()
    saveFavorites()
    isInitialized.value = true
  }

  // Persist folders
  function saveFolders() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('physics_user_folders', JSON.stringify(folders.value))
      localStorage.setItem('physics_active_folder_id', activeFolderId.value)
    } catch (e) {
      console.error('Failed to save folders to localStorage', e)
    }
  }

  // Persist favorites
  function saveFavorites() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('physics_user_favorites', JSON.stringify(favorites.value))
    } catch (e) {
      console.error('Failed to save favorites to localStorage', e)
    }
  }

  // Create custom folder
  function createFolder(name: string): FavoriteFolder {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('收藏夹名称不能为空')
    
    // Disallow duplicates
    if (folders.value.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error('已存在同名收藏夹')
    }

    const newFolder: FavoriteFolder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      createdAt: new Date().toISOString()
    }

    folders.value.push(newFolder)
    saveFolders()
    return newFolder
  }

  // Rename custom folder
  function renameFolder(folderId: string, newName: string) {
    const target = folders.value.find(f => f.id === folderId)
    if (!target) return
    if (target.isDefault) throw new Error('默认收藏夹不可重命名')
    const trimmed = newName.trim()
    if (!trimmed) throw new Error('名称不能为空')
    target.name = trimmed
    saveFolders()
  }

  // Delete custom or monthly folder
  function deleteFolder(folderId: string) {
    const target = folders.value.find(f => f.id === folderId)
    if (!target) return
    if (target.isDefault) throw new Error('默认收藏夹不可删除，可清空题目')

    // Move items inside this folder back to default folder
    favorites.value.forEach(item => {
      if (item.folderId === folderId) {
        item.folderId = 'default'
      }
    })

    folders.value = folders.value.filter(f => f.id !== folderId)
    if (activeFolderId.value === folderId) {
      activeFolderId.value = 'default'
    }

    saveFolders()
    saveFavorites()
  }

  // Clear all items in a folder (e.g. Default folder)
  function clearFolder(folderId: string) {
    favorites.value = favorites.value.filter(item => item.folderId !== folderId)
    saveFavorites()
  }

  // Set active folder
  function selectActiveFolder(folderId: string) {
    if (folders.value.some(f => f.id === folderId)) {
      activeFolderId.value = folderId
      saveFolders()
    }
  }

  // Check if an item is favorited
  function isQuestionFavorited(questionId: number | string, subQId: number | string | null = null, inFolderId: string | null = null): boolean {
    return favorites.value.some(fav => {
      const matchQ = String(fav.questionId) === String(questionId)
      const matchSub = subQId ? (String(fav.subQId) === String(subQId)) : (!fav.isSub)
      const matchFolder = inFolderId ? (fav.folderId === inFolderId) : true
      return matchQ && matchSub && matchFolder
    })
  }

  // Find favorite item
  function findFavoriteItem(questionId: number | string, subQId: number | string | null = null, inFolderId: string | null = null): FavoriteItem | undefined {
    return favorites.value.find(fav => {
      const matchQ = String(fav.questionId) === String(questionId)
      const matchSub = subQId ? (String(fav.subQId) === String(subQId)) : (!fav.isSub)
      const matchFolder = inFolderId ? (fav.folderId === inFolderId) : true
      return matchQ && matchSub && matchFolder
    })
  }

  // Toggle favorite
  interface ToggleParams {
    question: any
    subQ?: any | null
    targetFolderId?: string | null
  }

  function toggleFavorite({ question, subQ = null, targetFolderId = null }: ToggleParams) {
    const { t, locale } = useI18n()
    if (!question) return { action: 'error', message: locale.value === 'zh' ? '无效的题目数据' : 'Invalid question data' }

    const chosenFolderId = targetFolderId || activeFolderId.value || 'default'
    const qId = question.id
    const isSub = !!subQ
    const subQId = subQ ? subQ.id : null

    // Check if already favorited in any folder
    const existingIndex = favorites.value.findIndex(fav => {
      const matchQ = String(fav.questionId) === String(qId)
      const matchSub = isSub ? (String(fav.subQId) === String(subQId)) : (!fav.isSub)
      return matchQ && matchSub
    })

    if (existingIndex >= 0) {
      // If already favorited, remove it
      const removed = favorites.value.splice(existingIndex, 1)[0]
      saveFavorites()
      return { 
        action: 'removed', 
        item: removed,
        message: t('toast.unfavSuccess') 
      }
    } else {
      // Add new favorite item
      const board = detectExamBoard(question.paper_filename, question.series)
      const newItem: FavoriteItem = {
        id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        folderId: chosenFolderId,
        questionId: qId,
        isSub,
        subQId: subQ ? subQ.id : null,
        subQNum: subQ ? (subQ.question_raw_number || subQ.question_label) : (question.question_raw_number || ''),
        paperFilename: question.paper_filename || '',
        paperType: question.paper_type || 'SQ',
        board,
        series: question.series || getItemSubject(question),
        score: subQ?.score || question.score || '',
        imagePath: subQ?.image_path || question.image_path || '',
        msImagePath: subQ?.ms_image_path || question.ms_image_path || '',
        msDetails: subQ?.ms_details || question.ms_details || '',
        details: subQ?.details || question.details || '',
        createdAt: new Date().toISOString()
      }

      favorites.value.unshift(newItem)
      saveFavorites()

      const folderObj = folders.value.find(f => f.id === chosenFolderId) || folders.value[0]
      const folderDisplayName = folderObj?.isDefault ? t('galleryNav.defaultFolder') : (folderObj?.name || t('galleryNav.defaultFolder'))
      return {
        action: 'added',
        item: newItem,
        folder: folderObj,
        message: locale.value === 'zh' ? `已收藏到「${folderDisplayName}」` : `Saved to "${folderDisplayName}"`
      }
    }
  }

  // Move a favorite item to another folder
  function moveFavorite(favId: string, newFolderId: string) {
    const item = favorites.value.find(f => f.id === favId)
    if (!item) return false
    const folder = folders.value.find(f => f.id === newFolderId)
    if (!folder) return false

    item.folderId = newFolderId
    saveFavorites()
    return folder
  }

  // Remove a favorite by its ID
  function removeFavoriteById(favId: string) {
    const idx = favorites.value.findIndex(f => f.id === favId)
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
      saveFavorites()
      return true
    }
    return false
  }

  // Active folder object
  const activeFolder = computed(() => {
    return folders.value.find(f => f.id === activeFolderId.value) || folders.value[0]
  })

  // Folder item count helper
  function getFolderCount(folderId: string): number {
    return favorites.value.filter(f => f.folderId === folderId).length
  }

  // Total favorites count
  const totalFavoritesCount = computed(() => favorites.value.length)

  function setTargetSubjectScope(scope: string) {
    targetSubjectScope.value = scope
  }

  return {
    folders,
    favorites,
    activeFolderId,
    activeFolder,
    totalFavoritesCount,
    isFavoriteMode,
    targetSubjectScope,
    setTargetSubjectScope,
    initFavorites,
    createFolder,
    renameFolder,
    deleteFolder,
    clearFolder,
    selectActiveFolder,
    isQuestionFavorited,
    findFavoriteItem,
    toggleFavorite,
    moveFavorite,
    removeFavoriteById,
    getFolderCount
  }
}

