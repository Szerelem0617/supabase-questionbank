# Web 题库系统与 Cloudflare + Supabase 架构方案分析

本文档梳理了 `/Users/feng/Desktop/项目/web项目/web-projects/p3-supabase`（以下简称 `p3-supabase`）项目的现状、架构设计、可行性评估，以及基于 **Cloudflare R2 + Supabase + Nuxt 3** 的现代化题库上线方案。

---

## 一、项目背景与现状分析

### 1. `p3-supabase` 项目架构
- **前端技术栈**：Nuxt 3（Vue 3 Composition API）+ TypeScript + SCSS。
- **渲染策略（Hybrid Rendering）**：
  - **首页 / 导航**：SSR（保证首屏加载速度与 SEO 抓取）。
  - **科目 / Topic / 试卷聚合页**：ISR（增量静态生成，缓存 1 天，SEO 核心）。
  - **题目交互页**：SPA（纯客户端渲染，弹窗/卡片刷题，体验核心）。
- **后端服务（Supabase）**：
  - **PostgreSQL 数据库**：托管题目元数据、用户系统、评论、做题记录。
  - **Edge Functions**：包含 `find-similar`（向量匹配找相似题）、`ask-ai`（AI 答疑讲解）等边缘无服务接口。
  - **原生 Storage 缺陷**：原型中图片通过 `client.storage.from('bucket').getPublicUrl()` 依赖 Supabase Storage，但 Supabase Free Plan 仅提供 1 GB 存储空间，无法承载全量题库。

### 2. 本地题库数据现状
- **图片数据总量**：本地 `/Users/feng/data` 目录下 9 大考试局体系物理真题切图总大小约 **4.8 GB ~ 5.0 GB**。
  - 涵盖 AQA（本土 AL/GCSE、IAL 9630）、CAIE（AL 9702、IG 0625）、Edexcel（IAL、IG、本土 AL/GCSE）。
  - 题目数量：选择题（MCQ）约 1.1 万道，结构化大题（SQ）约 2.1 万道，累计超 3.2 万张高清题目及答案切片图。
- **元数据库**：本地 SQLite 数据库（`physics-examquestions.db`）已有完整的元数据结构（题号、卷号、年份、分数、起止坐标、Mark Scheme 路径与文本等）。

---

## 二、架构评估：为什么 Cloudflare R2 + Supabase 是最优解？

针对将约 5GB 图片上传到云端并在 Web 项目展示的需求，采用 **Cloudflare R2（静态文件） + Supabase（动态数据与逻辑）** 是目前成本最低、性能最好的“动静分离”方案。

### 方案对比分析

| 评估维度 | Supabase Storage 原生存储 | Cloudflare R2 对象存储 | 传统云存储（如 AWS S3 / 阿里云 OSS） |
| :--- | :--- | :--- | :--- |
| **存储费用** | 免费额度仅 1GB，超额需升级 \$25/月 Pro 计划 | **每月 10 GB 免费额度**（当前 5GB 题库完全免费，**0 元**） | 按 GB/月计费，且有存储门槛 |
| **出站流量费 (Egress)** | 超额按 \$0.09/GB 计费，高频刷题成本激增 | **\$0.00 / GB（完全免流量费）**，全球 CDN 分发零带宽成本 | 流量费用昂贵，是主要成本支出 |
| **全球访问性能** | 单区服务器分发，多地访问可能出现网络延迟 | 依托 Cloudflare 全球 300+ 边缘机房节点，秒级响应与强缓存 | 需额外配置 CDN 加速，配置复杂且双重计费 |
| **接口兼容性** | 私有 API，批量传输慢 | **100% 兼容 S3 协议**，支持 `boto3` / `rclone` / `wrangler` 多线程秒级同步 | 兼容 S3 |
| **动静解耦程度** | 数据库与大文件耦合在同一服务商，迁移与备份笨重 | **动静彻底解耦**：数据库专注元数据与检索，R2 专注高效静态托管 | 动静解耦 |

---

## 三、目标架构与数据流设计

```
[ 终端用户 (浏览器 / 移动端) ]
         |
         +----------------------------------+
         | (1) 页面路由 & 题目元数据检索         | (2) 直接加载题图与答案切片
         v                                  v
  [ Nuxt 3 前端 (Vercel / CF Pages) ]     [ Cloudflare CDN (R2 Bucket) ]
         |                                  |
         | (Supabase SDK)                   | (统一相对路径映射)
         v                                  +-- /physics/CAIE-AL-9702/...
  [ Supabase (PostgreSQL) ]                 +-- /physics/AQA-本土AL/...
  - questions (3.2万条题目元数据)              +-- /physics/EDX-IAL/...
  - 用户系统、做题记录、收藏、评论
  - 仅存储图片相对路径（~50MB 空间）
```

### 1. Cloudflare R2 路径规范
R2 存储桶（建议命名：`exam-questions-assets`）统一按考试局与试卷层级存放：
```text
exam-questions-assets/
  ├── physics/
  │    ├── CAIE-AL-9702/
  │    │    └── paper2/2022/Mar/9702_m22_qp_22/9702_m22_22_q1(a).png
  │    ├── EDX-IAL/
  │    │    └── u1/2023/jun/edx-ial_23jun_u1_q1.png
  │    └── AQA-本土AL/
  │         └── 7408-1/2023/jun/aqa-ukal_23jun_q1.png
```

### 2. 数据库元数据字段映射
Supabase `questions` 表无需存二进制文件，只需保存相对路径：
- `image_url`: 存储相对路径，例如 `physics/CAIE-AL-9702/paper2/.../9702_m22_22_q1(a).png`
- `ms_image_url`: 存储答案切片相对路径，例如 `physics/CAIE-AL-9702/paper2/.../ms_9702_m22_22_q1(a).png`

前端只需配置环境变量：
```env
NUXT_PUBLIC_CDN_BASE_URL="https://assets.yourdomain.com"
```
模板中直接渲染：
```html
<img :src="`${cdnBaseUrl}/${q.image_url}`" loading="lazy" />
```

---

## 四、后续演进执行路线

1. **第一阶段：切题图片质量优化（当前优先）**
   - 检查切题流水线中生成图片的分辨率、DPI、色彩空间与清晰度；
   - 保证文字清晰无锯齿、公式不糊、同时避免体积膨胀。
2. **第二阶段：Cloudflare R2 建立与批量同步**
   - 编写 Python 自动化同步脚本（基于 S3 协议 / `boto3`），支持断点续传与 MD5 校验，将优化后的本地 5GB 图片秒级上传到 R2。
3. **第三阶段：SQLite 元数据同步至 Supabase**
   - 编写导入脚本，将本地 `physics-examquestions.db` 的 MCQ / SQ 题目批量同步至 Supabase PostgreSQL 表。
4. **第四阶段：`p3-supabase` 前端改造**
   - 替换原生 Storage 逻辑为 CDN 直连；
   - 引入之前在思源插件中跑通的“触底平滑懒加载”与多维筛选器（考试局、年份、卷型、知识点）。

