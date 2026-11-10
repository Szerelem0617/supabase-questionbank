export interface PaperGroupOption {
  value: string
  label: string
}

export function formatPaperGroupLabel(val: string): string {
  if (!val || val === 'All' || val === 'all') return 'All Papers'
  
  const v = val.toLowerCase()
  if (v === 'p1') return 'Paper 1'
  if (v === 'p2') return 'Paper 2'
  if (v === 'p3') return 'Paper 3'
  if (v === 'p4') return 'Paper 4'
  if (v === 'p5') return 'Paper 5'
  if (v === 'p6') return 'Paper 6'
  if (v === 'u1') return 'Unit 1'
  if (v === 'u2') return 'Unit 2'
  if (v === 'u3') return 'Unit 3'
  if (v === 'u4') return 'Unit 4'
  if (v === 'u5') return 'Unit 5'
  if (v === 'u6') return 'Unit 6'
  if (v === '1p') return 'Paper 1P'
  if (v === '2p') return 'Paper 2P'
  if (v === 'olympiad-physicsbowl') return 'PhysicsBowl'
  if (v === 'olympiad-bpho-r1') return 'BPhO-R1'
  if (v === 'olympiad-bpho-r2') return 'BPhO-R2'
  if (v === 'olympiad-baao-r1') return 'BAAO-R1'
  if (v === 'olympiad-baao-r2') return 'BAAO-R2'
  if (v === 'olympiad-pat') return 'PAT'
  if (v === 'olympiad-engaa') return 'ENGAA (ESAT)'
  if (v === 'olympiad-nsaa') return 'NSAA (ESAT)'
  if (v === 'olympiad-spc') return 'SPC'

  if (v.startsWith('olympiad-')) return val.slice('olympiad-'.length).toUpperCase()
  return val
}

export function getPaperGroup(
  filename: string = '',
  qid: string = '',
  paperType: string = '',
  series: string = '',
  imagePath: string = ''
): PaperGroupOption {
  const fn = String(filename || '').toLowerCase()
  const id = String(qid || '').toLowerCase()
  const ser = String(series || '').toLowerCase()
  const img = String(imagePath || '').toLowerCase()
  const target = `${fn} ${id} ${ser} ${img}`

  // 1. Olympiad
  if (target.includes('physicsbowl')) return { value: 'olympiad-physicsbowl', label: 'PhysicsBowl' }
  if (target.includes('bpho-r1') || target.includes('bpho_r1')) return { value: 'olympiad-bpho-r1', label: 'BPhO-R1' }
  if (target.includes('bpho-r2') || target.includes('bpho_r2')) return { value: 'olympiad-bpho-r2', label: 'BPhO-R2' }
  if (target.includes('baao-r1')) return { value: 'olympiad-baao-r1', label: 'BAAO-R1' }
  if (target.includes('baao-r2')) return { value: 'olympiad-baao-r2', label: 'BAAO-R2' }
  if (target.includes('pat')) return { value: 'olympiad-pat', label: 'PAT' }
  if (target.includes('engaa')) return { value: 'olympiad-engaa', label: 'ENGAA' }
  if (target.includes('nsaa')) return { value: 'olympiad-nsaa', label: 'NSAA' }
  if (target.includes('spc')) return { value: 'olympiad-spc', label: 'SPC' }

  // 2. Edexcel IAL Unit 1..6
  const uMatch = target.match(/(?:_u|unit[_\s]?)(\d)/i) || target.match(/wph1?(\d)/i)
  if (uMatch) {
    const uNum = uMatch[1]
    return { value: `u${uNum}`, label: `Unit ${uNum}` }
  }

  // 3. Edexcel IGCSE 1P / 2P
  const igMatch = target.match(/(?:_qp_|_)([12]p)(?:\.pdf|$|_|\s)/i) || target.match(/4ph1[_\s]?([12]p)/i)
  if (igMatch) {
    const p = igMatch[1].toUpperCase()
    return { value: igMatch[1].toLowerCase(), label: `Paper ${p}` }
  }

  // 4. AQA UK / IAL
  const aqaMatch = target.match(/aqa[_-](?:ial|ukal|ukgcse)[_-].*?[_-](?:qp|ms)[_-]([a-z0-9]+)/i)
  if (aqaMatch) {
    const code = aqaMatch[1].toLowerCase()
    if (code.startsWith('u')) {
      return { value: code, label: `Unit ${code.slice(1).toUpperCase()}` }
    }
    if (code.startsWith('p')) {
      const pNum = code.slice(1).toUpperCase()
      return { value: code, label: `Paper ${pNum}` }
    }
  }

  // 5. CAIE Components (9702, 0625, 9618, 9709, 9701, etc.)
  let pNum: string | null = null

  // Check image_path folder (e.g. /paper2/ or /paper4/)
  const imgPaperMatch = img.match(/\/paper([1-6])\//i)
  if (imgPaperMatch) {
    pNum = imgPaperMatch[1]
  }

  if (!pNum) {
    const qpMatch = target.match(/_qp_([1-6])\d?/i) || target.match(/_p([1-6])(?:\d|\.pdf|$|_|\s)/i)
    if (qpMatch) {
      pNum = qpMatch[1]
    }
  }

  if (!pNum) {
    // Matches e.g. 0625_w14_22_q23 or 0625_s20_42_q1
    const seasonVariantMatch = target.match(/_[wsmWSM]\d{2}_([1-6])\d/i)
    if (seasonVariantMatch) {
      pNum = seasonVariantMatch[1]
    }
  }

  if (!pNum) {
    // Matches _22_q or _41_q or _12_q in id
    const varQMatch = id.match(/_([1-6])\d_q/i)
    if (varQMatch) {
      pNum = varQMatch[1]
    }
  }

  const is0625 = ser.includes('0625') || fn.includes('0625') || id.includes('0625') || img.includes('0625')

  if (pNum) {
    // CAIE IGCSE 0625: Old syllabus MCQ was named Paper 1, but corresponds to modern Paper 2.
    // Map any 0625 Paper 1 to Paper 2 so there is NO Paper 1 option for 0625.
    if (is0625 && pNum === '1') {
      pNum = '2'
    }
    return { value: `p${pNum}`, label: `Paper ${pNum}` }
  }

  // If paper_type is MCQ and no other pattern matched:
  if (paperType === 'MCQ' || target.includes('mcq')) {
    if (is0625) {
      return { value: 'p2', label: 'Paper 2' }
    }
    return { value: 'p1', label: 'Paper 1' }
  }

  // Fallback
  if (filename) {
    const cleanFn = filename.replace(/\.pdf$/i, '')
    return { value: cleanFn, label: cleanFn }
  }

  return { value: 'all', label: 'All Papers' }
}

export function normalizePaperType(
  rawType?: string,
  filename?: string,
  qid?: string,
  series?: string,
  imagePath?: string
): 'SQ' | 'MCQ' {
  const t = String(rawType || '').trim().toUpperCase()
  if (t === 'MCQ') return 'MCQ'
  if (t === 'SQ') return 'SQ'

  // Extract paper group
  const group = getPaperGroup(filename, qid, rawType, series, imagePath)
  const fn = String(filename || '').toLowerCase()
  const id = String(qid || '').toLowerCase()
  const ser = String(series || '').toLowerCase()

  // CAIE 0625 IGCSE: Paper 1 & 2 are MCQ; Paper 3, 4, 6 are SQ!
  if (ser.includes('0625') || fn.includes('0625') || id.includes('0625')) {
    if (group.value === 'p1' || group.value === 'p2') return 'MCQ'
    if (['p3', 'p4', 'p6'].includes(group.value)) return 'SQ'
  }

  // CAIE 9702 A Level: Paper 1 is MCQ; Paper 2, 3, 4, 5 are SQ!
  if (ser.includes('9702') || fn.includes('9702') || id.includes('9702')) {
    if (group.value === 'p1') return 'MCQ'
    if (['p2', 'p3', 'p4', 'p5'].includes(group.value)) return 'SQ'
  }

  // General fallback by paper component (Paper 2, 3, 4, 5, 6 are SQ)
  if (['p2', 'p3', 'p4', 'p5', 'p6'].includes(group.value)) return 'SQ'
  if (group.value === 'p1') return 'MCQ'

  return 'SQ'
}
