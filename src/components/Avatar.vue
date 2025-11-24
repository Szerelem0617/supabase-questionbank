<script setup>
import { store } from '../store'

// This function will be called when the user selects a file.
async function handleUpload(event) {
  const file = event.target.files[0]
  if (file) {
    const MAX_SIZE_MB = 2;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024; // 2MB

    if (file.size > MAX_SIZE_BYTES) {
      alert(`File size must not exceed ${MAX_SIZE_MB}MB.`);
      event.target.value = ''; // Clear the input so the user can select another file
      return;
    }
    await store.uploadAvatar(file);
  }
}
</script>

<template>
  <div class="avatar-container">
    <div class="avatar-display">
      <!-- Display avatar from the store, or a placeholder if it doesn't exist -->
      <img v-if="store.profile && store.profile.avatar_url" :src="store.profile.avatar_url" alt="Avatar" class="avatar-image" />
      <div v-else class="avatar-placeholder">No photo</div>
    </div>
    <div class="upload-controls">
      <!-- This label acts as a button to trigger the hidden file input -->
      <label for="file-upload" class="button" :class="{ 'disabled': store.loading }">
        {{ store.loading ? 'Uploading...' : 'Upload Avatar' }}
      </label>
      <!-- The actual file input is hidden -->
      <input 
        id="file-upload" 
        type="file" 
        @change="handleUpload" 
        :disabled="store.loading"
        accept="image/*"
        style="display: none;"
      />
    </div>
  </div>
</template>

<style scoped>
.avatar-container {
  display: flex;
  align-items: center;
  gap: 15px; /* Added gap for spacing between avatar and button */
}
.avatar-display {
  margin-bottom: 0; /* Removed margin */
}
.avatar-image, .avatar-placeholder {
  width: 50px;  /* Made smaller for the top bar */
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
  padding: 8px 16px; /* Adjusted padding */
  border: none;
  border-radius: 8px;
  background-color: #3e635f;
  color: white;
  cursor: pointer;
  font-size: 14px; /* Adjusted font size */
  transition: background-color 0.2s;
}
.button.disabled {
  background-color: #999;
  cursor: not-allowed;
}
</style>
