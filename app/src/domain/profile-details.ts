export type ProfileSource='student'|'university'|'employer';
export interface PersonalExperience {company:string;position:string;start:string;end:string;description:string;skills:string[];source:'student'}
export interface Achievement {title:string;description:string;source:'student'}
export interface Language {name:string;level:string;source:'student'}
export interface ProfessionalProfile {
 about?:string;
 experienceSummary?:string;
 textSources?:{about?:'student'|'ai_assisted'|'mock_assisted';experienceSummary?:'student'|'ai_assisted'|'mock_assisted'};
 searchStatus:'Открыт к предложениям'|'Ищу стажировку'|'Ищу работу'|'Ищу практику';
 employment:''|'Практика'|'Стажировка'|'Работа';
 workFormat:''|'Офис'|'Гибрид'|'Удалённо'|'На объекте';
 directions:string[];
 experience:PersonalExperience[];
 selfSkills:string[];
 achievements:Achievement[];
 languages:Language[];
 contacts:{phone:string;email:string;telegram:string};
}
export const emptyProfessional=():ProfessionalProfile=>({searchStatus:'Открыт к предложениям',employment:'',workFormat:'',directions:[],experience:[],selfSkills:[],achievements:[],languages:[],contacts:{phone:'',email:'',telegram:''}});
export function validProfessional(v:unknown):v is ProfessionalProfile{
 const obj=(x:unknown):x is Record<string,unknown>=>typeof x==='object'&&x!==null&&!Array.isArray(x);
 const text=(x:unknown,max=160):x is string=>typeof x==='string'&&x.length<=max;
 const words=(x:unknown)=>Array.isArray(x)&&x.length<=20&&x.every(s=>text(s,80)&&s.trim().length>0);
 const list=(x:unknown,test:(r:Record<string,unknown>)=>boolean)=>Array.isArray(x)&&x.length<=12&&x.every(r=>obj(r)&&r.source==='student'&&test(r));
 const month=(x:unknown)=>text(x)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(x);
 return obj(v)&&['Открыт к предложениям','Ищу стажировку','Ищу работу','Ищу практику'].includes(String(v.searchStatus))&&['','Практика','Стажировка','Работа'].includes(String(v.employment))&&['','Офис','Гибрид','Удалённо','На объекте'].includes(String(v.workFormat))&&words(v.directions)&&words(v.selfSkills)&&
 list(v.experience,r=>text(r.company)&&!!r.company.trim()&&text(r.position)&&!!r.position.trim()&&month(r.start)&&(r.end===''||month(r.end)&&String(r.end)>=String(r.start))&&text(r.description,1200)&&words(r.skills))&&
 list(v.achievements,r=>text(r.title)&&!!r.title.trim()&&text(r.description,600))&&list(v.languages,r=>text(r.name,80)&&!!r.name.trim()&&text(r.level,80)&&!!r.level.trim())&&
 (v.about===undefined||text(v.about,3000))&&(v.experienceSummary===undefined||text(v.experienceSummary,3000))&&
 (v.textSources===undefined||obj(v.textSources)&&Object.keys(v.textSources).every(k=>['about','experienceSummary'].includes(k))&&Object.values(v.textSources).every(s=>['student','ai_assisted','mock_assisted'].includes(String(s))))&&
 obj(v.contacts)&&text(v.contacts.phone,40)&&text(v.contacts.email,120)&&(!v.contacts.email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contacts.email))&&text(v.contacts.telegram,80);
}
