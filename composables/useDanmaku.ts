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

export function checkIsLiked(commentId: string | number): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(`danmaku_like_${commentId}`) === 'true'
}

export function useDanmaku() {
  const { t, locale } = useI18n()
  const danmakuEnabled = ref(true)
  const MAX_DANMAKU_DISPLAY = 5
  const laneTops = [80, 165, 250, 335, 420]
  const activeSlots = ref<any[]>([])
  const poolPointer = ref(0)
  const CYCLE_DURATION = 14

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
    if (!list || list.length <= MAX_DANMAKU_DISPLAY) {
      return
    }
    poolPointer.value = (poolPointer.value + 1) % list.length
    if (activeSlots.value[sIdx]) {
      activeSlots.value[sIdx].item = list[poolPointer.value]
    }
  }

  async function toggleLike(item: any, client: any, showToast?: (msg: string) => void) {
    if (!item) return
    if (item.liked) {
      item.likes = Math.max(0, (item.likes || 1) - 1)
      item.liked = false
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`danmaku_like_${item.id}`)
      }
    } else {
      item.likes = (item.likes || 0) + 1
      item.liked = true
      if (typeof window !== 'undefined') {
        localStorage.setItem(`danmaku_like_${item.id}`, 'true')
      }
      if (showToast) showToast(locale.value === 'zh' ? '👍 感谢赞同该做题思路！' : '👍 Liked comment!')
      if (!item.isMock && typeof item.id === 'number' && client) {
        try {
          await client.from('comments').update({ likes: item.likes }).eq('id', item.id)
        } catch (e) {
          console.warn('Sync likes to Supabase failed:', e)
        }
      }
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
    MAX_DANMAKU_DISPLAY,
    laneTops,
    activeSlots,
    initDanmakuSlots,
    onSlotIteration,
    toggleLike,
    focusSubQuestion
  }
}

