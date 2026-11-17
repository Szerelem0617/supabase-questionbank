<script setup>
const client = useSupabaseClient()
const user = useSupabaseUser()
const { profile, fetchProfile } = useUserProfile()
const { locale, toggleLocale, t } = useI18n()
const danmakuStore = useDanmaku()
const isHelpModalOpen = ref(false)

// Fetch profile whenever user is logged in
watch(user, async (newUser) => {
  if (newUser) {
    await fetchProfile()
  } else {
    profile.value = null
  }
}, { immediate: true })

async function signOut() {
  await client.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <div class="app-layout">
    <!-- Top Navigation Bar -->
    <header class="top-bar">
      <div class="nav-container">
        <div class="nav-brand-group">
          <!-- 常驻左上角收藏夹图标按钮（点击直接管理/进入收藏夹） -->
          <FavoritesDropdown />

          <NuxtLink to="/" class="brand-link" :title="locale === 'zh' ? '返回首页' : 'Home'">
            <span class="brand-text">{{ t('nav.brand') }}</span>
          </NuxtLink>
        </div>
        
        <div class="nav-actions">
          <!-- 弹幕全站开关按钮 (高度 34px, 圆角 8px) -->
          <button 
            type="button" 
            class="danmaku-switch-btn" 
            :class="{ 'is-off': !danmakuStore.danmakuEnabled.value }"
            @click="danmakuStore.toggleDanmaku"
            :title="danmakuStore.danmakuEnabled.value 
              ? (locale === 'zh' ? '全站弹幕: 已开启 (点击关闭)' : 'Danmaku: ON (Click to turn off)') 
              : (locale === 'zh' ? '全站弹幕: 已关闭 (点击开启)' : 'Danmaku: OFF (Click to turn on)')"
          >
            <svg v-if="danmakuStore.danmakuEnabled.value" class="danmaku-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <path d="M8 10h.01M12 10h.01M16 10h.01" />
            </svg>
            <svg v-else class="danmaku-nav-icon is-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
            <span class="danmaku-nav-text">{{ locale === 'zh' ? '弹幕' : 'Danmaku' }}</span>
            <span class="danmaku-nav-pill" :class="{ 'pill-on': danmakuStore.danmakuEnabled.value }">
              {{ danmakuStore.danmakuEnabled.value ? (locale === 'zh' ? '开' : 'ON') : (locale === 'zh' ? '关' : 'OFF') }}
            </span>
          </button>

          <!-- 帮助与功能提示按钮 (i) -->
          <button 
            type="button" 
            class="help-info-btn" 
            @click="isHelpModalOpen = true"
            :title="locale === 'zh' ? '使用指南与快捷键' : 'User Guide & Shortcuts'"
          >
            <span class="info-letter">i</span>
          </button>

          <!-- Top Right Bilingual Switcher -->
          <button 
            type="button" 
            class="lang-switch-btn" 
            @click="toggleLocale"
            :title="locale === 'zh' ? 'Switch to English' : '切换为中文'"
          >
            <span class="lang-globe">🌐</span>
            <span class="lang-mode" :class="{ active: locale === 'zh' }">中</span>
            <span class="lang-divider">/</span>
            <span class="lang-mode" :class="{ active: locale === 'en' }">EN</span>
          </button>

          <!-- Auth Status -->
          <div class="auth-widget">
            <template v-if="user">
              <NuxtLink to="/profile" class="user-info-link" :title="t('nav.profile')">
                <img :src="profile?.avatar_url || 'https://via.placeholder.com/32'" class="nav-avatar" alt="Avatar" />
                <span class="user-name">{{ profile?.display_name || user.email?.split('@')[0] || 'User' }}</span>
              </NuxtLink>

              <button @click="signOut" class="btn-signout">{{ t('nav.signOut') }}</button>
            </template>
            <template v-else>
              <NuxtLink to="/login" class="btn-signin">{{ t('nav.signIn') }}</NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content Injection -->
    <main class="main-content">
      <slot />
    </main>

    <!-- Top-Level Smooth Scrolling Paper Texture Overlay -->
    <div id="paper-texture-overlay" aria-hidden="true"></div>

    <!-- User Guide & Shortcuts Info Modal -->
    <HelpModal :isOpen="isHelpModalOpen" @close="isHelpModalOpen = false" />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  color: var(--text-main);
  position: relative;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg-glass);
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 10px rgba(44, 47, 50, 0.04), 0 1px 2px rgba(44, 47, 50, 0.02);
}

.nav-container {
  width: 100%;
  max-width: 100%;
  padding: 11px 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .nav-container {
    padding: 10px 16px;
  }
}

.nav-brand-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.brand-link:hover {
  opacity: 0.85;
}

.brand-text {
  font-family: var(--font-serif);
  font-size: 1.28rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-main);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.danmaku-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.16s ease;
  box-shadow: 0 1px 2px rgba(44, 47, 50, 0.03);
  box-sizing: border-box;
  user-select: none;
}

.danmaku-switch-btn:hover {
  background: var(--bg-surface-subtle);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.danmaku-switch-btn.is-off {
  opacity: 0.65;
  background: var(--bg-surface-subtle);
  color: var(--text-muted);
}

.danmaku-nav-icon {
  width: 15px;
  height: 15px;
  color: var(--accent-primary);
  flex-shrink: 0;
  display: block;
}

.danmaku-nav-icon.is-muted {
  color: var(--text-muted);
}

.danmaku-nav-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main);
}

.danmaku-switch-btn.is-off .danmaku-nav-text {
  color: var(--text-muted);
}

.danmaku-nav-pill {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(44, 47, 50, 0.08);
  color: var(--text-muted);
  line-height: 1.2;
}

.danmaku-nav-pill.pill-on {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.help-info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.16s ease;
  padding: 0;
  box-shadow: 0 1px 2px rgba(44, 47, 50, 0.03);
  box-sizing: border-box;
}

.help-info-btn:hover {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  transform: translateY(-1px);
}

.info-letter {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1;
}

.lang-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 0 11px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--text-muted);
  box-shadow: 0 1px 2px rgba(44, 47, 50, 0.03);
  transition: all 0.16s ease;
  user-select: none;
  box-sizing: border-box;
}

.lang-switch-btn:hover {
  border-color: var(--accent-primary);
  color: var(--text-main);
  background: var(--bg-surface-subtle);
  transform: translateY(-1px);
}

.lang-globe {
  font-size: 0.85rem;
  line-height: 1;
}

.lang-mode {
  font-weight: 500;
  color: var(--text-muted);
  transition: color 0.15s ease;
}

.lang-mode.active {
  font-weight: 700;
  color: var(--accent-primary);
}

.lang-divider {
  opacity: 0.35;
  font-size: 0.75rem;
}

.auth-widget {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px 0 5px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: 0 1px 2px rgba(44, 47, 50, 0.03);
  transition: all 0.16s ease;
  text-decoration: none;
  box-sizing: border-box;
}

.user-info-link:hover {
  background: var(--bg-surface-subtle);
  border-color: var(--accent-primary);
}

.nav-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-weight: 600;
  font-size: 0.82rem;
  color: var(--text-main);
}

.btn-signout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-muted);
  padding: 0 12px;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(44, 47, 50, 0.03);
  transition: all 0.16s ease;
  box-sizing: border-box;
}

.btn-signout:hover {
  background: var(--bg-surface-subtle);
  color: var(--text-main);
  border-color: var(--text-muted);
}

.btn-signin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 16px;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 8px;
  background: var(--accent-primary);
  border: 1px solid var(--accent-primary);
  color: #ffffff !important;
  text-decoration: none;
  transition: all 0.16s ease;
  box-shadow: 0 1px 3px rgba(194, 65, 40, 0.15);
  box-sizing: border-box;
}

.btn-signin:hover {
  background: var(--accent-primary-hover);
  border-color: var(--accent-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(194, 65, 40, 0.22);
  color: #ffffff !important;
}

.main-content {
  flex: 1;
}
</style>
