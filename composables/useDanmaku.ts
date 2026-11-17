import { ref, computed } from 'vue'

export const MOCK_SUBQ_COMMENTS: Record<string, any[]> = {
  'default': [
    { id: 'mock-d1', author: 'Physics_Pro', message: '作图记得用直尺，斜率计算必须在图线上取相距一半以上的两点！', time: '10分钟前', likes: 23 },
    { id: 'mock-d2', author: '考神附体', message: '单位换算要小心，注意题目给出的是 mm 还是 m。', time: '25分钟前', likes: 14 }
  ],
  '2(a)': [
    { id: 'mock-2a-1', author: '林同学', message: '注意这里的物理定义：force is the rate of change of momentum，不能只写 F=ma！', time: '5分钟前', likes: 45 },
    { id: 'mock-2a-2', author: 'Physics_Geek', message: 'CAIE 要求写出完整动量变化率英文，写 dp/dt 能保住满分。', time: '18分钟前', likes: 31 }
  ],
  '2(b)(i)': [
    { id: 'mock-2bi-1', author: 'Cambridge2024', message: '从 v-t 图像求加速度求切线斜率即可，注意 t=0 时初速度是 0。', time: '12分钟前', likes: 19 },
    { id: 'mock-2bi-2', author: 'Alex.W', message: '坐标轴单位是 cm/s，千万别看错成 m/s，差点丢了 2 分！', time: '30分钟前', likes: 27 }
  ],
  '2(b)(ii)': [
    { id: 'mock-2bii-1', author: '刷题狂魔', message: '计算答案是 4.8 m/s²，负号代表方向向下，题目问大小还是矢量？看清 wording！', time: '8分钟前', likes: 16 },
    { id: 'mock-2bii-2', author: 'Sarah', message: '官方 Mark Scheme 规定有效数字保留 2 位（4.8），写 4.82 可能会被扣 A1 分。', time: '40分钟前', likes: 38 }
  ],
  '2(b)(iii)': [
    { id: 'mock-2biii-1', author: '物理课代表', message: '别忘了空气阻力做的功 W = ΔEk + ΔEp，很多人漏掉了重力势能损失。', time: '15分钟前', likes: 29 },
    { id: 'mock-2biii-2', author: 'Newton_Fan', message: '阻力不是恒力，不能直接用 W = F*s，必须用机械能守恒的差值求！', time: '1小时前', likes: 42 }
  ],
  '2(b)(iv)': [
    { id: 'mock-2biv-1', author: '学霸小张', message: '解释 terminal velocity：当 drag force 增大到等于重力时，合力为 0，加速度归零恒速下落。', time: '20分钟前', likes: 33 },
    { id: 'mock-2biv-2', author: 'Ken', message: 'Mark scheme 给分点：1. 阻力增大 2. 合力减小 3. a=0 达到终端速度。', time: '2小时前', likes: 18 }
  ]
}

// 丰富的各科目默认真题高频核心考点弹幕库
export const CURATED_PHYSICS_TIPS = [
  { author: 'Physics_Pro', message: '作图记得用直尺，斜率计算必须在图线上取相距一半以上的两点！', likes: 42, time: '8分钟前' },
  { author: '考神附体', message: '单位换算要小心，注意题目给出的是 mm、cm 还是 m。', likes: 35, time: '15分钟前' },
  { author: '林同学', message: '注意概念定义完整性，英文写清 rate of change of momentum。', likes: 28, time: '20分钟前' },
  { author: 'Cambridge2024', message: '切线斜率表示瞬时加速度，图像面积表示总位移，别记反了！', likes: 39, time: '25分钟前' },
  { author: '牛顿的小迷弟', message: '别漏掉重力势能变化，列能量守恒方程：Total Initial E = Total Final E。', likes: 31, time: '32分钟前' },
  { author: 'Sarah_Astar', message: '有效数字 (Significant Figures) 严格与题目数据对齐，一般保留 2-3 位有效数字。', likes: 45, time: '40分钟前' },
  { author: '电磁学小能手', message: '法拉第电磁感应定律 E = -N(ΔΦ/Δt)，别忘了匝数 N！', likes: 33, time: '45分钟前' },
  { author: '刷题达人', message: '矢量题要明确指定正方向，标明大小与具体方向 (magnitude & direction)。', likes: 27, time: '1小时前' },
  { author: 'BPhO选手', message: '推导题注意中间步骤，Mark Scheme 的 M 分和 A 分必须有明确因果链！', likes: 49, time: '1小时前' },
  { author: '学霸小周', message: '简谐运动 SHM 加速度公式 a = -ω²x，负号一定不能丢！', likes: 36, time: '2小时前' }
]

// 确保每个题目的默认题目都有丰富生动的弹幕数据
export function getQuestionSeedComments(rawNum: string = '', questionId: any = ''): any[] {
  const key = String(rawNum).trim()
  if (MOCK_SUBQ_COMMENTS[key] && MOCK_SUBQ_COMMENTS[key].length > 0) {
    return MOCK_SUBQ_COMMENTS[key]
  }

  let hash = 0
  const str = String(questionId || rawNum || 'default')
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  const offset = Math.abs(hash) % CURATED_PHYSICS_TIPS.length

  const selected = []
  for (let i = 0; i < 4; i++) {
    const tip = CURATED_PHYSICS_TIPS[(offset + i) % CURATED_PHYSICS_TIPS.length]
    selected.push({
      id: `seed-${str}-${i}`,
      author: tip.author,
      message: tip.message,
      likes: tip.likes,
      time: tip.time,
      isMock: true,
      liked: false
    })
  }
  return selected
}

export function checkIsLiked(commentId: string | number): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(`danmaku_like_${commentId}`) === 'true'
}

// Global shared danmaku visibility state
const danmakuEnabled = ref(true)
let isDanmakuPrefInitialized = false

export function initDanmakuPreference() {
  if (typeof window === 'undefined' || isDanmakuPrefInitialized) return
  isDanmakuPrefInitialized = true
  const saved = localStorage.getItem('physics_danmaku_enabled')
  if (saved !== null) {
    danmakuEnabled.value = saved !== 'false'
  }
}

export function toggleDanmakuGlobal() {
  initDanmakuPreference()
  danmakuEnabled.value = !danmakuEnabled.value
  if (typeof window !== 'undefined') {
    localStorage.setItem('physics_danmaku_enabled', String(danmakuEnabled.value))
  }
  return danmakuEnabled.value
}

export function useDanmaku() {
  const { t, locale } = useI18n()
  initDanmakuPreference()
  
  const MAX_DANMAKU_DISPLAY = 5
  const laneTops = [80, 165, 250, 335, 420]
  const activeSlots = ref<any[]>([])
  const poolPointer = ref(0)
  const CYCLE_DURATION = 14

  function toggleDanmaku() {
    const val = toggleDanmakuGlobal()
    if (!val) {
      activeSlots.value = []
    }
    return val
  }

  function initDanmakuSlots(list: any[]) {
    if (!danmakuEnabled.value || !list || list.length === 0) {
      activeSlots.value = []
      return
    }

    const count = Math.min(MAX_DANMAKU_DISPLAY, list.length)
    const slots = []
    for (let i = 0; i < count; i++) {
      const negativeDelay = -Number((i * (CYCLE_DURATION / count)).toFixed(2))
      slots.push({
        slotId: `slot-${i}-${Date.now()}`,
        laneIndex: i,
        item: list[i],
        duration: CYCLE_DURATION,
        delay: negativeDelay,
        isPaused: false
      })
    }
    poolPointer.value = count - 1
    activeSlots.value = slots
  }

  function onSlotIteration(sIdx: number, list: any[]) {
    // 弹幕完成一轮动画循环飘走后，固化为公共总赞数，重置临时高亮，实现双向匿名
    if (activeSlots.value[sIdx]?.item) {
      activeSlots.value[sIdx].item.liked = false
    }

    if (!list || list.length <= MAX_DANMAKU_DISPLAY) {
      return
    }
    poolPointer.value = (poolPointer.value + 1) % list.length
    if (activeSlots.value[sIdx]) {
      activeSlots.value[sIdx].item = list[poolPointer.value]
    }
  }

  // 跨端双向匿名点赞：直接调用 Supabase 原子 RPC 函数
  async function syncLikeDelta(commentId: string | number, delta: number, client: any) {
    if (!commentId || !client) return
    if (String(commentId).startsWith('mock-') || String(commentId).startsWith('hc-') || String(commentId).startsWith('local-') || String(commentId).startsWith('seed-')) {
      return
    }
    const numericId = Number(commentId)
    if (isNaN(numericId)) return

    try {
      await client.rpc('increment_comment_like', {
        c_id: numericId,
        delta: delta
      })
    } catch (err) {
      console.warn('[Danmaku] Failed to sync like delta:', err)
    }
  }

  async function toggleLike(item: any, client: any, showToast?: (msg: string) => void) {
    if (!item) return
    // 飘走前可反悔取消
    if (item.liked) {
      item.likes = Math.max(0, (item.likes || 1) - 1)
      item.liked = false
      if (showToast) showToast(locale.value === 'zh' ? '已取消点赞' : 'Like removed')
      syncLikeDelta(item.id, -1, client)
    } else {
      item.likes = (item.likes || 0) + 1
      item.liked = true
      if (showToast) showToast(locale.value === 'zh' ? '❤️ 感谢点赞该做题心得！' : '❤️ Liked note!')
      syncLikeDelta(item.id, 1, client)
    }
  }

  function focusSubQuestion(subQId: string | number) {
    if (typeof document === 'undefined') return
    const el = document.getElementById(`subq-row-${subQId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('subq-focus-highlight')
      setTimeout(() => el.classList.remove('subq-focus-highlight'), 2200)
    }
  }

  return {
    danmakuEnabled,
    toggleDanmaku,
    MAX_DANMAKU_DISPLAY,
    laneTops,
    activeSlots,
    initDanmakuSlots,
    onSlotIteration,
    toggleLike,
    focusSubQuestion
  }
}

