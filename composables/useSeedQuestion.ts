import seedsData from './seedsData.json'
import { groupQuestionsData, type QuestionGroup } from '~/composables/useSubjectPool'

export interface SeedQuestionData {
  primaryQuestion: any
  groupQuestions: any[]
}

export function getSubjectSeedGroups(subjectId: string): QuestionGroup[] {
  const rows = (seedsData as Record<string, any[]>)[subjectId]
  if (rows && rows.length > 0) {
    return groupQuestionsData(rows)
  }
  return []
}

export function getSubjectSeedRows(subjectId: string): any[] {
  return (seedsData as Record<string, any[]>)[subjectId] || []
}

export function getSubjectSeedQuestion(subjectId: string): SeedQuestionData | null {
  const groups = getSubjectSeedGroups(subjectId)
  if (groups.length > 0) {
    return {
      primaryQuestion: groups[0].primaryQuestion,
      groupQuestions: groups[0].subQuestions
    }
  }
  return null
}
