# Web 题库系统与 Cloudflare + Supabase 架构落地文档

本文档梳理了 `/Users/feng/Desktop/项目/web项目/web-projects/p3-supabase` 项目的整体架构、已落地的 Cloudflare R2 + Supabase 动静分离配置，以及前端重构与部署指南。

---

## 一、系统落地架构与配置详情

### 1. 服务组件与凭证信息
- **GitHub 远程仓库**：`https://github.com/Szerelem0617/supabase-questionbank`
- **Cloudflare R2 存储桶**：`physics-exam-assets`
  - **Account ID**：`1270508efd1d61520006f95bc812214b`
  - **S3 Endpoint**：`https://1270508efd1d61520006f95bc812214b.r2.cloudflarestorage.com`
  - **公开 CDN 绑定域名**：`https://assets.66367749.xyz`（已通过全球 300+ 边缘机房交付，免流量出站费，HTTP/2 验证通过）
  - **R2 公开开发域名**：`https://pub-b20547c0488b456f8b6c033d9a7a1ca1.r2.dev`
- **Supabase 数据库**：
  - **Project URL**：`https://gtccrzjtcaazlhqqmzdz.supabase.co`
  - **核心表**：`questions_data`（累计承载 **31,994** 道真题及答案元数据）
  - **已扩充字段**：
    - `image_path` (TEXT)：题目的 Cloudflare R2 相对路径，格式为 `physics/<series>/.../<filename>.png`
    - `ms_image_path` (TEXT)：评分标准（Mark Scheme）的 Cloudflare R2 相对路径
    - `series` (TEXT)：考局系列体系标签（`CAIE-AL-9702`, `AQA-IAL-9630`, `EDX-IAL` 等 9 大考局）
    - `paper_type` (TEXT)：题型分类（大题 `SQ` 或选择题 `MCQ`）

---

## 二、数据流与图片分发设计

```
[ 终端用户 (浏览器 / 移动端) ]
         |
         +----------------------------------+
         | (1) 页面路由 & 题目检索 (API)         | (2) 直接加载题图与答案切片 (CDN)
         v                                  v
  [ Nuxt 3 前端 (Vercel / Cloudflare Pages) ] [ Cloudflare CDN (assets.66367749.xyz) ]
         |                                  |
         | (Supabase JS Client)             | (全量 1240px 高清切片，0 出站流量费)
         v                                  +-- /physics/CAIE-AL-9702/...
  [ Supabase (PostgreSQL: questions_data) ] +-- /physics/AQA-IAL-9630/...
  - 31,994 条题目元数据 (题号/分数/起止/OCR)    +-- /physics/EDX-IAL/...
  - 用户系统、做题记录、收藏、评论
```

---

## 三、前端重构亮点 (`components/QuestionGallery.vue` & `pages/`)

1. **考局系列网格导航 (`pages/index.vue`)**：
   - 全面支持 9 大物理考试局（CAIE A-Level / IGCSE、OxfordAQA IAL、AQA UK A-Level / GCSE、Edexcel IAL / IGCSE / UK A-Level / GCSE）。
   - 包含卡片层级标识与题库总量展示。

2. **现代化交互图库 (`components/QuestionGallery.vue`)**：
   - **动态题型筛选**：支持快速切换 `全部 (All)` / `结构化大题 (SQ)` / `选择题 (MCQ)`。
   - **试卷下拉筛选**：按选择考局自动动态拉取该考局下的所有试卷编号。
   - **平滑切题与随机刷题**：Prev、Next、🎲 Random 题号切换，并展示题库进度位置。
   - **题目与 Mark Scheme 一键切换**：
     - 大题：一键在高清题目与官方答案切片图之间无缝切换。
     - 选择题：自动高亮展示答案选项（例如 `Answer: C`）。
   - **OCR 文本抽屉**：支持一键展开查看题目 OCR 识别纯文本与 Mark Scheme 文字描述。
   - **AI 智能导师**：保持与 `AskAIModal` 边缘函数的全流程答疑对接。

---

## 四、本地开发与线上部署说明

### 1. 本地启动
进入项目目录：
```bash
cd /Users/feng/Desktop/项目/web项目/web-projects/p3-supabase
npm install
npm run dev
```
本地访问：`http://localhost:3000`

### 2. 生产构建验证
```bash
npm run build
node .output/server/index.mjs
```
经测试构建耗时仅 ~1 秒，静态 chunk 与 SSR 服务全绿通过。

### 3. 一键部署到 Vercel 或 Cloudflare Pages
在 GitHub 仓库中，项目代码已经全部推送至 `master` 分支：
1. 登录 [Vercel](https://vercel.com) 或 [Cloudflare Pages](https://dash.cloudflare.com/)。
2. 关联 GitHub 仓库 `Szerelem0617/supabase-questionbank`。
3. 添加环境变量：
   - `SUPABASE_URL`: `https://gtccrzjtcaazlhqqmzdz.supabase.co`
   - `SUPABASE_KEY`: 填入你的 Supabase anon 公开密钥
   - `NUXT_PUBLIC_CDN_BASE_URL`: `https://assets.66367749.xyz`
4. 点击 Deploy 即可在全球完成发布！
