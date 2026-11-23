<script setup>
import HomeCommentModal from '~/components/home/HomeCommentModal.vue'

const client = useSupabaseClient()
const user = useSupabaseUser()
const { profile, fetchProfile } = useUserProfile()
const { locale, toggleLocale, t } = useI18n()
const danmakuStore = useDanmaku()
const isHelpModalOpen = ref(false)

function onGlobalMessagePosted(msg) {
  danmakuStore.broadcastGlobalComment(msg)
}

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

          <!-- 当前学科展示与全学科切换菜单（含返回首页全科总览选项） -->
          <TopBarSubjectSwitcher />
        </div>
        
        <div class="nav-actions">
          <!-- 帮助与功能提示按钮 (i) - 移至弹幕左侧 -->
          <button 
            type="button" 
            class="help-info-btn" 
            @click="isHelpModalOpen = true"
            :title="locale === 'zh' ? '使用指南与快捷键' : 'User Guide & Shortcuts'"
          >
            <span class="info-letter">i</span>
          </button>

          <!-- 弹幕与留言双功能分段按钮 (左侧: 发弹幕独立动作 / 右侧: 弹幕飘字显示独立微型滑动开关) -->
          <div 
            class="comment-split-control" 
            :class="{ 'is-off': !danmakuStore.danmakuEnabled.value }"
          >
            <!-- 功能 1：留下弹幕留言评论 (明确动作：发弹幕 / Post) -->
            <button
              type="button"
              class="csc-btn csc-post-btn"
              @click="danmakuStore.openCommentModal"
              :title="locale === 'zh' ? '点击发表弹幕评论或留言' : 'Post a comment or note'"
            >
              <span class="csc-icon">💬</span>
              <span class="csc-text">{{ locale === 'zh' ? '发弹幕' : 'Post' }}</span>
            </button>

            <!-- 鲜明分界线 -->
            <div class="csc-divider" aria-hidden="true"></div>

            <!-- 功能 2：开 / 关 全局弹幕屏幕飘字显示 (直观微型滑动开关) -->
            <button
              type="button"
              class="csc-btn csc-toggle-btn"
              @click="danmakuStore.toggleDanmaku"
              :class="{ 'is-active': danmakuStore.danmakuEnabled.value }"
              :title="danmakuStore.danmakuEnabled.value 
                ? (locale === 'zh' ? '弹幕飘字显示：已开启 (点击关闭)' : 'Barrage: ON (Click to turn off)') 
                : (locale === 'zh' ? '弹幕飘字显示：已关闭 (点击开启)' : 'Barrage: OFF (Click to turn on)')"
            >
              <span class="csc-switch-label">{{ locale === 'zh' ? '显示' : 'Show' }}</span>
              <span class="csc-switch-track" :class="{ 'track-on': danmakuStore.danmakuEnabled.value }">
                <span class="csc-switch-thumb"></span>
              </span>
            </button>
          </div>

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

          <!-- Auth Status: 登录状态双功能一体聚合胶囊 [ 头像+昵称 | 退出登录 ] -->
          <div class="auth-widget">
            <template v-if="user">
              <div class="user-split-control">
                <!-- 左半段：进入个人主页与资料修改 -->
                <NuxtLink to="/profile" class="usc-profile-link" :title="t('nav.profile')">
                  <img :src="profile?.avatar_url || 'https://via.placeholder.com/32'" class="nav-avatar" alt="Avatar" />
                  <span class="user-name">{{ profile?.display_name || user.email?.split('@')[0] || 'User' }}</span>
                </NuxtLink>

                <!-- 鲜明分界线 -->
                <div class="usc-divider" aria-hidden="true"></div>

                <!-- 右半段：退出登录 -->
                <button type="button" @click="signOut" class="usc-signout-btn" :title="t('nav.signOut')">
                  {{ t('nav.signOut') }}
                </button>
              </div>
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

    <!-- Universal Comment / Danmaku Modal accessible from Topbar -->
    <HomeCommentModal 
      :isOpen="danmakuStore.isCommentModalOpen.value" 
      @close="danmakuStore.closeCommentModal" 
      @message-posted="onGlobalMessagePosted" 
    />
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 56px;
  z-index: 1000;
  background: var(--bg-glass);
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 10px rgba(44, 47, 50, 0.04), 0 1px 2px rgba(44, 47, 50, 0.02);
}

.nav-container {
  width: 100%;
  max-width: 100%;
  height: 56px;
  padding: 0 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .nav-container {
    padding: 0 16px;
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

.nav-brand-slash {
  color: var(--border-color);
  font-size: 0.95rem;
  font-weight: 400;
  user-select: none;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-split-control {
  display: inline-flex;
  align-items: center;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  box-shadow: 0 1px 2px rgba(44, 47, 50, 0.04);
  box-sizing: border-box;
  overflow: hidden;
  transition: all 0.16s ease;
  user-select: none;
}

.comment-split-control:hover {
  border-color: rgba(194, 65, 40, 0.35);
  box-shadow: 0 2px 6px rgba(194, 65, 40, 0.08);
}

.comment-split-control.is-off {
  background: var(--bg-surface-subtle);
  border-color: var(--border-color);
}

.csc-btn {
  background: transparent;
  border: none;
  height: 100%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 0;
  margin: 0;
  transition: background 0.15s ease, color 0.15s ease;
  box-sizing: border-box;
}

/* 功能 1：发弹幕动作区 */
.csc-post-btn {
  gap: 5px;
  padding: 0 10px 0 10px;
  color: var(--text-main);
}

.csc-post-btn:hover {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.csc-icon {
  font-size: 0.88rem;
  line-height: 1;
}

.csc-text {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

/* 鲜明分界线 */
.csc-divider {
  width: 1px;
  height: 18px;
  background: var(--border-color);
  flex-shrink: 0;
  opacity: 0.8;
}

/* 功能 2：弹幕显示微型开关区 */
.csc-toggle-btn {
  padding: 0 9px 0 8px;
  gap: 6px;
  color: var(--text-muted);
}

.csc-toggle-btn:hover {
  background: rgba(44, 47, 50, 0.05);
}

.csc-switch-label {
  font-size: 0.74rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text-muted);
  white-space: nowrap;
}

.csc-toggle-btn.is-active .csc-switch-label {
  color: var(--text-main);
  font-weight: 600;
}

/* 微型开关轨道 */
.csc-switch-track {
  width: 24px;
  height: 14px;
  border-radius: 999px;
  background: #cbd5e1;
  position: relative;
  transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-block;
  flex-shrink: 0;
}

.csc-switch-track.track-on {
  background: var(--accent-primary);
}

/* 微型开关滑块 */
.csc-switch-thumb {
  position: absolute;
  top: 1.5px;
  left: 2px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.csc-switch-track.track-on .csc-switch-thumb {
  transform: translateX(9px);
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

.user-split-control {
  display: inline-flex;
  align-items: center;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  box-shadow: 0 1px 2px rgba(44, 47, 50, 0.04);
  box-sizing: border-box;
  overflow: hidden;
  transition: all 0.16s ease;
  user-select: none;
}

.user-split-control:hover {
  border-color: rgba(194, 65, 40, 0.35);
  box-shadow: 0 2px 6px rgba(194, 65, 40, 0.08);
}

.usc-profile-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 100%;
  padding: 0 10px 0 6px;
  text-decoration: none;
  background: transparent;
  transition: background 0.15s ease;
}

.usc-profile-link:hover {
  background: var(--bg-surface-subtle);
}

.nav-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.user-name {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text-main);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.usc-divider {
  width: 1px;
  height: 18px;
  background: var(--border-color);
  flex-shrink: 0;
  opacity: 0.8;
}

.usc-signout-btn {
  background: transparent;
  border: none;
  height: 100%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  transition: background 0.15s ease, color 0.15s ease;
  box-sizing: border-box;
  white-space: nowrap;
}

.usc-signout-btn:hover {
  background: rgba(194, 65, 40, 0.08);
  color: var(--accent-primary);
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
  padding-top: 56px;
}
</style>
