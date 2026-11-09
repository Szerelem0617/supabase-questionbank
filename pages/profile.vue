<script setup>
const { t } = useI18n()

useSeoMeta({
  title: 'My Profile - Physics Archive',
  description: 'Manage your profile and account settings.'
})
</script>

<template>
  <div class="profile-page-container">
    <div class="profile-header">
      <h1 class="page-title">{{ t('profile.myProfile') }}</h1>
      <p class="page-subtitle">{{ t('profile.subtitle') }}</p>
    </div>

    <div class="profile-wrapper">
      <Avatar />
    </div>
    
    <div class="back-home">
      <NuxtLink to="/" class="back-link">&larr; {{ t('nav.backHome') }}</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.profile-page-container {
  max-width: 600px;
  margin: 40px auto 60px;
  padding: 0 20px;
}

.profile-header {
  margin-bottom: 24px;
  text-align: left;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0 0 6px 0;
  letter-spacing: -0.02em;
}

.page-subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0;
}

.profile-wrapper {
  margin-top: 20px;
}

.back-home {
  margin-top: 36px;
}

.back-link {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.88rem;
  transition: color 0.15s ease;
}

.back-link:hover {
  color: var(--accent-primary);
}
</style>
