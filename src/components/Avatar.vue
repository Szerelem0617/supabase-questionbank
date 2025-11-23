<script setup>
import { ref } from 'vue'

const avatarUrl = ref(null) // We'll store the avatar URL here

function handleUpload() {
  alert('Upload functionality is not built yet')
}
</script>

<template>
  <div class="avatar-container">
    <div class="avatar-display">
      <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="avatar-image" />
      <div v-else class="avatar-placeholder">No photo</div>
    </div>
    <div class="upload-controls">
      <button @click="handleUpload" class="button">
        Upload Avatar
      </button>
    </div>
  </div>
</template>

<style scoped>
.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
}
.avatar-display {
  margin-bottom: 1rem;
}
.avatar-image {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #eee;
}
.avatar-placeholder {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background-color: #f0f2f5;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #999;
  border: 3px solid #eee;
}
.button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background-color: #3e635f;
  color: white;
  cursor: pointer;
  font-size: 1rem;
}
</style>
