import { ref, computed } from 'vue'

export type Locale = 'zh' | 'en'

const currentLocale = ref<Locale>('zh')
let isInitialized = false

const messages = {
  zh: {
    nav: {
      brand: '物理题库',
      brandSubtitle: '物理真题库',
      signIn: '登录',
      signOut: '退出登录',
      profile: '个人资料',
      allSpecs: '全部规格科目',
      backHome: '返回首页',
    },
    home: {
      title: '物理题库',
      subtitlePrefix: '精选收录超过 ',
      subtitleQuestions: '30,000+ 道真题',
      subtitleSuffix: '与官方评分标准，覆盖剑桥 CAIE、牛津 OxfordAQA 与爱德思 Edexcel 国际与英国大纲。',
      caieTitle: 'CAIE 剑桥体系',
      caieDesc: '收录剑桥国际 A Level (9702) 与 IGCSE (0625) 历年真题及官方 Mark Scheme',
      edxTitle: 'Edexcel 爱德思体系',
      edxDesc: '收录爱德思国际 IAL / IGCSE 以及英国本土 AL / GCSE 全套真题与官方评分标准',
      aqaTitle: 'AQA 体系',
      aqaDesc: '收录牛津国际 OxfordAQA (9630) 与英国本土 AQA (7408 / 8463) 历年真题及官方答案',
      olympiadTitle: '物理竞赛与附加考试',
      olympiadDesc: '收录 BPhO、BAAO、PhysicsBowl、PAT、SPC、ESAT 等顶级物理竞赛与牛剑选拔真题',
      seriesCount: '{count} 个规格可用',
      browseQuestions: '开始刷题',
    },
    search: {
      sqPlaceholder: 'SQ 关键词 (支持 + 组合，或 qp:试卷号)...',
      sqPaperPlaceholder: '筛选 SQ 试卷...',
      sqSearchBtn: '搜索 SQ',
      mcqPlaceholder: 'MCQ 关键词 (支持 + 组合，或 qp:试卷号)...',
      mcqPaperPlaceholder: '筛选 MCQ 试卷...',
      mcqSearchBtn: '搜索 MCQ',
      allPapers: '全部试卷',
      searching: '搜索中...',
      resultsTitle: '搜索结果',
      foundCount: '找到 {count} 道相关题目',
      foundSqCount: '找到 {count} 道大题',
      matchedParts: '命中 {count} 个小问',
      noResults: '未找到匹配题目',
      returnToQuestion: '返回原题',
      loadingMore: '正在载入更多题目...',
      noMore: '已显示全部搜索结果',
      enterKeywordTip: '请输入搜索关键词',
      score: '{score} 分',
    },
    galleryNav: {
      paperLabel: '试卷:',
      allPapers: '全部试卷',
      favorites: '收藏夹',
      totalFavCount: '{count} 个收藏',
      emptyFav: '暂无收藏',
      defaultFolder: '默认收藏夹',
      newFolder: '新建收藏夹',
      newFolderPrompt: '请输入新收藏夹名称:',
      newFolderPlaceholder: '收藏夹名称',
      folderCreated: '创建收藏夹成功',
      prevQuestion: '上一题',
      nextQuestion: '下一题',
      randomQuestion: '随机',
      questionIndex: '第 {current} / {total} 题',
      loadingPool: '正在载入题库数据...',
      noQuestionsFound: '未找到符合条件的题目',
      resetFilter: '重置筛选',
    },
    favoritesView: {
      favContents: '收藏内容',
      folderPrefix: '当前收藏夹:',
      totalCount: '共 {count} 题',
      board: '考试局',
      allBoards: '全部考试局',
      qType: '题型',
      allQTypes: '全部题型',
      paper: '试卷',
      allPapers: '全部试卷',
      reset: '重置',
      emptyFolder: '当前收藏夹暂无内容',
      unfavorite: '取消收藏',
      favorited: '已收藏',
      favorite: '收藏',
      discuss: '做题讨论',
      viewAnswer: '查看解析 / 答案',
      hideAnswer: '收起解析',
      expandWhole: '展开整道题查看',
      viewThisQuestion: '查看此题',
    },
    singleQuestion: {
      copyStitched: '复制大题整图',
      copying: '正在拼接...',
      danmaku: '弹幕',
      on: '开',
      off: '关',
      subQuestion: '第 ({sub}) 问',
      favWhole: '收藏整题',
      favSubQ: '收藏此小问',
      favMcq: '收藏此题',
      alreadyFav: '已收藏',
      alreadyFavWhole: '已收藏整题',
      viewMs: '查看答案 (Mark Scheme)',
      hideMs: '收起答案',
      mcqAnswer: '官方正确答案:',
      discussBtn: '💬 讨论 ({count})',
      commentPlaceholder: '发表做题心得或提问...',
      sendComment: '发送',
      noComments: '暂无讨论，发条友善的留言吧~',
      student: '做题同学',
      justNow: '刚刚',
      like: '赞',
      score: '{score} 分',
      viewQpPdf: '📄 试卷 PDF',
      viewMsPdf: '📑 答案 PDF',
    },
    toast: {
      favSuccess: '收藏成功',
      unfavSuccess: '已取消收藏',
      addToAlbum: '加入专辑 ▾',
      selectAlbum: '选择收藏夹',
      create: '新建',
      done: '完成',
      movedTo: '已移至: {name}',
      copySuccess: '已复制整题拼接图片到剪贴板！',
      copyFail: '复制图片失败，请重试',
      likedToast: '点赞成功',
      unlikedToast: '已取消点赞',
      commentEmpty: '评论内容不能为空',
      commentSuccess: '留言发布成功！',
    },
    profile: {
      myProfile: '个人资料',
      subtitle: '管理你的个人资料与头像信息',
      username: '用户名',
      displayName: '昵称',
      update: '更新资料',
      updating: '更新中...',
      uploadAvatar: '上传头像',
      uploading: '上传中...',
    },
    auth: {
      signInTitle: '账号登录',
      registerTitle: '注册新账号',
      emailLabel: '邮箱地址',
      emailPlaceholder: 'you@example.com',
      passwordLabel: '密码',
      passwordPlaceholder: '请输入密码',
      signInBtn: '登 录',
      registerBtn: '注 册',
      oauthGithub: '使用 GitHub 登录',
      oauthGoogle: '使用 Google 登录',
    },
    guide: {
      title: '使用指南 & 快捷键',
      subtitle: '高效浏览、搜索与做题技巧',
      gotIt: '我知道了',
      shortcutsTitle: '键盘快捷键 & 页面导航',
      shortcutsDesc: '按键盘 ← / → 方向键可无延迟切换上一题 / 下一题；在搜索或收藏模式下可平滑滚动至临近卡片。屏幕左右两侧亦提供常驻半透明悬浮箭头按键。',
      searchTitle: '双引擎极速搜索 (SQ 简答 / MCQ 选择)',
      searchDesc: '输入大题题号（如 1、2、Q3）直接秒级定位对应大题；输入关键词（支持空格或 + 组合，如 density volume）可精准高亮大题中的对应小问；输入 qp:试卷名 可秒搜指定套题。',
      favTitle: '收藏夹分类管理',
      favDesc: '点击左上角 📁 图标即可随时展开收藏面板。支持单独收藏小问或整题，随时按分类或考试局进行筛选复习。',
      notesTitle: '官方评分标准 & 笔记弹幕',
      notesDesc: '点击 💡 可即时展开官方 Mark Scheme 答案；点击 💬 可记录做题笔记，登录后笔记将化为弹幕飘过；点击 📋 可将大题所有小问无缝拼接为一张超清大图复制到剪切板。',
    }
  },
  en: {
    nav: {
      brand: 'Physics Archive',
      brandSubtitle: 'Question Bank',
      signIn: 'Sign In',
      signOut: 'Sign Out',
      profile: 'Profile',
      allSpecs: 'All Specifications',
      backHome: 'Back to Home',
    },
    home: {
      title: 'Physics Past Paper Archive',
      subtitlePrefix: 'Curated repository of over ',
      subtitleQuestions: '30,000+ past exam questions',
      subtitleSuffix: ' and official mark schemes across Cambridge CAIE, OxfordAQA, and Edexcel specifications.',
      caieTitle: 'CAIE Cambridge Assessment',
      caieDesc: 'Cambridge International A Level (9702) & IGCSE (0625) past papers and official mark schemes',
      edxTitle: 'Pearson Edexcel',
      edxDesc: 'Edexcel International IAL / IGCSE and UK GCE AL / GCSE papers with official mark schemes',
      aqaTitle: 'AQA & OxfordAQA',
      aqaDesc: 'OxfordAQA International A Level (9630) and AQA UK GCE (7408 / 8463) past papers and answers',
      olympiadTitle: 'Physics Olympiad & Admissions Tests',
      olympiadDesc: 'High-caliber competition past papers including BPhO, BAAO, PhysicsBowl, PAT, SPC, and ESAT',
      seriesCount: '{count} Series Available',
      browseQuestions: 'Browse Questions',
    },
    search: {
      sqPlaceholder: 'Search SQ (+ combinations or qp:paper)...',
      sqPaperPlaceholder: 'Filter SQ paper...',
      sqSearchBtn: 'Search SQ',
      mcqPlaceholder: 'Search MCQ (+ combinations or qp:paper)...',
      mcqPaperPlaceholder: 'Filter MCQ paper...',
      mcqSearchBtn: 'Search MCQ',
      allPapers: 'All Papers',
      searching: 'Searching...',
      resultsTitle: 'Search Results',
      foundCount: '{count} questions found',
      foundSqCount: '{count} big questions found',
      matchedParts: '{count} part(s) matched',
      noResults: 'No questions matched your search',
      returnToQuestion: 'Back to Question',
      loadingMore: 'Loading more questions...',
      noMore: 'All results loaded',
      enterKeywordTip: 'Please enter a keyword to search',
      score: '{score} Marks',
    },
    galleryNav: {
      paperLabel: 'Paper:',
      allPapers: 'All Papers',
      favorites: 'Favorites',
      totalFavCount: '{count} items',
      emptyFav: 'No items yet',
      defaultFolder: 'Default Folder',
      newFolder: 'New Folder',
      newFolderPrompt: 'Enter new folder name:',
      newFolderPlaceholder: 'Folder name',
      folderCreated: 'Folder created successfully',
      prevQuestion: 'Previous',
      nextQuestion: 'Next',
      randomQuestion: 'Random',
      questionIndex: 'Question {current} / {total}',
      loadingPool: 'Loading questions pool...',
      noQuestionsFound: 'No questions found matching criteria',
      resetFilter: 'Reset Filter',
    },
    favoritesView: {
      favContents: 'Favorites',
      folderPrefix: 'Folder:',
      totalCount: '{count} questions',
      board: 'Board',
      allBoards: 'All Boards',
      qType: 'Type',
      allQTypes: 'All Types',
      paper: 'Paper',
      allPapers: 'All Papers',
      reset: 'Reset',
      emptyFolder: 'No questions in this folder yet',
      unfavorite: 'Unfavorite',
      favorited: 'Favorited',
      favorite: 'Favorite',
      discuss: 'Discussion',
      viewAnswer: 'View Mark Scheme',
      hideAnswer: 'Hide Mark Scheme',
      expandWhole: 'View Full Question',
      viewThisQuestion: 'Jump to Question',
    },
    singleQuestion: {
      copyStitched: 'Copy Stitched Image',
      copying: 'Stitching...',
      danmaku: 'Danmaku',
      on: 'ON',
      off: 'OFF',
      subQuestion: 'Part ({sub})',
      favWhole: 'Favorite Question',
      favSubQ: 'Favorite Part',
      favMcq: 'Favorite Question',
      alreadyFav: 'Favorited',
      alreadyFavWhole: 'Favorited Question',
      viewMs: 'View Mark Scheme',
      hideMs: 'Hide Mark Scheme',
      mcqAnswer: 'Official Answer:',
      discussBtn: '💬 Comments ({count})',
      commentPlaceholder: 'Write notes, reflections or questions...',
      sendComment: 'Post',
      noComments: 'No comments yet. Be the first to share!',
      student: 'Student',
      justNow: 'Just now',
      like: 'Like',
      score: '{score} Marks',
      viewQpPdf: '📄 Question Paper',
      viewMsPdf: '📑 Mark Scheme',
    },
    toast: {
      favSuccess: 'Added to favorites',
      unfavSuccess: 'Removed from favorites',
      addToAlbum: 'Change folder ▾',
      selectAlbum: 'Select Folder',
      create: 'New',
      done: 'Done',
      movedTo: 'Moved to: {name}',
      copySuccess: 'Stitched question copied to clipboard!',
      copyFail: 'Failed to copy image, please retry',
      likedToast: 'Liked',
      unlikedToast: 'Unliked',
      commentEmpty: 'Comment cannot be empty',
      commentSuccess: 'Comment posted successfully!',
    },
    profile: {
      myProfile: 'My Profile',
      subtitle: 'Manage your profile and avatar settings',
      username: 'Username',
      displayName: 'Display Name',
      update: 'Update Profile',
      updating: 'Updating...',
      uploadAvatar: 'Upload Avatar',
      uploading: 'Uploading...',
    },
    auth: {
      signInTitle: 'Sign In',
      registerTitle: 'Create Account',
      emailLabel: 'Email Address',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      signInBtn: 'Sign In',
      registerBtn: 'Register',
      oauthGithub: 'Continue with GitHub',
      oauthGoogle: 'Continue with Google',
    },
    guide: {
      title: 'User Guide & Shortcuts',
      subtitle: 'Quick tips and keyboard shortcuts for browsing and studying',
      gotIt: 'Got it',
      shortcutsTitle: 'Keyboard Shortcuts & Navigation',
      shortcutsDesc: 'Press ← / → arrow keys to instantly navigate between questions. In search or favorites mode, it smoothly scrolls between cards. Floating side arrow buttons are also available on both screen sides.',
      searchTitle: 'Fast Dual-Engine Search (SQ / MCQ)',
      searchDesc: 'Type question numbers (e.g. 1, 2, Q3) to jump directly to big questions. Search keywords (supports multiple words with space or +, e.g. density volume) to highlight matched sub-questions. Type qp:filename to filter specific past papers.',
      favTitle: 'Custom Favorites Management',
      favDesc: 'Click the top-left 📁 folder icon anytime to open the folder panel. Bookmark individual sub-questions or entire questions, and easily organize them into folders.',
      notesTitle: 'Mark Schemes & Community Notes',
      notesDesc: 'Click 💡 to reveal official Mark Schemes with zero delay. Click 💬 to add notes that fly as danmaku across the paper. Click 📋 to seamlessly stitch and copy the entire multi-part question as a single HD image.',
    }
  }
}

export function useI18n() {
  if (import.meta.client && !isInitialized) {
    const saved = localStorage.getItem('app_locale') as Locale | null
    if (saved === 'zh' || saved === 'en') {
      currentLocale.value = saved
    } else {
      // Auto detect user browser language
      const browserLang = navigator.language?.toLowerCase() || ''
      currentLocale.value = browserLang.startsWith('zh') ? 'zh' : 'en'
    }
    isInitialized = true
  }

  function setLocale(lang: Locale) {
    currentLocale.value = lang
    if (import.meta.client) {
      localStorage.setItem('app_locale', lang)
    }
  }

  function toggleLocale() {
    setLocale(currentLocale.value === 'zh' ? 'en' : 'zh')
  }

  function t(path: string, params?: Record<string, string | number>): string {
    const keys = path.split('.')
    let current: any = messages[currentLocale.value] || messages.zh

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k]
      } else {
        // Fallback to English, then path
        let fallback: any = messages.en
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk]
          } else {
            fallback = null
            break
          }
        }
        current = fallback || path
        break
      }
    }

    if (typeof current !== 'string') return path

    if (params) {
      return Object.entries(params).reduce((str, [k, v]) => {
        return str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }, current)
    }

    return current
  }

  return {
    locale: currentLocale,
    setLocale,
    toggleLocale,
    t
  }
}

