export const AI_ACTIONS=['resume_about','resume_experience','improve_text'] as const;
export type AIAction=typeof AI_ACTIONS[number];
export type AIMode='mock'|'live';
export interface AIMessage {role:'user'|'assistant';content:string}
export interface AIContext {university:string;educationProgram:string;course:number;disciplines:string[];verifiedSkills:string[];source:'university_demo'}
export interface AIRequest {action:AIAction;message:string;history:AIMessage[];profileContext:AIContext;target?:'about'|'experience';draft?:string}
export type AIAnswer={type:'question';message:string}|{type:'result';message:string;content:{about?:string;experience?:string}};
export interface AIResponse {mode:AIMode;answer:AIAnswer}
export interface AIAvailability {mode:AIMode;available:boolean}
export const AI_UNAVAILABLE='ИИ-помощник сейчас недоступен. Остальные функции демонстрационной версии продолжают работать.';
export function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)}
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length<=max;
const only=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).every(k=>keys.includes(k));
export function validAIRequest(v:unknown):v is AIRequest{
 if(!record(v)||!only(v,['action','message','history','profileContext','target','draft'])||!AI_ACTIONS.includes(v.action as AIAction)||!text(v.message,2000)||!v.message.trim()||!Array.isArray(v.history)||v.history.length>16)return false;
 if(!v.history.every(m=>record(m)&&only(m,['role','content'])&&['user','assistant'].includes(String(m.role))&&text(m.content,3000)))return false;
 if(v.action==='resume_about'&&v.target!==undefined&&v.target!=='about'||v.action==='resume_experience'&&v.target!==undefined&&v.target!=='experience')return false;
 if(v.action==='improve_text'&&(!['about','experience'].includes(String(v.target))||!text(v.draft,3000)||!v.draft.trim()))return false;
 const c=v.profileContext;
 return record(c)&&only(c,['university','educationProgram','course','disciplines','verifiedSkills','source'])&&c.source==='university_demo'&&text(c.university,160)&&text(c.educationProgram,160)&&Number.isInteger(c.course)&&Number(c.course)>=1&&Number(c.course)<=6&&
 [c.disciplines,c.verifiedSkills].every(xs=>Array.isArray(xs)&&xs.length<=20&&xs.every(x=>text(x,160)))&&
 (v.target===undefined||['about','experience'].includes(String(v.target)))&&(v.draft===undefined||text(v.draft,3000))&&
 JSON.stringify(v.history).length<=12000&&JSON.stringify(c).length<=5000;
}
export function validAIAnswer(v:unknown):v is AIAnswer{
 if(!record(v)||!text(v.message,1000)||!v.message.trim())return false;
 if(v.type==='question')return only(v,['type','message']);
 return v.type==='result'&&only(v,['type','message','content'])&&record(v.content)&&only(v.content,['about','experience'])&&Object.keys(v.content).length>0&&Object.values(v.content).every(t=>text(t,3000)&&t.trim().length>0);
}
