import {AI_UNAVAILABLE,record,validAIAnswer,validAIRequest} from '../../shared/aiContract';
import type {AIAvailability,AIRequest,AIResponse} from '../../shared/aiContract';
const endpoint='/.netlify/functions/ai';
async function call(method:string,signal:AbortSignal,body?:AIRequest):Promise<unknown>{
 const response=await fetch(endpoint,{method,signal,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 let value:unknown;try{value=await response.json()}catch{throw new Error(AI_UNAVAILABLE)}
 if(!response.ok)throw new Error(record(value)&&response.status===429?'Лимит запросов временно исчерпан. Попробуйте через минуту.':AI_UNAVAILABLE);
 return value;
}
export const aiService={
 async availability(signal:AbortSignal):Promise<AIAvailability>{const v=await call('GET',signal);if(!record(v)||!['mock','live'].includes(String(v.mode))||typeof v.available!=='boolean')throw new Error(AI_UNAVAILABLE);return v as unknown as AIAvailability},
 async sendResumeMessage(request:AIRequest,signal:AbortSignal):Promise<AIResponse>{
  if(!validAIRequest(request))throw new Error('Диалог достиг ограничения длины. Начните новый диалог, сохранив нужные факты.');
  const v=await call('POST',signal,request);if(!record(v)||!['mock','live'].includes(String(v.mode))||!validAIAnswer(v.answer))throw new Error(AI_UNAVAILABLE);
  const target=request.action==='resume_experience'?'experience':request.action==='resume_about'?'about':request.target;
  if(v.answer.type==='result'&&(!target||!v.answer.content[target]||Object.keys(v.answer.content).length!==1))throw new Error(AI_UNAVAILABLE);
  return v as unknown as AIResponse;
 }
};
