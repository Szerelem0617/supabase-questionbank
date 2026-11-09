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
  background: rgba(28, 25, 23, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-surface);
  color: var(--text-main);
  width: 90%;
  max-width: 600px;
  border-radius: var(--radius-card);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.modal-header {
  padding: 16px 22px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-surface-subtle);
}
.modal-header h2 {
  margin: 0;
  font-size: 1.18rem;
  font-weight: 700;
  color: var(--text-main);
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.8rem;
  line-height: 1;
  cursor: pointer;
  color: var(--text-muted);
}
.close-btn:hover {
  color: var(--text-main);
}

.modal-body {
  padding: 22px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 14px 22px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  background: var(--bg-surface-subtle);
}

.context-section {
  margin-bottom: 15px;
}
.toggle-btn {
  background: none;
  border: none;
  color: var(--accent-primary);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0;
}
.context-text {
  margin-top: 5px;
  padding: 10px;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  font-size: 0.9rem;
  color: var(--text-secondary);
  max-height: 100px;
  overflow-y: auto;
}

.input-group {
  margin-bottom: 15px;
}
.input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-muted);
}
textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  background: var(--bg-input);
  color: var(--text-main);
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
  outline: none;
}
textarea:focus {
  border-color: var(--border-focus);
}

.image-preview {
  margin-top: 10px;
  position: relative;
  display: inline-block;
}
.image-preview img {
  max-width: 100px;
  max-height: 100px;
  border-radius: var(--radius-base);
  border: 1px solid var(--border-subtle);
}
.remove-img-btn {
  position: absolute;
  top: -5px;
  right: -5px;
  background: var(--feedback-error);
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  cursor: pointer;
}

.send-btn {
  background-color: var(--accent-primary);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: var(--radius-base);
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
}
.send-btn:hover:not(:disabled) {
  background-color: var(--accent-primary-hover);
}
.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  color: var(--feedback-error);
  background: var(--feedback-error-bg);
  border: 1px solid var(--feedback-error-border);
  padding: 10px;
  border-radius: var(--radius-base);
  margin-bottom: 15px;
}

.ai-result {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 2px dashed var(--border-subtle);
}
.ai-result h3 {
  margin-top: 0;
  font-size: 1.1rem;
  color: var(--accent-primary);
}
.response-text {
  white-space: pre-wrap;
  line-height: 1.5;
  color: var(--text-secondary);
}
</style>
