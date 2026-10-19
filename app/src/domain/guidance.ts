import type { Envelope, Role } from './types';
import type { Case } from './b2-types';
import { dataFor } from './b1';
import { latestDocuments } from './b2';
export function practiceGuidance(
  state: Envelope,
  practice: Case,
  role: Role
) {
  const docs = latestDocuments(state, practice.id);
  const returned = docs.filter(candidateDocument => candidateDocument.status === 'changes_requested');
  const pending = docs.filter(candidateDocument => candidateDocument.status === 'in_review');
  let status: string;
  let now: string;
  let owner: string;
  let action: string;
  let next: string;
  if (practice.status === 'cancelled') return {
    status: 'Практика отменена',
    now: 'Продолжение этого дела недоступно.',
    owner: 'Никто',
    action: 'Выберите другое предложение, если практика ещё нужна.',
    next: 'Новый отклик'
  };
  if (practice.status === 'completed') return {
    status: practice.academicResult === 'credited' ? 'Практика зачтена' : 'Практика завершена без зачёта',
    now: 'Итог зафиксирован координатором.',
    owner: 'Никто',
    action: 'Ознакомьтесь с итогом и сохраните документы.',
    next: 'Процесс завершён'
  };
  if (returned.length || practice.status === 'changes_requested') {
    status = 'Нужны исправления';
    now = 'Есть замечания к делу или документам.';
    owner = 'Студент';
    action = role === 'student'
      ? 'Исправьте условия и сформируйте новую версию документа.'
      : 'Ожидайте исправлений студента.';
    next = 'Повторная проверка актуальной версии';
  }
  else if (practice.status === 'awaiting_university') {
    status = practice.submittedToUniversityAt ? 'На согласовании' : 'Подготовка документов';
    owner = pending.some(candidateDocument => candidateDocument.type === 'agreement' && !candidateDocument.reviewSteps.some(r => r.role === 'employer' && r.decision === 'approved'))
      ? 'Компания'
      : practice.submittedToUniversityAt ? 'Координатор МГСУ' : 'Студент';
    now = practice.submittedToUniversityAt ? 'Дело отправлено в вуз.' : 'Дело создано, место зарезервировано.';
    action = owner === 'Студент'
      ? (role === 'student'
        ? 'Заполните примечание, сформируйте документы и направьте версии на проверку.'
        : 'Ожидайте подготовки документов студентом.')
      : owner === 'Компания'
        ? (role === 'employer'
          ? 'Проверьте договор и оставьте решение по версии.'
          : 'Ожидайте проверки договора компанией.')
        : (role === 'coordinator'
          ? 'Проверьте обязательные документы и согласуйте практику.'
          : 'Ожидайте согласования координатором.');
    next = 'Согласование и подтверждение начала';
  } else if (practice.status === 'approved') {
    status = 'Практика согласована';
    owner = 'Координатор МГСУ';
    now = state.demoClock < practice.offerSnapshot.startDate
      ? 'Ожидается дата начала: ' + practice.offerSnapshot.startDate
      : 'Дата начала наступила.';
    action = role === 'coordinator'
      ? 'Подтвердите начало в допустимую учебную дату.'
      : 'От вас сейчас ничего не требуется.';
    next = 'Практика и задания';
  }
  else if (practice.status === 'in_progress') {
    status = 'Идёт практика';
    const submitted = dataFor(state).tasks.some(candidateTask => candidateTask.practiceId === practice.id && candidateTask.status === 'submitted');
    owner = submitted ? 'Руководитель компании' : 'Студент';
    now = submitted ? 'Результат задания направлен компании.' : 'Выполняются учебные задания.';
    action = role === 'student'
      ? 'Выполните задания; подготовьте отчёт к завершению.'
      : role === 'employer'
        ? 'Выдайте задание или проверьте направленный результат.'
        : 'Следите за учебным процессом.';
    next = 'Отчёт и отзыв компании';
  }
  else {
    status = 'Проверка отчёта';
    owner = docs.some(candidateDocument => candidateDocument.type === 'report' && candidateDocument.reviewSteps.some(r => r.role === 'employer' && r.decision === 'approved'))
      ? 'Координатор МГСУ'
      : 'Компания';
    now = 'Отчёт подготовлен; итог ещё не зафиксирован.';
    action = role === 'coordinator'
      ? 'Проверьте отчёт после отзыва компании и зафиксируйте итог.'
      : role === 'employer' ? 'Проверьте отчёт и оставьте отзыв.' : 'Ожидайте проверки отчёта.';
    next = 'Зачёт или завершение без зачёта';
  }
  return {
    status,
    now,
    owner,
    action,
    next
  };
}
