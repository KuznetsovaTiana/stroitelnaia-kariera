import type { Envelope,Role } from './types';
import type { Case } from './b2-types';
import { dataFor } from './b1';
import { latestDocuments } from './b2';
export function practiceGuidance(state:Envelope,c:Case,role:Role){
 const docs=latestDocuments(state,c.id),returned=docs.filter(d=>d.status==='changes_requested'),pending=docs.filter(d=>d.status==='in_review');
 let status:string,now:string,owner:string,action:string,next:string;
 if(c.status==='cancelled')return {status:'Практика отменена',now:'Продолжение этого дела недоступно.',owner:'Никто',action:'Выберите другое предложение, если практика ещё нужна.',next:'Новый отклик'};
 if(c.status==='completed')return {status:c.academicResult==='credited'?'Практика зачтена':'Практика завершена без зачёта',now:'Итог зафиксирован координатором.',owner:'Никто',action:'Ознакомьтесь с итогом и сохраните документы.',next:'Процесс завершён'};
 if(returned.length||c.status==='changes_requested'){status='Нужны исправления';now='Есть замечания к делу или документам.';owner='Студент';action=role==='student'?'Исправьте условия и сформируйте новую версию документа.':'Ожидайте исправлений студента.';next='Повторная проверка актуальной версии'}
 else if(c.status==='awaiting_university'){
 status=c.submittedToUniversityAt?'На согласовании':'Подготовка документов';
 owner=pending.some(d=>d.type==='agreement'&&!d.reviewSteps.some(r=>r.role==='employer'&&r.decision==='approved'))?'Компания':c.submittedToUniversityAt?'Координатор МГСУ':'Студент';
 now=c.submittedToUniversityAt?'Дело отправлено в вуз.':'Дело создано, место зарезервировано.';
 action=owner==='Студент'?(role==='student'?'Заполните примечание, сформируйте документы и направьте версии на проверку.':'Ожидайте подготовки документов студентом.'):owner==='Компания'?(role==='employer'?'Проверьте договор и оставьте решение по версии.':'Ожидайте проверки договора компанией.'):(role==='coordinator'?'Проверьте обязательные документы и согласуйте практику.':'Ожидайте согласования координатором.');next='Согласование и подтверждение начала';
 }else if(c.status==='approved'){status='Практика согласована';owner='Координатор МГСУ';now=state.demoClock<c.offerSnapshot.startDate?'Ожидается дата начала: '+c.offerSnapshot.startDate:'Дата начала наступила.';action=role==='coordinator'?'Подтвердите начало в допустимую учебную дату.':'От вас сейчас ничего не требуется.';next='Практика и задания'}
 else if(c.status==='in_progress'){status='Идёт практика';const submitted=dataFor(state).tasks.some(t=>t.practiceId===c.id&&t.status==='submitted');owner=submitted?'Руководитель компании':'Студент';now=submitted?'Результат задания направлен компании.':'Выполняются учебные задания.';action=role==='student'?'Выполните задания; подготовьте отчёт к завершению.':role==='employer'?'Выдайте задание или проверьте направленный результат.':'Следите за учебным процессом.';next='Отчёт и отзыв компании'}
 else{status='Проверка отчёта';owner=docs.some(d=>d.type==='report'&&d.reviewSteps.some(r=>r.role==='employer'&&r.decision==='approved'))?'Координатор МГСУ':'Компания';now='Отчёт подготовлен; итог ещё не зафиксирован.';action=role==='coordinator'?'Проверьте отчёт после отзыва компании и зафиксируйте итог.':role==='employer'?'Проверьте отчёт и оставьте отзыв.':'Ожидайте проверки отчёта.';next='Зачёт или завершение без зачёта'}
 return {status,now,owner,action,next};
}
