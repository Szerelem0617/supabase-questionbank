<script setup>
import { ref, onMounted, watch } from 'vue'
import { store } from '../store'

const editing = ref(false)
const displayName = ref('')
const website = ref('')

// This function will be called when the user selects a file.
async function handleUpload(event) {
  const file = event.target.files[0]
  if (file) {
    const MAX_SIZE_MB = 2;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024; // 2MB

    if (file.size > MAX_SIZE_BYTES) {
      alert(`File size must not exceed ${MAX_SIZE_MB}MB.`);
      event.target.value = ''; // Clear the input
      return;
    }
    await store.uploadAvatar(file);
  }
}

async function handleUpdateProfile() {
  await store.updateProfile({ 
    displayName: displayName.value, 
    website: website.value 
  })
  editing.value = false // Hide form after update
}

// Watch for changes in the store's profile and update local refs
watch(() => store.profile, (newProfile) => {
  if (newProfile) {
    displayName.value = newProfile.display_name || ''
    website.value = newProfile.website || ''
  }
}, { immediate: true });

onMounted(() => {
    // Ensure profile is loaded, then set local state
    if (store.profile) {
        displayName.value = store.profile.display_name || ''
        website.value = store.profile.website || ''
    }
})

</script>

<template>
  <div class="profile-management-container">
    <!-- Main avatar display -->
    <div class="avatar-container">
      <div class="avatar-display">
        <img v-if="store.profile && store.profile.avatar_url" :src="store.profile.avatar_url" alt="Avatar" class="avatar-image" />
        <div v-else class="avatar-placeholder">No photo</div>
      </div>
      <div class="upload-controls">
        <label for="file-upload" class="button" :class="{ 'disabled': store.loading }">
          {{ store.loading ? 'Uploading...' : 'Upload Avatar' }}
        </label>
        <input 
          id="file-upload" 
          type="file" 
          @change="handleUpload" 
          :disabled="store.loading"
          accept="image/*"
          style="display: none;"
        />
      </div>
       <button @click="editing = !editing" class="button">
        {{ editing ? 'Cancel' : 'Edit Profile' }}
      </button>
    </div>

    <!-- Profile editing form -->
    <div v-if="editing" class="profile-form">
      <h3>Edit Your Profile</h3>
      <div class="form-group">
        <label for="displayName">Display Name</label>
        <input id="displayName" type="text" v-model="displayName" />
      </div>
      <div class="form-group">
        <label for="website">Website</label>
        <input id="website" type="url" v-model="website" />
      </div>
      <button @click="handleUpdateProfile" class="button" :disabled="store.loading">
        {{ store.loading ? 'Saving...' : 'Update Profile' }}
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

/* Form styles */
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
