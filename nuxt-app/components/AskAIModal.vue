<script setup>
import { ref, watch } from 'vue'
// Nuxt 自动导入 useSupabaseClient
const client = useSupabaseClient()

const props = defineProps({
  isOpen: Boolean,
  questionNumber: String,
  contextText: String,
})

const emit = defineEmits(['close'])

const userPrompt = ref('')
const selectedFile = ref(null)
const filePreview = ref(null)
const isLoading = ref(false)
const aiResponse = ref('')
const errorMsg = ref('')
const showContext = ref(false)

// Reset state when opening
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    userPrompt.value = ''
    selectedFile.value = null
    filePreview.value = null
    aiResponse.value = ''
    errorMsg.value = ''
    isLoading.value = false
    showContext.value = false
  }
})

function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return
  
  // Basic validation
  if (!file.type.startsWith('image/')) {
    alert('Only image files are allowed.')
    return
  }
  
  selectedFile.value = file
  
  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    filePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

async function sendToAI() {
  if (isLoading.value) return
  
  isLoading.value = true
  aiResponse.value = ''
  errorMsg.value = ''
  
  try {
    let imageBase64 = null
    let mimeType = null
    
    if (selectedFile.value) {
        // Extract base64 string (remove data:image/png;base64, prefix)
        const parts = filePreview.value.split(',')
        if (parts.length === 2) {
            imageBase64 = parts[1]
            mimeType = selectedFile.value.type
        }
    }

    const payload = {
        questionText: props.contextText,
        userPrompt: userPrompt.value,
        imageBase64,
        mimeType
    }
    
    // 使用 client (useSupabaseClient) 而不是 supabase
    const { data, error } = await client.functions.invoke('ask-ai', {
        body: payload
    })
    
    if (error) throw error
    if (data.error) throw new Error(data.error)
    
    aiResponse.value = data.answer
    
  } catch (e) {
    console.error("AI Error:", e)
    errorMsg.value = e.message || 'Failed to get response from AI.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Ask AI: Question {{ questionNumber }}</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- Context Section -->
        <div class="context-section">
            <button @click="showContext = !showContext" class="toggle-btn">
                {{ showContext ? '▼ Hide Question Text' : '▶ Show Question Text' }}
            </button>
            <div v-if="showContext" class="context-text">
                {{ contextText }}
            </div>
        </div>

        <!-- User Input -->
        <div class="input-group">
            <label>Your Question (Optional):</label>
            <textarea 
                v-model="userPrompt" 
                placeholder="e.g. Explain step 2..."
                rows="3"
            ></textarea>
        </div>
        
        <!-- Image Upload -->
        <div class="input-group">
            <label>Upload Image (Optional):</label>
            <input type="file" @change="handleFileChange" accept="image/*" />
            <div v-if="filePreview" class="image-preview">
                <img :src="filePreview" alt="Preview" />
                <button @click="selectedFile = null; filePreview = null" class="remove-img-btn">Remove</button>
            </div>
        </div>

        <!-- Error -->
        <div v-if="errorMsg" class="error-msg">
            {{ errorMsg }}
        </div>

        <!-- Result -->
        <div v-if="aiResponse" class="ai-result">
            <h3>AI Response:</h3>
            <div class="response-text">{{ aiResponse }}</div>
        </div>

      </div>
      
      <div class="modal-footer">
        <button @click="sendToAI" :disabled="isLoading" class="send-btn">
            {{ isLoading ? 'Thinking...' : 'Send to AI' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  width: 90%;
  max-width: 600px;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}
.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}

.context-section {
    margin-bottom: 15px;
}
.toggle-btn {
    background: none;
    border: none;
    color: #3e635f;
    cursor: pointer;
    font-weight: bold;
    padding: 0;
}
.context-text {
    margin-top: 5px;
    padding: 10px;
    background: #f9f9f9;
    border: 1px solid #eee;
    border-radius: 4px;
    font-size: 0.9rem;
    color: #555;
    max-height: 100px;
    overflow-y: auto;
}

.input-group {
    margin-bottom: 15px;
}
.input-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: #444;
}
textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box; /* Important for width: 100% */
}

.image-preview {
    margin-top: 10px;
    position: relative;
    display: inline-block;
}
.image-preview img {
    max-width: 100px;
    max-height: 100px;
    border-radius: 4px;
    border: 1px solid #ddd;
}
.remove-img-btn {
    position: absolute;
    top: -5px;
    right: -5px;
    background: red;
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 12px;
    cursor: pointer;
}

.send-btn {
    background-color: #3e635f;
    color: white;
    border: none;
    padding: 10px 24px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    font-size: 1rem;
}
.send-btn:disabled {
    background-color: #8aa3a0;
    cursor: not-allowed;
}

.error-msg {
    color: #d9534f;
    background: #f9d6d5;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
}

.ai-result {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 2px dashed #eee;
}
.ai-result h3 {
    margin-top: 0;
    font-size: 1.1rem;
    color: #3e635f;
}
.response-text {
    white-space: pre-wrap;
    line-height: 1.5;
    color: #333;
}
</style>
