<script setup>
import { ref, watch } from 'vue'
import TurnstileWidget from '~/components/TurnstileWidget.vue'

const props = defineProps({
  isOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'message-posted'])

const user = useSupabaseUser()
const { profile } = useUserProfile()
const { locale } = useI18n()

const commentText = ref('')
const guestNickname = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const turnstileToken = ref('')
const turnstileRef = ref(null)

// 每次打开弹窗重置状态，保证人机验证凭证新鲜
watch(() => props.isOpen, (open) => {
  if (open) {
    errorMessage.value = ''
    turnstileToken.value = ''
    turnstileRef.value?.reset()
  }
})

async function handleSubmit() {
  const text = commentText.value.trim()
  if (!text) {
    errorMessage.value = locale.value === 'zh' ? '请输入留言内容' : 'Please enter a message'
    return
  }
  if (text.length > 140) {
    errorMessage.value = locale.value === 'zh' ? '留言内容请控制在 140 字以内' : 'Message must be within 140 characters'
    return
  }
  if (!turnstileToken.value) {
    errorMessage.value = locale.value === 'zh' ? '请等待 Cloudflare 防人机验证完成' : 'Please complete Cloudflare verification'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const authorName = user.value 
      ? (profile.value?.display_name || user.value.email?.split('@')[0] || '考友')
      : (guestNickname.value.trim() || '考友')

    // 通过专属服务端接口校验 Turnstile 后安全入库
    const res = await $fetch('/api/comments', {
      method: 'POST',
      body: {
        message: text,
        turnstileToken: turnstileToken.value,
        userId: user.value ? user.value.id : null
      }
    })

    const inserted = res?.data
    const newMsgObj = {
      id: inserted?.id || `local-${Date.now()}`,
      author: authorName,
      message: text,
      likes: inserted?.likes || 0,
      liked: false,
      time: '刚刚'
    }

    emit('message-posted', newMsgObj)
    commentText.value = ''
    guestNickname.value = ''
    turnstileToken.value = ''
    turnstileRef.value?.reset()
    emit('close')
  } catch (err) {
    console.warn('[HomeCommentModal] Submission failed:', err)
    errorMessage.value = err?.statusMessage || err?.data?.statusMessage || (locale.value === 'zh' ? '发送失败，请重试' : 'Submission failed, please retry')
    turnstileRef.value?.reset()
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="modal-backdrop" @click="emit('close')">
      <div class="modal-card" @click.stop>
        <div class="modal-header">
          <div class="mh-left">
            <span class="mh-icon">💬</span>
            <h3 class="mh-title">{{ locale === 'zh' ? '考友交流留言 · 实时弹幕上墙' : 'Community Board · Post Live Comment' }}</h3>
          </div>
          <button type="button" class="btn-close" @click="emit('close')">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Author Identity Info -->
          <div class="author-row">
            <div v-if="user" class="logged-user-chip">
              <img :src="profile?.avatar_url || 'https://via.placeholder.com/24'" class="author-avatar" alt="Avatar" />
              <span class="author-name">{{ profile?.display_name || user.email?.split('@')[0] }}</span>
              <span class="user-badge">{{ locale === 'zh' ? '已登录' : 'Logged In' }}</span>
            </div>
            <div v-else class="guest-input-wrap">
              <span class="guest-label">👤 {{ locale === 'zh' ? '昵称 (可选):' : 'Nickname:' }}</span>
              <input 
                v-model="guestNickname" 
                type="text" 
                :placeholder="locale === 'zh' ? '热心考友' : 'Anonymous'" 
                class="guest-nick-field" 
                maxlength="15"
              />
              <NuxtLink to="/login" class="link-to-login" @click="emit('close')">
                {{ locale === 'zh' ? '去登录' : 'Sign In' }} &rarr;
              </NuxtLink>
            </div>
          </div>

          <!-- Message Textarea -->
          <div class="textarea-wrap">
            <textarea
              v-model="commentText"
              rows="3"
              maxlength="140"
              class="comment-textarea"
              :placeholder="locale === 'zh' ? '写下你的备考心得、做题技巧或祝福，发送后将立即在弹幕浮动上墙...' : 'Share your physics study tips or encouragement, it will float live across the site...'"
              @keydown.enter.meta.prevent="handleSubmit"
              @keydown.enter.ctrl.prevent="handleSubmit"
            ></textarea>
            <div class="char-count" :class="{ 'is-limit': commentText.length >= 130 }">
              {{ commentText.length }} / 140
            </div>
          </div>

          <!-- Cloudflare Turnstile 智能防人机验证 -->
          <div class="turnstile-section">
            <TurnstileWidget 
              ref="turnstileRef" 
              v-model="turnstileToken" 
              theme="light" 
              size="normal" 
            />
          </div>

          <div v-if="errorMessage" class="error-tip">
            ⚠️ {{ errorMessage }}
          </div>
        </div>

        <div class="modal-footer">
          <span class="shortcut-tip">{{ locale === 'zh' ? '支持 Ctrl/⌘ + Enter 快速发送' : 'Press Ctrl/⌘ + Enter to send' }}</span>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="emit('close')">
              {{ locale === 'zh' ? '取消' : 'Cancel' }}
            </button>
            <button 
              type="button" 
              class="btn-submit" 
              :disabled="isSubmitting || !commentText.trim() || !turnstileToken"
              @click="handleSubmit"
            >
              {{ isSubmitting ? (locale === 'zh' ? '发送中...' : 'Posting...') : (locale === 'zh' ? '🚀 发送并上墙' : '🚀 Post Comment') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(44, 47, 50, 0.45);
  backdrop-filter: blur(3px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 480px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(44, 47, 50, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface-subtle);
}

.mh-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mh-icon {
  font-size: 1.15rem;
}

.mh-title {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--text-main);
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.35rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0 4px;
  border-radius: 4px;
}

.btn-close:hover {
  color: var(--accent-primary);
  background: rgba(194, 65, 40, 0.08);
}

.modal-body {
  padding: 16px 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.author-row {
  display: flex;
  align-items: center;
}

.logged-user-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2px 10px 2px 4px;
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.author-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-main);
}

.user-badge {
  font-size: 0.65rem;
  font-weight: 600;
  color: #2b7a54;
  background: #f0f7f4;
  padding: 1px 5px;
  border-radius: 4px;
}

.guest-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.guest-label {
  font-size: 0.76rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.guest-nick-field {
  flex: 1;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.78rem;
  background: var(--bg-surface);
  color: var(--text-main);
  outline: none;
  box-sizing: border-box;
}

.guest-nick-field:focus {
  border-color: var(--accent-primary);
}

.link-to-login {
  font-size: 0.74rem;
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}

.link-to-login:hover {
  text-decoration: underline;
}

.textarea-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
}

.comment-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px 24px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--text-main);
  background: var(--bg-surface);
  resize: none;
  outline: none;
  transition: border-color 0.16s ease;
}

.comment-textarea:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(194, 65, 40, 0.1);
}

.char-count {
  position: absolute;
  bottom: 6px;
  right: 10px;
  font-size: 0.68rem;
  color: var(--text-muted);
}

.char-count.is-limit {
  color: var(--accent-primary);
  font-weight: 700;
}

.turnstile-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 65px;
  background: rgba(0, 0, 0, 0.015);
  border-radius: 8px;
  border: 1px dashed var(--border-color);
  padding: 4px 8px;
}

.error-tip {
  font-size: 0.74rem;
  color: var(--accent-primary);
  margin-top: -4px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px 14px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface-subtle);
}

.shortcut-tip {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-cancel {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-main);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel:hover {
  background: var(--bg-surface-subtle);
}

.btn-submit {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--accent-primary);
  border-radius: 6px;
  background: var(--accent-primary);
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-submit:hover:not(:disabled) {
  background: var(--accent-primary-hover);
  transform: translateY(-1px);
}

.btn-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
