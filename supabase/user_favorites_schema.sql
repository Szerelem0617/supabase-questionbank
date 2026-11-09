-- ==============================================================================
-- 题库用户收藏夹与题目关联表架构 (User Favorites & Folders Schema)
-- ==============================================================================

-- 1. 用户收藏夹表 (扁平结构，无嵌套，类似 Bilibili / 小红书专辑)
CREATE TABLE IF NOT EXISTS public.user_folders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_monthly_wrong BOOLEAN DEFAULT FALSE,
  month_key TEXT, -- 例如 '2024-11'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为 user_folders 开启行级安全策略 (RLS)
ALTER TABLE public.user_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own folders"
  ON public.user_folders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. 用户收藏题目表 (支持整题 SQ / MCQ 以及 SQ 分小问收藏)
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id TEXT REFERENCES public.user_folders(id) ON DELETE CASCADE,
  question_id BIGINT REFERENCES public.questions_data(id) ON DELETE CASCADE,
  is_sub BOOLEAN DEFAULT FALSE,
  sub_q_id BIGINT,
  sub_q_num TEXT,
  paper_filename TEXT,
  paper_type TEXT, -- 'SQ' 或 'MCQ'
  board TEXT,      -- 'CAIE', 'Edexcel', 'AQA', 'OCR'
  series TEXT,
  score TEXT,
  image_path TEXT,
  ms_image_path TEXT,
  ms_details TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为 user_favorites 开启行级安全策略 (RLS)
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites"
  ON public.user_favorites
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. 索引优化 (用于高频检索与过滤)
CREATE INDEX IF NOT EXISTS idx_user_fav_user_folder ON public.user_favorites(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_user_fav_qid ON public.user_favorites(question_id, sub_q_id);
CREATE INDEX IF NOT EXISTS idx_user_fav_board_type ON public.user_favorites(board, paper_type);

