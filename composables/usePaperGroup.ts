export interface PaperGroupOption {
  value: string
  label: string
}

export function formatPaperGroupLabel(val: string): string {
  if (!val || val === 'All' || val === 'all') return '全部卷种'
  
  const v = val.toLowerCase()
  if (v === 'p1') return 'Paper 1 (MCQ)'
  if (v === 'p2') return 'Paper 2 (AS Structured)'
  if (v === 'p3') return 'Paper 3 (Practical)'
  if (v === 'p4') return 'Paper 4 (A2 Structured)'
  if (v === 'p5') return 'Paper 5 (Planning & Analysis)'
  if (v === 'p6') return 'Paper 6 (Alternative to Practical)'
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
  series: string = ''
): PaperGroupOption {
  const fn = String(filename || '').toLowerCase()
  const id = String(qid || '').toLowerCase()
  const ser = String(series || '').toLowerCase()
  const target = `${fn} ${id} ${ser}`

  // 1. Olympiad
  if (target.includes('physicsbowl')) return { value: 'olympiad-physicsbowl', label: 'PhysicsBowl' }
  if (target.includes('bpho-r1') || target.includes('bpho_r1')) return { value: 'olympiad-bpho-r1', label: 'BPhO-R1' }
  if (target.includes('bpho-r2') || target.includes('bpho_r2')) return { value: 'olympiad-bpho-r2', label: 'BPhO-R2' }
  if (target.includes('baao-r1')) return { value: 'olympiad-baao-r1', label: 'BAAO-R1' }
  if (target.includes('baao-r2')) return { value: 'olympiad-baao-r2', label: 'BAAO-R2' }
  if (target.includes('pat')) return { value: 'olympiad-pat', label: 'PAT' }
  if (target.includes('engaa')) return { value: 'olympiad-engaa', label: 'ENGAA (ESAT)' }
  if (target.includes('nsaa')) return { value: 'olympiad-nsaa', label: 'NSAA (ESAT)' }
  if (target.includes('spc')) return { value: 'olympiad-spc', label: 'SPC' }

  // 2. Edexcel IAL Unit 1..6
  const uMatch = target.match(/(?:_u|unit[_\s]?)(\d)/i) || target.match(/wph1?(\d)/i)
  if (uMatch) {
    const uNum = uMatch[1]
    return { value: `u${uNum}`, label: `Unit ${uNum}` }
  }

  // 3. Edexcel IGCSE 1P / 2P
  const igMatch = target.match(/(?:_qp_|_)([12]p)(?:\.pdf|$|_)/i) || target.match(/4ph1[_\s]?([12]p)/i)
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
      return { value: code, label: `Paper ${code.slice(1).toUpperCase()}` }
    }
  }

  // 5. CAIE Components (9702, 0625, 9618, 9709, 9701, etc.)
  const caieQpMatch = target.match(/_qp_([1-6])\d?/i) || target.match(/_p([1-6])(?:\d|\.pdf|$|_)/i) || target.match(/_\d{2}_([1-6])\d(?:\.pdf|$|_)/i)
  if (caieQpMatch) {
    const pNum = caieQpMatch[1]
    const labels: Record<string, string> = {
      '1': 'Paper 1 (MCQ)',
      '2': 'Paper 2 (AS Structured)',
      '3': 'Paper 3 (Practical)',
      '4': 'Paper 4 (A2 Structured)',
      '5': 'Paper 5 (Planning & Analysis)',
      '6': 'Paper 6 (Alternative to Practical)'
    }
    return { value: `p${pNum}`, label: labels[pNum] || `Paper ${pNum}` }
  }

  // If paper_type is MCQ and no other pattern matched, default to Paper 1
  if (paperType === 'MCQ' || target.includes('mcq')) {
    return { value: 'p1', label: 'Paper 1 (MCQ)' }
  }

  // Fallback
  if (filename) {
    const cleanFn = filename.replace(/\.pdf$/i, '')
    return { value: cleanFn, label: cleanFn }
  }

  return { value: 'all', label: '全部卷种' }
}
