<script setup>
// 简单的页面，只包含 Avatar 组件用于编辑资料
// 如果用户没登录，Supabase 模块通常会自动处理或我们可以加中间件
</script>

<template>
  <div class="container">
    <h1>My Profile</h1>
    <div class="profile-wrapper">
        <Avatar />
    </div>
    
    <div class="back-home">
         <NuxtLink to="/">&larr; Back to Home</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.container {
    max-width: 600px;
    margin: 40px auto;
    text-align: center;
}
.profile-wrapper {
    margin-top: 30px;
    text-align: left;
}
.back-home {
    margin-top: 40px;
}
</style>
