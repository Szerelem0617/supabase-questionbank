<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './supabase'
import { store } from './store'
import Auth from './components/Auth.vue'
import Avatar from './components/Avatar.vue'

// --- App State ---
const showLoginPage = ref(false)

// --- Auth ---
const session = ref(null)

function goToLogin() {
  showLoginPage.value = true
}

async function signOut() {
  await supabase.auth.signOut()
  session.value = null
  store.profile = null // Clear profile on sign out
}

// --- Gallery ---
const images = ref([])
const loadingText = ref('正在加载图片...')
const currentQuestionData = ref(null)
const currentFilename = ref('')
const msDetails = ref('')
const showDetails = ref(false)
const detailsLoading = ref(false)
const similarityScore = ref(null)
const findingSimilar = ref(false)

async function getImages() {
  images.value = []
  currentQuestionData.value = null
  currentFilename.value = ''
  showDetails.value = false
  msDetails.value = ''
  similarityScore.value = null
  loadingText.value = '正在加载图片...'
  findingSimilar.value = false

  try {
    // 1. Fetch all IDs from the specific paper '9618_s22_11'.
    const paperToDisplay = '9618_s22_qp_11.pdf';
    const { data: allIds, error: idError } = await supabase
      .from('questions_data')
      .select('id')
      .eq('paper_filename', paperToDisplay); // Filter by the specific paper

    if (idError) throw idError;
    if (!allIds || allIds.length === 0) {
      throw new Error(`数据库中没有找到任何关于 '${paperToDisplay}' 的题目。`);
    }

    // 2. Pick a random ID from the filtered list
    const randomIndex = Math.floor(Math.random() * allIds.length);
    const randomId = allIds[randomIndex].id;

    // 3. Fetch the full data for that single random ID.
    const { data: questionData, error: dbError } = await supabase
      .from('questions_data')
      .select('id, paper_filename, ms_vector')
      .eq('id', randomId)
      .single(); 
    
    if (dbError) throw dbError;

    // 4. Construct the image filename from the guaranteed valid database ID.
    const msFilename = questionData.id.replace('_qp_', '_ms_') + '.png';

    // 5. Get the public URL for that image.
    const { data: publicUrlData } = supabase.storage
      .from('bucket')
      .getPublicUrl(msFilename);
    
    // 6. Update the application state.
    currentQuestionData.value = questionData;
    currentFilename.value = msFilename;
    images.value = [publicUrlData.publicUrl];

  } catch (error) {
    console.error('Error in getImages:', error)
    loadingText.value = `获取图片时发生错误: ${error.message}`
  }
}

async function fetchDetails() {
  if (!currentQuestionData.value) return
  if (showDetails.value) {
    showDetails.value = false
    return
  }
  detailsLoading.value = true
  msDetails.value = ''
  try {
    const { data, error } = await supabase
      .from('questions_data')
      .select('ms_details')
      .eq('id', currentQuestionData.value.id)
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

async function findSimilarImage() {
  if (!currentQuestionData.value) return
  findingSimilar.value = true
  images.value = []
  loadingText.value = '正在查找相似题目...'
  showDetails.value = false
  similarityScore.value = null
  try {
    const { data: similarData, error: rpcError } = await supabase.rpc('match_similar_question', {
      current_vector: currentQuestionData.value.ms_vector,
      current_paper: currentQuestionData.value.paper_filename,
      current_id: currentQuestionData.value.id
    })
    if (rpcError) throw rpcError
    const nextQuestion = similarData[0]
    if (!nextQuestion) {
      loadingText.value = '未能在同一份 paper 中找到其他相似题目。'
      return
    }
    currentQuestionData.value = {
      id: nextQuestion.id,
      paper_filename: nextQuestion.paper_filename,
      ms_vector: nextQuestion.ms_vector
    }
    similarityScore.value = nextQuestion.similarity
    const newMsFilename = nextQuestion.id.replace('_qp_', '_ms_') + '.png'
    currentFilename.value = newMsFilename
    const { data: publicUrlData } = supabase.storage.from('bucket').getPublicUrl(newMsFilename)
    images.value = [publicUrlData.publicUrl]
  } catch (error) {
    console.error('Error finding similar image:', error)
    loadingText.value = '查找相似图片时出错。'
  } finally {
    findingSimilar.value = false
  }
}

onMounted(() => {
  // Handles all auth events
  supabase.auth.onAuthStateChange((event, _session) => {
    session.value = _session
    // On initial load with a session, or after a user signs in
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      store.fetchProfile();
      showLoginPage.value = false;
    }
  })
  
  // Load public gallery for everyone
  getImages()
})

</script>

<template>
  <Auth v-if="showLoginPage" @back="showLoginPage = false" />
  <div v-else class="app-container">
    <!-- Top bar for Authentication -->
    <div class="top-bar">
      <div v-if="session" class="auth-widget">
        <Avatar />
        <button @click="signOut" class="auth-button">Sign Out</button>
      </div>
      <div v-else class="auth-widget">
        <button @click="goToLogin" class="auth-button">
          Login / Register
        </button>
      </div>
    </div>

    <!-- Main Gallery -->
    <div class="gallery-container">
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
          <div v-if="detailsLoading">正在加载评分标准...</div>
          <div v-else>{{ msDetails }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* 基础样式 */
body {
  font-family: Arial, sans-serif;
  background-color: #f4f4f4;
  margin: 0;
  padding: 20px;
}
.app-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* --- Top Auth Bar --- */
.top-bar {
  display: flex;
  justify-content: flex-start; /* Aligned to the left */
  padding: 10px;
  margin-bottom: 20px;
}
.auth-widget {
  display: flex;
  align-items: center;
  gap: 15px;
}
.auth-button {
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: white;
  background-color: #3e635f; /* Main theme color */
}
.auth-button:hover {
  background-color: #324f4c;
}


/* --- Gallery --- */
.gallery-container {
  text-align: center;
}
.image-wrapper {
  margin-top: 20px;
}
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
.similarity-display {
  margin-top: 15px;
  font-size: 1.2em;
  font-weight: bold;
  color: #333;
}
.button-group {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}
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
</style>