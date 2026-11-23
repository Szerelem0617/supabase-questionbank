export interface SubjectSpec {
  id: string
  name: string
  shortName: string
  level: string
  board: string
  icon: string
  color: string
}

export interface SubjectSection {
  key: string
  titleZh: string
  titleEn: string
  subjects: SubjectSpec[]
}

export const ALL_SECTIONS: SubjectSection[] = [
  {
    key: 'caie',
    titleZh: 'CAIE 剑桥国际',
    titleEn: 'CAIE Cambridge Assessment',
    subjects: [
      { id: 'CAIE-AL-9702', name: 'Cambridge International A Level Physics (9702)', shortName: 'CAIE A Level (9702)', level: 'A Level', board: 'CAIE', icon: '⚛️', color: 'coral' },
      { id: 'CAIE-IG-0625', name: 'Cambridge IGCSE Physics (0625)', shortName: 'CAIE IGCSE (0625)', level: 'IGCSE', board: 'CAIE', icon: '🔭', color: 'amber' },
    ]
  },
  {
    key: 'edx',
    titleZh: 'Pearson Edexcel 爱德思',
    titleEn: 'Pearson Edexcel',
    subjects: [
      { id: 'EDX-IAL', name: 'Edexcel International A Level Physics', shortName: 'Edexcel IAL Physics', level: 'IAL', board: 'Edexcel', icon: '🔬', color: 'coral' },
      { id: 'EDX-IG', name: 'Edexcel International GCSE Physics', shortName: 'Edexcel IGCSE Physics', level: 'IGCSE', board: 'Edexcel', icon: '🚀', color: 'amber' },
      { id: 'EDX-本土AL', name: 'Edexcel UK A Level Physics', shortName: 'Edexcel UK A Level', level: 'UK A Level', board: 'Edexcel UK', icon: '🎯', color: 'purple' },
      { id: 'EDX-本土GCSE', name: 'Edexcel UK GCSE Physics', shortName: 'Edexcel UK GCSE', level: 'UK GCSE', board: 'Edexcel UK', icon: '📡', color: 'slate' },
    ]
  },
  {
    key: 'aqa',
    titleZh: 'AQA & OxfordAQA 牛津与牛津国际',
    titleEn: 'AQA & OxfordAQA',
    subjects: [
      { id: 'AQA-IAL-9630', name: 'OxfordAQA International A Level Physics (9630)', shortName: 'OxfordAQA IAL (9630)', level: 'IAL', board: 'OxfordAQA', icon: '⚡', color: 'teal' },
      { id: 'AQA-本土AL', name: 'AQA UK A Level Physics (7408)', shortName: 'AQA UK A Level (7408)', level: 'UK A Level', board: 'AQA UK', icon: '💡', color: 'slate' },
      { id: 'AQA-本土GCSE', name: 'AQA UK GCSE Physics (8463)', shortName: 'AQA UK GCSE (8463)', level: 'UK GCSE', board: 'AQA UK', icon: '🧲', color: 'sage' },
    ]
  },
  {
    key: 'olympiad',
    titleZh: '物理竞赛与大学加试',
    titleEn: 'Physics Olympiad & Admissions Tests',
    subjects: [
      { id: 'BPhO-R1', name: 'British Physics Olympiad Round 1 (BPhO R1)', shortName: 'BPhO Round 1', level: 'Olympiad', board: 'BPhO', icon: '🏆', color: 'purple' },
      { id: 'BPhO-R2', name: 'British Physics Olympiad Round 2 (BPhO R2)', shortName: 'BPhO Round 2', level: 'Olympiad', board: 'BPhO', icon: '🥇', color: 'purple' },
      { id: 'BAAO-R1', name: 'British Astronomy & Astrophysics Olympiad R1', shortName: 'BAAO Round 1', level: 'Olympiad', board: 'BAAO', icon: '🪐', color: 'teal' },
      { id: 'BAAO-R2', name: 'British Astronomy & Astrophysics Olympiad R2', shortName: 'BAAO Round 2', level: 'Olympiad', board: 'BAAO', icon: '🌟', color: 'teal' },
      { id: 'PhysicsBowl', name: 'AAPT PhysicsBowl Competition', shortName: 'PhysicsBowl', level: 'Competition', board: 'AAPT', icon: '🎳', color: 'coral' },
      { id: 'PAT', name: 'Oxford Physics Aptitude Test (PAT)', shortName: 'Oxford PAT', level: 'Admissions', board: 'Oxford', icon: '🎓', color: 'slate' },
      { id: 'SPC', name: 'Senior Physics Challenge (SPC)', shortName: 'BPhO SPC', level: 'Competition', board: 'BPhO', icon: '🎯', color: 'amber' },
      { id: 'ESAT', name: 'Cambridge ESAT (ENGAA / NSAA Admissions)', shortName: 'Cambridge ESAT', level: 'Admissions', board: 'Cambridge', icon: '🧪', color: 'sage' },
    ]
  }
]

export const ALL_SUBJECTS: SubjectSpec[] = ALL_SECTIONS.flatMap(s => s.subjects)

export function getSubjectById(id: string | null | undefined): SubjectSpec | null {
  if (!id || id === 'ALL') return null
  const decoded = decodeURIComponent(id)
  return ALL_SUBJECTS.find(s => s.id === decoded || s.id.toLowerCase() === decoded.toLowerCase()) || null
}
