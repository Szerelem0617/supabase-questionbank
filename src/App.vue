<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './supabase'
import Auth from './components/Auth.vue'
import Avatar from './components/Avatar.vue'

// --- Auth ---
const session = ref(null)

// --- 响应式变量 ---
const images = ref([]) // 存储图片 URL (只会有一个)
const loadingText = ref('正在加载图片...') // 初始加载文本

// 存储当前题目的核心数据
const currentQuestionData = ref(null) // { id, paper_filename, ms_vector }
const currentFilename = ref('') // 存储当前图片的文件名

const msDetails = ref('')         // 存储从数据库获取的评分标准
const showDetails = ref(false)    // 控制评分标准是否显示
const detailsLoading = ref(false) // 控制详情的加载状态

const similarityScore = ref(null) // 存储相似度得分
const findingSimilar = ref(false) // "换图" 按钮的加载状态


async function signOut() {
  const { error } = await supabase.auth.signOut()
}

/**
 * 异步函数：从 Storage 获取一张随机图片 (初始加载)
 */
async function getImages() {
  // 重置状态
  images.value = []
  currentQuestionData.value = null
  currentFilename.value = ''
  showDetails.value = false
  msDetails.value = ''
  similarityScore.value = null
  loadingText.value = '正在加载图片...'
  findingSimilar.value = false

  try {
    // 1. 从 'bucket' 存储桶中列出所有文件
    const { data: fileList, error: listError } = await supabase.storage
      .from('bucket') // 你的桶名
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      })
    if (listError) throw listError
    if (!fileList || fileList.length === 0) {
      loadingText.value = '存储桶中没有文件。'
      return
    }

    // 2. 过滤列表：只保留 *包含* "ms" 并且不是占位符的文件
    const filteredList = fileList.filter(file => {
      return file.name.includes('ms') && file.name !== '.emptyFolderPlaceholder'
    })
    if (filteredList.length === 0) {
      loadingText.value = '没有找到符合条件的图片（包含 "ms"）。'
      return
    }

    // 3. 随机选择一个文件
    const randomIndex = Math.floor(Math.random() * filteredList.length)
    const randomFile = filteredList[randomIndex]
    
    // 4. 存储当前文件名
    currentFilename.value = randomFile.name
    console.log('Selected file:', currentFilename.value)

    // 5. 转换文件名 (e.g., '..._ms_11_1_a.png') 为 ID (e.g., '..._qp_11_1_a')
    const fileId = currentFilename.value
                          .substring(0, currentFilename.value.lastIndexOf('.')) 
                          .replace('_ms_', '_qp_') 
    
    // 6. 从数据库获取此题的 'id', 'paper_filename', 'ms_vector'
    const { data: questionData, error: dbError } = await supabase
      .from('questions_data')
      .select('id, paper_filename, ms_vector')
      .eq('id', fileId)
      .single()

    if (dbError) throw dbError
    currentQuestionData.value = questionData // 存储核心数据

    // 7. 为这一个随机文件获取公开 URL
    const { data: publicUrlData } = supabase.storage
      .from('bucket')
      .getPublicUrl(currentFilename.value)

    // 8. 更新 images 变量
    images.value = [publicUrlData.publicUrl]

  } catch (error) {
    console.error('Error in getImages:', error)
    loadingText.value = '获取图片时发生意外错误。'
  }
}

/**
 * 异步函数：获取并显示评分标准 (ms_details)
 */
async function fetchDetails() {
  if (!currentQuestionData.value) return 
  if (showDetails.value) {
    showDetails.value = false
    return
  }
  detailsLoading.value = true
  msDetails.value = ''

  try {
    // 1. 使用已有的 'id' 从 'questions_data' 表中查询
    const { data, error } = await supabase
      .from('questions_data')
      .select('ms_details')
      .eq('id', currentQuestionData.value.id) // 使用我们已有的 id
      .single()

    if (error) throw error
    msDetails.value = data.ms_details || '未找到对应的评分标准。'

  } catch (error) {
    console.error('Error fetching details:', error)
    msDetails.value = '无法加载此题的评分标准。'
  } finally {
    detailsLoading.value = false
    showDetails.value = true 
  }
}

/**
 * 异步函数：查找并切换到最相似的图片
 */
async function findSimilarImage() {
  if (!currentQuestionData.value) return // 必须有当前数据

  findingSimilar.value = true
  images.value = [] // 清空当前图片，显示加载
  loadingText.value = '正在查找相似题目...'
  showDetails.value = false // 隐藏旧的详情
  similarityScore.value = null // 清空旧的相似度

  try {
    // 1. 调用我们创建的数据库函数
    const { data: similarData, error: rpcError } = await supabase.rpc(
      'match_similar_question', // 函数名
      {
        // 函数参数
        current_vector: currentQuestionData.value.ms_vector,
        current_paper: currentQuestionData.value.paper_filename,
        current_id: currentQuestionData.value.id
      }
    )

    if (rpcError) throw rpcError
    
    // rpc 函数返回的是一个数组，我们取第一个
    const nextQuestion = similarData[0] 
    
    if (!nextQuestion) {
      loadingText.value = '未能在同一份 paper 中找到其他相似题目。'
      return
    }

    console.log('Found similar question:', nextQuestion.id, 'Similarity:', nextQuestion.similarity)

    // 2. 更新当前题目数据
    currentQuestionData.value = {
      id: nextQuestion.id,
      paper_filename: nextQuestion.paper_filename,
      ms_vector: nextQuestion.ms_vector
    }

    // 3. 存储相似度
    similarityScore.value = nextQuestion.similarity

    // 4. 转换新 ID 为 MS 文件名
    // (e.g., '..._qp_11_6_a_i' -> '..._ms_11_6_a_i.png')
    const newMsFilename = nextQuestion.id.replace('_qp_', '_ms_') + '.png'
    currentFilename.value = newMsFilename

    // 5. 获取新图片的 URL
    const { data: publicUrlData } = supabase.storage
      .from('bucket')
      .getPublicUrl(newMsFilename)
    
    // 6. 显示新图片
    images.value = [publicUrlData.publicUrl]
    
  } catch (error) {
    console.error('Error finding similar image:', error)
    loadingText.value = '查找相似图片时出错。'
  } finally {
    findingSimilar.value = false
  }
}

// 在组件挂载（加载）时，调用 getImages 函数
onMounted(() => {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
  })

  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session
  })

  getImages()
})
</script>

<template>
  <div v-if="session" class="gallery-container">
    <Avatar />
    <button @click="signOut" class="button">Sign Out</button>

    <h1>Supabase 向量搜索画廊</h1>
    
    <div v-if="images.length === 0 && (loadingText || findingSimilar)">
      {{ loadingText }}
    </div>

    <div v-if="images.length > 0" class="image-wrapper">
      
      <div class="image-item-single">
        <img :src="images[0]" :key="images[0]" alt="Supabase Image" />
      </div>

      <div v-if="similarityScore !== null" class="similarity-display">
        相似度: {{ (similarityScore * 100).toFixed(2) }}%
      </div>

      <div class="button-group">
        <button @click="findSimilarImage" :disabled="findingSimilar" class="details-button">
          {{ findingSimilar ? '查找中...' : '换一张 (最相似)' }}
        </button>

        <button @click="fetchDetails" :disabled="findingSimilar" class="details-button">
          {{ showDetails ? '隐藏评分标准' : '显示评分标准' }}
        </button>
      </div>
      
      <div v-if="showDetails" class="details-box">
        <div v-if="detailsLoading">
          正在加载评分标准...
        </div>
        <div v-else>
          {{ msDetails }}
        </div>
      </div>

    </div>
  </div>
  <Auth v-else />
</template>

<style>
/* 基础样式 */
body {
  font-family: Arial, sans-serif;
  background-color: #f4f4f4;
  margin: 0;
  padding: 20px;
}
.gallery-container {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}
.image-wrapper {
  margin-top: 20px;
}

/* 单个图片样式 (半屏高) */
.image-item-single {
  margin: 0 auto;
  width: 90%;
  max-width: 1200px;
  height: 50vh; 
  display: flex;
  justify-content: center;
  align-items: center;
}
.image-item-single img {
  width: 100%;
  height: 100%;
  object-fit: contain; 
}

/* --- 新增样式 --- */

/* 相似度显示 */
.similarity-display {
  margin-top: 15px;
  font-size: 1.2em;
  font-weight: bold;
  color: #333;
}

/* 按钮组 */
.button-group {
  display: flex;
  justify-content: center;
  gap: 15px; /* 按钮之间的间距 */
  margin-top: 20px;
}

/* 详情按钮样式 */
.details-button {
  background-color: #3e635f;
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
  min-width: 180px;
}
.details-button:hover {
  background-color: #324f4c;
}
.details-button:disabled {
  background-color: #999;
  opacity: 0.7;
  cursor: not-allowed;
}

/* 详情框样式 */
.details-box {
  margin: 20px auto;
  padding: 24px;
  width: 80%;
  max-width: 1000px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  white-space: pre-wrap; 
  text-align: left;
  line-height: 1.6;
}

.button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background-color: #3e635f;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
}
</style>