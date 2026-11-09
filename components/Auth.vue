<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const { t, locale } = useI18n()
const client = useSupabaseClient()

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
    router.push('/')
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
    alert(locale.value === 'zh' ? '注册成功！请查收验证邮件以完成确认。' : 'Registration successful! Check your email to confirm.')
    router.push('/')
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
        redirectTo: `${window.location.origin}/`,
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
      <h1 class="header">{{ t('auth.signInTitle') }}</h1>
      <p class="description">{{ locale === 'zh' ? '请登录以同步收藏夹与做题讨论' : 'Sign in to sync favorites & discussion' }}</p>
      <div>
        <input class="inputField" type="email" :placeholder="t('auth.emailPlaceholder')" v-model="email" />
      </div>
      <div>
        <input class="inputField" type="password" :placeholder="t('auth.passwordPlaceholder')" v-model="password" />
      </div>
      <div>
        <button @click="handleLogin" class="button" :disabled="loading">
          {{ loading ? (locale === 'zh' ? '请稍候...' : 'Loading...') : t('auth.signInBtn') }}
        </button>
      </div>
       <div>
        <button @click="handleRegister" class="button button-secondary-auth" :disabled="loading">
          {{ loading ? (locale === 'zh' ? '请稍候...' : 'Loading...') : t('auth.registerBtn') }}
        </button>
      </div>
      <div class="oauth-buttons">
        <button @click="signInWithOAuth('google')" class="button oauth-google" :disabled="loading">
          {{ t('auth.oauthGoogle') }}
        </button>
        <button @click="signInWithOAuth('github')" class="button oauth-github" :disabled="loading">
          {{ t('auth.oauthGithub') }}
        </button>
      </div>
      <div class="back-link">
        <button @click="navigateTo('/')" class="button-link">&larr; {{ t('nav.backHome') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
  padding: 24px;
  background-color: var(--bg-canvas);
}
.auth-card {
  padding: 2.2rem 2rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-md);
  text-align: center;
  width: 100%;
  max-width: 420px;
}
.header {
  font-size: 1.65rem;
  font-weight: 800;
  margin-bottom: 0.4rem;
  color: var(--text-main);
  letter-spacing: -0.02em;
}
.description {
  margin-bottom: 1.8rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}
.inputField {
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  background: var(--bg-input);
  color: var(--text-main);
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
  transition: all 0.15s ease;
}
.inputField:focus {
  background: var(--bg-surface);
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-primary-light);
}
.button {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-base);
  background-color: var(--accent-primary);
  color: #ffffff;
  cursor: pointer;
  font-size: 0.92rem;
  font-weight: 700;
  margin-bottom: 0.8rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}
.button:hover:not(:disabled) {
  background-color: var(--accent-primary-hover);
}
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.oauth-buttons {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--border-subtle);
}
.oauth-google {
  background-color: var(--bg-surface);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}
.oauth-google:hover:not(:disabled) {
  background-color: var(--bg-surface-subtle);
  border-color: var(--border-focus);
  color: var(--accent-primary);
}
.oauth-github {
  background-color: var(--bg-surface-subtle);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}
.oauth-github:hover:not(:disabled) {
  background-color: var(--border-subtle);
}
.back-link {
  margin-top: 1.6rem;
}
.button-link {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 600;
  transition: color 0.15s ease;
}
.button-link:hover {
  color: var(--accent-primary);
}
</style>