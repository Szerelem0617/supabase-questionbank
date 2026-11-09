<script setup>
const client = useSupabaseClient()
const user = useSupabaseUser()
const { profile, fetchProfile } = useUserProfile()
const { locale, toggleLocale, t } = useI18n()
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
  gap: 10px;
}

.help-info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-base);
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.18s ease;
  padding: 0;
  box-shadow: 0 1px 2px rgba(44, 47, 50, 0.04);
}

.help-info-btn:hover {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary-border);
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
  gap: 5px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 4px 10px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--text-muted);
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
  user-select: none;
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
  gap: 10px;
}

.user-info-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  padding: 4px 10px 4px 6px;
  border-radius: 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}

.user-info-link:hover {
  background: var(--bg-surface-subtle);
  border-color: var(--border-focus);
}

.nav-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-weight: 600;
  font-size: 0.84rem;
  color: var(--text-main);
}

.btn-signout {
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-muted);
  padding: 6px 14px;
  font-size: 0.84rem;
  font-weight: 600;
  border-radius: var(--radius-base);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}

.btn-signout:hover {
  background: var(--bg-surface-subtle);
  color: var(--text-main);
  border-color: var(--border-focus);
}

.btn-signin {
  display: inline-block;
  padding: 6px 18px;
  font-size: 0.86rem;
  font-weight: 700;
  border-radius: var(--radius-base);
  background: var(--accent-primary);
  color: #ffffff !important;
  text-decoration: none;
  transition: all 0.15s ease;
  box-shadow: var(--shadow-sm);
}

.btn-signin:hover {
  background: var(--accent-primary-hover);
  color: #ffffff !important;
}

.main-content {
  flex: 1;
}
</style>
