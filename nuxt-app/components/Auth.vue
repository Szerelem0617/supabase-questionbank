<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router' // Nuxt 3 推荐使用 useRouter
const client = useSupabaseClient() // 使用 Nuxt 提供的 Supabase 客户端

const loading = ref(false)
const email = ref('')
const password = ref('')
const router = useRouter()

const handleLogin = async () => {
  try {
    loading.value = true
    const { error } = await client.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (error) throw error
    alert('Check your email for the login link!')
    router.push('/') // 登录成功后跳转到首页
  } catch (error) {
    if (error instanceof Error) {
      alert(error.message)
    }
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  try {
    loading.value = true
    const { error } = await client.auth.signUp({
      email: email.value,
      password: password.value,
    })
    if (error) throw error
    alert('Registration successful! Check your email to confirm.')
    router.push('/') // 注册成功后跳转到首页
  } catch (error) {
    if (error instanceof Error) {
      alert(error.message)
    }
  } finally {
    loading.value = false
  }
}

const signInWithOAuth = async (provider) => {
  try {
    loading.value = true
    const { error } = await client.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/`, // 统一重定向到根路径
      },
    })
    if (error) throw error
  } catch (error) {
    if (error instanceof Error) {
      alert(error.message)
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1 class="header">Supabase + Nuxt 3</h1>
      <p class="description">Sign in or register below</p>
      <div>
        <input class="inputField" type="email" placeholder="Your email" v-model="email" />
      </div>
      <div>
        <input class="inputField" type="password" placeholder="Your password" v-model="password" />
      </div>
      <div>
        <button @click="handleLogin" class="button" :disabled="loading">
          {{ loading ? 'Loading' : 'Login' }}
        </button>
      </div>
       <div>
        <button @click="handleRegister" class="button" :disabled="loading">
          {{ loading ? 'Loading' : 'Register' }}
        </button>
      </div>
      <div class="oauth-buttons">
        <button @click="signInWithOAuth('google')" class="button oauth-google" :disabled="loading">
          Sign in with Google
        </button>
        <button @click="signInWithOAuth('github')" class="button oauth-github" :disabled="loading">
          Sign in with GitHub
        </button>
      </div>
      <div class="back-link">
        <button @click="navigateTo('/')" class="button-link">Back to Home</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 样式与原文件保持一致 */
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
}
.auth-card {
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  width: 100%;
  max-width: 400px;
}
.header {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}
.description {
  margin-bottom: 1.5rem;
  color: #666;
}
.inputField {
  width: calc(100% - 20px);
  padding: 10px;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.button {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 4px;
  background-color: #3e635f;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  margin-bottom: 1rem;
}
.button:disabled {
  background-color: #999;
}
.oauth-buttons {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.oauth-google {
  background-color: #db4437; /* Google red */
}
.oauth-google:hover {
  background-color: #c23321;
}
.oauth-github {
  background-color: #333; /* GitHub dark gray */
}
.oauth-github:hover {
  background-color: #000;
}
.back-link {
  margin-top: 1.5rem;
}
.button-link {
  background: none;
  border: none;
  color: #3e635f;
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.9rem;
}
</style>