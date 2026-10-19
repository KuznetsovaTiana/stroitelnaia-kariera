
import type { Envelope } from './types';
import { dataFor } from './b1';
import { latestDocuments, submitDocument, who } from './b2';
export function submitDocumentBundle(state: Envelope, id: string) {
  const practice = dataFor(state).practices.find(candidatePractice => candidatePractice.id === id);
  if (!practice || who(state).role !== 'student' || who(state).studentId !== practice.studentId) throw new Error('Комплект недоступен текущему персонажу');
  const latest = latestDocuments(state, id);
  const required = practice.requirementSnapshot.requiredDocuments.map(type => latest.find(candidateDocument => candidateDocument.type === type));
  if (required.some(candidateDocument => !candidateDocument)) throw new Error('Сначала сформируйте все обязательные документы');
  if (required.some(candidateDocument => candidateDocument!.conditionsVersion !== practice.conditionsVersion)) throw new Error('Условия изменились. Сформируйте актуальные версии обязательных документов');
  if (required.some(candidateDocument => candidateDocument!.status === 'changes_requested')) throw new Error('Исправьте возвращённые документы и сформируйте новые версии');
  return required.filter(candidateDocument => candidateDocument!.status === 'draft').reduce((next, candidateDocument) => submitDocument(next, candidateDocument!.id), state);
}
