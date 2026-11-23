<script setup>
import { ref, onMounted, watch } from 'vue'

const { t, locale } = useI18n()
const { profile, loading, fetchProfile, updateProfile, uploadAvatar } = useUserProfile()

const displayName = ref('')
const website = ref('')
const saveStatus = ref('')

onMounted(async () => {
    await fetchProfile()
    if (profile.value) {
        displayName.value = profile.value.display_name || ''
        website.value = profile.value.website || ''
    }
})

watch(profile, (newVal) => {
    if (newVal) {
        displayName.value = newVal.display_name || ''
        website.value = newVal.website || ''
    }
})

async function handleUpload(event) {
  const file = event.target.files[0]
  if (file) {
    const MAX_SIZE_MB = 2;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(locale.value === 'zh' ? `图片大小不能超过 ${MAX_SIZE_MB}MB。` : `File size must not exceed ${MAX_SIZE_MB}MB.`);
      event.target.value = ''; 
      return;
    }
    await uploadAvatar(file);
    saveStatus.value = locale.value === 'zh' ? '头像已上传！' : 'Avatar uploaded!'
    setTimeout(() => { saveStatus.value = '' }, 2500)
  }
}

async function handleUpdateProfile() {
  await updateProfile({ 
    displayName: displayName.value, 
    website: website.value 
  })
  saveStatus.value = locale.value === 'zh' ? '资料已保存！' : 'Profile updated!'
  setTimeout(() => {
    saveStatus.value = ''
  }, 2500)
}
</script>

<template>
  <div class="profile-management-container">
    <!-- 头像展示与上传区域 -->
    <div class="avatar-container">
      <div class="avatar-display">
        <img v-if="profile && profile.avatar_url" :src="profile.avatar_url" alt="Avatar" class="avatar-image" />
        <div v-else class="avatar-placeholder">{{ locale === 'zh' ? '暂无头像' : 'No photo' }}</div>
      </div>
      <div class="upload-controls">
        <label for="file-upload" class="button button-upload" :class="{ 'disabled': loading }">
          {{ loading ? t('profile.uploading') : t('profile.uploadAvatar') }}
        </label>
        <input 
          id="file-upload" 
          type="file" 
          @change="handleUpload" 
          :disabled="loading"
          accept="image/*"
          style="display: none;"
        />
        <span class="upload-tip">{{ locale === 'zh' ? '支持 JPG、PNG 等格式，小于 2MB' : 'JPG, PNG up to 2MB' }}</span>
      </div>
    </div>

    <!-- 资料表单直接展示，无需点击切换 -->
    <div class="profile-form">
      <h3>{{ locale === 'zh' ? '个人信息' : 'Personal Information' }}</h3>
      <div class="form-group">
        <label>{{ t('profile.displayName') }}</label>
        <input 
          type="text" 
          v-model="displayName" 
          :placeholder="locale === 'zh' ? '输入你的昵称' : 'Enter your display name'"
        />
      </div>
      <div class="form-group">
        <label>{{ locale === 'zh' ? '个人主页 / 简介链接' : 'Website / Profile URL' }}</label>
        <input 
          type="url" 
          v-model="website" 
          :placeholder="locale === 'zh' ? 'https://...' : 'https://...'"
        />
      </div>
      <div class="form-actions">
        <button @click="handleUpdateProfile" class="button button-save" :disabled="loading">
          {{ loading ? t('profile.updating') : (locale === 'zh' ? '保存修改' : 'Save Changes') }}
        </button>
        <span v-if="saveStatus" class="save-status-badge">✅ {{ saveStatus }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-management-container {
  padding: 24px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  background-color: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.avatar-container {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-subtle);
}

.avatar-display {
  margin-bottom: 0;
  flex-shrink: 0;
}

.avatar-image, .avatar-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border-subtle);
  box-shadow: 0 2px 8px rgba(44, 47, 50, 0.08);
}

.avatar-placeholder {
  background-color: var(--bg-surface-subtle);
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.upload-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.upload-tip {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.button {
  padding: 8px 18px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-base);
  background-color: var(--bg-surface);
  color: var(--text-main);
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 600;
  transition: all 0.15s ease;
  white-space: nowrap;
  box-shadow: var(--shadow-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.button:hover:not(.disabled) {
  background-color: var(--bg-surface-subtle);
  border-color: var(--border-focus);
  color: var(--accent-primary);
}

.button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-save {
  background-color: var(--accent-primary);
  color: #ffffff;
  border-color: var(--accent-primary);
  padding: 9px 24px;
}

.button-save:hover:not(.disabled) {
  background-color: var(--accent-primary-hover, #a8360a);
  border-color: var(--accent-primary-hover, #a8360a);
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(194, 65, 40, 0.2);
}

.profile-form {
  margin-top: 20px;
}

.profile-form h3 {
  margin: 0 0 16px 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-main);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-base);
  border: 1px solid var(--border-subtle);
  background: var(--bg-input);
  color: var(--text-main);
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.form-group input:focus {
  border-color: var(--accent-primary);
  background: var(--bg-surface);
  box-shadow: 0 0 0 3px rgba(194, 65, 40, 0.1);
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 22px;
}

.save-status-badge {
  font-size: 0.82rem;
  font-weight: 600;
  color: #16a34a;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
