<script setup>
import { ref, onMounted, watch } from 'vue'

const { t, locale } = useI18n()
const { profile, loading, fetchProfile, updateProfile, uploadAvatar } = useUserProfile()

const editing = ref(false)
const displayName = ref('')
const website = ref('')

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
  }
}

async function handleUpdateProfile() {
  await updateProfile({ 
    displayName: displayName.value, 
    website: website.value 
  })
  editing.value = false 
}
</script>

<template>
  <div class="profile-management-container">
    <div class="avatar-container">
      <div class="avatar-display">
        <img v-if="profile && profile.avatar_url" :src="profile.avatar_url" alt="Avatar" class="avatar-image" />
        <div v-else class="avatar-placeholder">{{ locale === 'zh' ? '暂无头像' : 'No photo' }}</div>
      </div>
      <div class="upload-controls">
        <label for="file-upload" class="button" :class="{ 'disabled': loading }">
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
      </div>
       <button @click="editing = !editing" class="button button-edit-profile">
        {{ editing ? (locale === 'zh' ? '取消' : 'Cancel') : (locale === 'zh' ? '修改资料' : 'Edit Profile') }}
      </button>
    </div>

    <div v-if="editing" class="profile-form">
      <h3>{{ locale === 'zh' ? '编辑个人信息' : 'Edit Your Profile' }}</h3>
      <div class="form-group">
        <label>{{ t('profile.displayName') }}</label>
        <input type="text" v-model="displayName" />
      </div>
      <div class="form-group">
        <label>{{ locale === 'zh' ? '个人主页' : 'Website' }}</label>
        <input type="url" v-model="website" />
      </div>
      <button @click="handleUpdateProfile" class="button" :disabled="loading">
        {{ loading ? t('profile.updating') : t('profile.update') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.profile-management-container {
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  background-color: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}
.avatar-container {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.avatar-display {
  margin-bottom: 0;
}
.avatar-image, .avatar-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border-subtle);
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
.profile-form {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid var(--border-subtle);
}
.profile-form h3 {
  margin: 0 0 14px 0;
  font-size: 1.05rem;
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
  padding: 8px 12px;
  border-radius: var(--radius-base);
  border: 1px solid var(--border-subtle);
  background: var(--bg-input);
  color: var(--text-main);
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
}
.form-group input:focus {
  border-color: var(--border-focus);
  background: var(--bg-surface);
}
</style>
