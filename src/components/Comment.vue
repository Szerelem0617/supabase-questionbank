<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabase'
import { store } from '../store' // To access session and profile info

const messages = ref([])
const newMessage = ref('')
const loading = ref(true)
const sending = ref(false)

let subscription = null

/**
 * Helper function to determine the display name for an author.
 * Prioritizes profiles.display_name, otherwise defaults to 'Unnamed'.
 */
function getAuthorDisplayName(msg) {
  // Use the display_name from the profiles table if it exists and is not an empty string
  if (msg.profiles?.display_name) {
    return msg.profiles.display_name;
  }
  return 'Unnamed';
}


/**
 * Fetches initial messages, then fetches emails for users without a display_name
 * via an RPC call.
 */
async function fetchMessages() {
  try {
    loading.value = true
    // 1. Fetch messages and basic profile info
    const { data: messagesData, error: messagesError } = await supabase
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
    alert(`Sorry, could not load messages: ${error.message}`) // Keep user-facing error
  } finally {
    loading.value = false
  }
}

/**
 * Handles sending a new message.
 */
async function handleSendMessage() {
  if (!newMessage.value.trim()) return

  try {
    sending.value = true
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("You must be logged in to post a message.")

    const messageData = {
      message: newMessage.value.trim(),
      user_id: user.id,
    }

    const { error } = await supabase.from('comments')
    if (error) throw error

    newMessage.value = '' // Clear input after sending
  } catch (error) {
    console.error('Error sending message:', error.message)
    alert(error.message)
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  // Fetch initial data
  fetchMessages()

  // Set up real-time subscription
  subscription = supabase
    .channel('public:comments')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'comments' },
      async (payload) => {
        // When a new message is inserted, fetch it along with the profile info
        const { data: newMessage, error } = await supabase
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
            console.error('Error fetching new message with profile:', error)
            return;
        }

        if (newMessage) {
            messages.value.unshift(newMessage) // Add new message to the top of the list
        }
      }
    )
    .subscribe()
})

onUnmounted(() => {
  // Clean up the subscription when the component is destroyed
  if (subscription) {
    supabase.removeChannel(subscription)
  }
})
</script>

<template>
  <div class="comment-container">
    <h2>留言板 (Comments)</h2>

    <!-- Form for logged-in users -->
    <div v-if="store.profile" class="message-form">
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
      Please log in to post a message.
    </div>

    <!-- Message List -->
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
  margin: 40px auto;
  padding: 24px;
  width: 90%;
  max-width: 1000px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
h2 {
  text-align: center;
  margin-bottom: 24px;
}

/* Message Form */
.message-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 30px;
}
.message-form textarea {
  width: 100%;
  min-height: 80px;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-family: inherit;
  font-size: 16px;
  resize: vertical;
}
.message-form button {
  align-self: flex-end;
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  border-radius: 6px;
  background-color: #3e635f;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}
.message-form button:disabled {
  background-color: #999;
  cursor: not-allowed;
}
.login-prompt {
  text-align: center;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 30px;
  color: #666;
}

/* Message List */
.message-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.message-item {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #fafafa;
}
.author-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}
.author-name {
  font-weight: bold;
  font-size: 1.1em;
}
.author-name-link {
  color: #007bff; /* Standard blue link color */
  text-decoration: underline; /* Always underlined */
}
.author-name-link:hover {
  color: #0056b3; /* Darker blue on hover */
}
.message-content {
  margin: 0 0 12px 0;
  font-size: 1em;
  line-height: 1.6;
  white-space: pre-wrap;
}
.message-time {
  align-self: flex-end;
  font-size: 0.8em;
  color: #888;
}
</style>
