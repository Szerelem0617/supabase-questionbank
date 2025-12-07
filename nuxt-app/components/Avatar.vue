<script setup>
import { ref, onMounted, watch } from 'vue'

// Import from Composable instead of Store
const { profile, loading, fetchProfile, updateProfile, uploadAvatar } = useUserProfile()

const editing = ref(false)
const displayName = ref('')
const website = ref('')

onMounted(async () => {
    // Fetch profile on mount to ensure we have latest data
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
      alert(`File size must not exceed ${MAX_SIZE_MB}MB.`);
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
        <div v-else class="avatar-placeholder">No photo</div>
      </div>
      <div class="upload-controls">
        <label for="file-upload" class="button" :class="{ 'disabled': loading }">
          {{ loading ? 'Uploading...' : 'Upload Avatar' }}
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
       <button @click="editing = !editing" class="button">
        {{ editing ? 'Cancel' : 'Edit Profile' }}
      </button>
    </div>

    <div v-if="editing" class="profile-form">
      <h3>Edit Your Profile</h3>
      <div class="form-group">
        <label>Display Name</label>
        <input type="text" v-model="displayName" />
      </div>
      <div class="form-group">
        <label>Website</label>
        <input type="url" v-model="website" />
      </div>
      <button @click="handleUpdateProfile" class="button" :disabled="loading">
        {{ loading ? 'Saving...' : 'Update Profile' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.profile-management-container {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background-color: #f9f9f9;
}
.avatar-container {
  display: flex;
  align-items: center;
  gap: 15px;
}
.avatar-display {
  margin-bottom: 0;
}
.avatar-image, .avatar-placeholder {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #eee;
}
.avatar-placeholder {
  background-color: #f0f2f5;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #999;
  font-size: 0.7rem;
}
.button {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background-color: #3e635f;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
  white-space: nowrap;
}
.button.disabled {
  background-color: #999;
  cursor: not-allowed;
}
.profile-form {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}
.form-group {
    margin-bottom: 15px;
}
.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}
.form-group input {
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
}
</style>
