import type { AIRequest, AIAnswer } from '../shared/aiContract.ts';
/** Explicit opt-in development mode. No pretend thinking delay and no automatic live fallback. */
export function mockAI(request:AIRequest):AIAnswer{
 const target=request.action==='resume_experience'||request.target==='experience'?'experience':'about';
 if(request.action==='improve_text'&&request.draft?.trim())return {type:'result',message:'Демонстрационный режим: текст сохранён без добавления фактов.',content:{[target]:request.draft.trim()}};
 const facts=request.history.filter(m=>m.role==='user').map(m=>m.content).concat(request.message);
 if(facts.length<2)return {type:'question',message:target==='about'?'Какие строительные задачи вам интересны и что вы уже пробовали делать сами?':'Расскажите об одном реальном учебном проекте: что сделали лично вы, какими инструментами и какой получили результат?'};
 return {type:'result',message:'Демонстрационный режим: черновик из ваших сообщений. Проверьте формулировки.',content:{[target]:facts.join('\n\n').slice(0,3000)}};
}
