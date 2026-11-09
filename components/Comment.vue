<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Use Nuxt clients
const client = useSupabaseClient()
const { profile } = useUserProfile() 

const messages = ref([])
const newMessage = ref('')
const loading = ref(true)
const sending = ref(false)

let subscription = null

function getAuthorDisplayName(msg) {
  if (msg.profiles?.display_name) {
    return msg.profiles.display_name;
  }
  return 'Unnamed';
}

async function fetchMessages() {
  try {
    loading.value = true
    const { data: messagesData, error: messagesError } = await client
      .from('comments')
      .select(`
        id,
        created_at,
        message,
        user_id,
        profiles (
          display_name,
          avatar_url,
          website
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (messagesError) throw messagesError
    
    messages.value = messagesData

  } catch (error) {
    console.error('Error fetching messages:', error.message)
  } finally {
    loading.value = false
  }
}

async function handleSendMessage() {
  if (!newMessage.value.trim()) return

  try {
    sending.value = true
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error("You must be logged in to post a message.")

    const messageData = {
      message: newMessage.value.trim(),
      user_id: user.id,
    }

    const { error } = await client.from('comments').insert(messageData)
    if (error) throw error

    newMessage.value = '' 
  } catch (error) {
    console.error('Error sending message:', error.message)
    alert(error.message)
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  fetchMessages()

  subscription = client
    .channel('public:comments')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'comments' },
      async (payload) => {
        const { data: newMessage, error } = await client
          .from('comments')
          .select(`
            id, created_at, message, user_id,
            profiles (
              display_name,
              avatar_url,
              website
            )
          `)
          .eq('id', payload.new.id)
          .single()
        
        if (error) {
            console.error('Error fetching new message:', error)
            return;
        }

        if (newMessage) {
            messages.value.unshift(newMessage)
        }
      }
    )
    .subscribe()
})

onUnmounted(() => {
  if (subscription) {
    client.removeChannel(subscription)
  }
})
</script>

<template>
  <div class="comment-container">
    <h2>留言板 (Comments)</h2>

    <div v-if="profile" class="message-form">
      <textarea
        v-model="newMessage"
        placeholder="Say something..."
        :disabled="sending"
      ></textarea>
      <button @click="handleSendMessage" :disabled="sending">
        {{ sending ? 'Sending...' : 'Post Message' }}
      </button>
    </div>
    <div v-else class="login-prompt">
      Please <NuxtLink to="/login">log in</NuxtLink> to post a message.
    </div>

    <div v-if="loading">Loading messages...</div>
    <div v-else-if="messages.length === 0">No messages yet. Be the first!</div>
    <ul v-else class="message-list">
      <li v-for="msg in messages" :key="msg.id" class="message-item">
        <div class="author-info">
          <img 
            :src="msg.profiles?.avatar_url || 'https://via.placeholder.com/40'" 
            alt="avatar" 
            class="author-avatar"
          />
          <a v-if="msg.profiles?.website" :href="msg.profiles.website" target="_blank" rel="noopener noreferrer" class="author-name-link">
            <span class="author-name">{{ getAuthorDisplayName(msg) }}</span>
          </a>
          <span v-else class="author-name">{{ getAuthorDisplayName(msg) }}</span>
        </div>
        <p class="message-content">{{ msg.message }}</p>
        <span class="message-time">{{ new Date(msg.created_at).toLocaleString() }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.comment-container {
  margin: 36px auto 60px;
  padding: 22px 24px;
  width: 100%;
  max-width: 960px;
  background-color: var(--bg-surface);
  border-radius: var(--radius-card);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 18px 0;
  letter-spacing: -0.01em;
}

.message-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.message-form textarea {
  width: 100%;
  min-height: 80px;
  padding: 12px 14px;
  border-radius: var(--radius-base);
  border: 1px solid var(--border-subtle);
  background: var(--bg-input);
  font-family: inherit;
  font-size: 0.88rem;
  color: var(--text-main);
  outline: none;
  resize: vertical;
  transition: all 0.15s ease;
}

.message-form textarea:focus {
  background: var(--bg-surface);
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-primary-light);
}

.message-form button {
  align-self: flex-end;
  padding: 7px 20px;
  font-size: 0.85rem;
  font-weight: 700;
  border: none;
  border-radius: var(--radius-base);
  background-color: var(--accent-primary);
  color: #ffffff;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: background-color 0.15s ease;
}

.message-form button:hover:not(:disabled) {
  background-color: var(--accent-primary-hover);
}

.message-form button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.login-prompt {
  text-align: center;
  padding: 16px;
  background-color: var(--bg-surface-subtle);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-base);
  margin-bottom: 20px;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.login-prompt a {
  color: var(--accent-primary);
  font-weight: 700;
  text-decoration: underline;
}

.message-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  background-color: var(--bg-surface-subtle);
  box-shadow: var(--shadow-sm);
}

.author-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.author-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-subtle);
}

.author-name {
  font-weight: 700;
  font-size: 0.86rem;
  color: var(--text-main);
}

.author-name-link {
  color: var(--accent-primary);
  text-decoration: none;
}
.author-name-link:hover {
  text-decoration: underline;
}

.message-content {
  margin: 0 0 8px 0;
  font-size: 0.88rem;
  line-height: 1.6;
  white-space: pre-wrap;
  color: var(--text-secondary);
}

.message-time {
  align-self: flex-end;
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>
