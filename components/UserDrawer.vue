<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import Avatar from '~/components/Avatar.vue'
import Auth from '~/components/Auth.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'sign-out'])

const { t, locale } = useI18n()
const user = useSupabaseUser()
const { profile } = useUserProfile()

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
  }
})

function handleAuthSuccess() {
  emit('close')
}

function handleSignOut() {
  emit('sign-out')
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <transition name="drawer-fade">
      <div v-if="isOpen" class="drawer-backdrop" @click.self="emit('close')">
        <div class="drawer-panel" role="dialog" aria-modal="true">
          <!-- Drawer Header -->
          <div class="drawer-header">
            <div class="dh-title-wrap">
              <span class="dh-icon">{{ user ? '👤' : '🔐' }}</span>
              <div>
                <h3 class="dh-title">
                  {{ user 
                    ? (locale === 'zh' ? '个人资料管理' : 'Manage Profile') 
                    : (locale === 'zh' ? '用户登录 · 注册' : 'Sign In · Sign Up') }}
                </h3>
                <p class="dh-subtitle">
                  {{ user 
                    ? (locale === 'zh' ? '查看与更新你的个人头像及昵称' : 'Update your avatar and display name') 
                    : (locale === 'zh' ? '登录后可跨端同步收藏夹与做题讨论' : 'Sync favorites and participate in discussions') }}
                </p>
              </div>
            </div>
            <button class="btn-drawer-close" @click="emit('close')" :title="locale === 'zh' ? '关闭' : 'Close'">
              &times;
            </button>
          </div>

          <!-- Drawer Content -->
          <div class="drawer-body">
            <!-- 场景 1：已登录用户，展示头像与昵称修改 -->
            <div v-if="user" class="logged-in-section">
              <Avatar />

              <!-- 当前账号简明卡片 -->
              <div class="account-meta-card">
                <div class="meta-row">
                  <span class="meta-label">{{ locale === 'zh' ? '绑定邮箱' : 'Email' }}</span>
                  <span class="meta-val">{{ user.email }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">{{ locale === 'zh' ? '账号 ID' : 'User ID' }}</span>
                  <code class="meta-code">{{ user.id?.slice(0, 8) }}...</code>
                </div>
              </div>

              <!-- 退出登录按钮 -->
              <div class="drawer-actions">
                <button type="button" class="btn-drawer-signout" @click="handleSignOut">
                  {{ t('nav.signOut') }}
                </button>
              </div>
            </div>

            <!-- 场景 2：未登录，就地展示轻量登录/注册表单，无须跳转页面 -->
            <div v-else class="auth-section">
              <Auth :compact="true" @success="handleAuthSuccess" />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(44, 47, 50, 0.42);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 2500;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 390px;
  max-width: 92vw;
  height: 100%;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-color);
  box-shadow: -8px 0 32px rgba(44, 47, 50, 0.16);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  animation: slideInRight 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface-subtle);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-shrink: 0;
}

.dh-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.dh-icon {
  font-size: 1.3rem;
  line-height: 1.2;
}

.dh-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.dh-subtitle {
  margin: 3px 0 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.btn-drawer-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s ease;
  margin-left: 8px;
}

.btn-drawer-close:hover {
  color: var(--accent-primary);
  background: var(--bg-surface);
}

.drawer-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  box-sizing: border-box;
}

/* 已登录状态样式 */
.logged-in-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.account-meta-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.meta-label {
  color: var(--text-muted);
}

.meta-val {
  font-weight: 600;
  color: var(--text-main);
  word-break: break-all;
}

.meta-code {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-surface);
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid var(--border-subtle);
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  margin-top: 8px;
}

.btn-drawer-signout {
  width: 100%;
  padding: 9px 16px;
  border-radius: var(--radius-base);
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
}

.btn-drawer-signout:hover {
  background: rgba(194, 65, 40, 0.08);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* 动效 */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.22s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-fade-enter-active .drawer-panel,
.drawer-fade-leave-active .drawer-panel {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-fade-enter-from .drawer-panel,
.drawer-fade-leave-to .drawer-panel {
  transform: translateX(100%);
}
</style>
