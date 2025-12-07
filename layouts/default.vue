<script setup>
import '@/assets/css/main.css'

const client = useSupabaseClient()
const user = useSupabaseUser()
const { profile, fetchProfile } = useUserProfile()

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
      <div class="brand">
        <NuxtLink to="/">📚 P3 Supabase</NuxtLink>
      </div>
      
      <div class="auth-widget">
        <template v-if="user">
           <NuxtLink to="/profile" class="user-info-link">
                <div class="user-info">
                    <img :src="profile?.avatar_url || 'https://via.placeholder.com/32'" class="nav-avatar" />
                    <span class="user-name">{{ profile?.display_name || user.email?.split('@')[0] || 'User' }}</span>
                </div>
           </NuxtLink>

            <button @click="signOut" class="auth-button">Sign Out</button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="auth-button">Login / Register</NuxtLink>
        </template>
      </div>
    </header>

    <!-- Main Content Injection -->
    <main>
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand a {
  font-size: 1.2rem;
  font-weight: bold;
  color: #3e635f;
  text-decoration: none;
}

.auth-widget {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 8px;
}
.nav-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid #ddd;
}
.user-name {
    font-weight: 500;
    font-size: 0.9rem;
    color: #333;
}
.user-email {
  font-size: 0.9rem;
  color: #666;
}

.auth-button {
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: white;
  background-color: #3e635f;
  text-decoration: none;
}
.auth-button:hover {
  background-color: #324f4c;
}

.user-info-link {
    text-decoration: none;
    color: inherit;
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background-color 0.2s;
}
.user-info-link:hover {
    background-color: #f5f5f5;
}
</style>