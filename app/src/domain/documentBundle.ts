import type { Envelope } from './types';
import { dataFor } from './b1';
import { latestDocuments,submitDocument,who } from './b2';
export function submitDocumentBundle(state:Envelope,id:string){
 const c=dataFor(state).practices.find(c=>c.id===id);
 if(!c||who(state).role!=='student'||who(state).studentId!==c.studentId)throw new Error('Комплект недоступен текущему персонажу');
 const latest=latestDocuments(state,id),required=c.requirementSnapshot.requiredDocuments.map(type=>latest.find(d=>d.type===type));
 if(required.some(d=>!d))throw new Error('Сначала сформируйте все обязательные документы');
 if(required.some(d=>d!.conditionsVersion!==c.conditionsVersion))throw new Error('Условия изменились. Сформируйте актуальные версии обязательных документов');
 if(required.some(d=>d!.status==='changes_requested'))throw new Error('Исправьте возвращённые документы и сформируйте новые версии');
 return required.filter(d=>d!.status==='draft').reduce((next,d)=>submitDocument(next,d!.id),state);
}
