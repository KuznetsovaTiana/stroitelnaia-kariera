import { validProfessional } from '../domain/profile-details';
import { seed } from '../data/seed';
import type { B1Changes } from '../domain/b1-types';
// Validate persisted collections before they reach forms or domain operations.
export function validB1(value:unknown):value is B1Changes {
 const obj=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
 const str=(v:unknown,max=4000):v is string=>typeof v==='string'&&v.length<=max;
 const strings=(v:unknown)=>Array.isArray(v)&&v.length<=100&&v.every(x=>str(x));
 const list=(v:unknown,test:(x:Record<string,unknown>)=>boolean)=>Array.isArray(v)&&v.length<=3000&&v.every(x=>obj(x)&&test(x));
 const map=(v:unknown,test:(x:Record<string,unknown>)=>boolean)=>obj(v)&&Object.keys(v).length<=1000&&Object.values(v).every(x=>obj(x)&&test(x));
 const entity=(v:Record<string,unknown>)=>str(v.id)&&Number.isInteger(v.version)&&Number(v.version)>0&&str(v.createdAt)&&str(v.updatedAt);
 if(!obj(value))return false;
 for(const key of ['profiles','education','projects','resumes']){const collection=value[key];if(!obj(collection)||!Object.entries(collection).every(([id,item])=>obj(item)&&item.id===id))return false}
 if(!Object.values(value.education as Record<string,unknown>).every(item=>obj(item)&&seed.education.some(e=>e.id===item.id&&e.studentId===item.studentId)))return false;
 if(!Object.values(value.profiles as Record<string,unknown>).every(item=>obj(item)&&seed.students.some(s=>s.id===item.id&&s.universityId===item.universityId)))return false;
 return map(value.profiles,v=>(v.professional===undefined||validProfessional(v.professional))&&entity(v)&&str(v.name)&&str(v.studentId??'')&&str(v.universityId)&&str(v.programId)&&typeof v.course==='number'&&str(v.region)&&str(v.interests)&&strings(v.skills)&&Array.isArray(v.availability)&&v.availability.length===2&&v.availability.every(x=>str(x))&&str(v.schedule)&&typeof v.relocate==='boolean'&&['visible','hidden'].includes(String(v.visibility)))&&
 map(value.education,v=>entity(v)&&str(v.studentId)&&v.source==='university_demo'&&str(v.sourceDate)&&strings(v.skills)&&Array.isArray(v.disciplines)&&v.disciplines.length>0&&list(v.disciplines,d=>str(d.name)&&str(d.result))&&list(v.history,h=>str(h.requestId)&&str(h.fieldPath)&&str(h.oldValue)&&str(h.newValue)&&str(h.at)&&str(h.resolution)))&&
 map(value.projects,v=>entity(v)&&str(v.studentId)&&str(v.title)&&str(v.task)&&str(v.contribution)&&strings(v.tools)&&str(v.outcome)&&str(v.programId)&&['student','university_demo'].includes(String(v.source)))&&
 map(value.resumes,v=>entity(v)&&str(v.studentId)&&str(v.title)&&['ПТО','BIM/ТИМ','Сметное дело','Проектирование'].includes(String(v.target))&&str(v.summary)&&strings(v.projectIds)&&strings(v.skillClaims)&&['draft','ready'].includes(String(v.status))&&typeof v.primary==='boolean'&&['student','scripted_assistant'].includes(String(v.origin)))&&
 list(value.corrections,v=>entity(v)&&str(v.studentId)&&str(v.recordId)&&str(v.fieldPath)&&str(v.oldValue)&&str(v.proposedValue)&&str(v.reason)&&Number.isInteger(v.recordVersion)&&['pending','approved','rejected'].includes(String(v.status))&&(v.resolution===undefined||str(v.resolution)))&&
 list(value.applications,v=>entity(v)&&str(v.studentId)&&str(v.offerId)&&['submitted','viewed','info_requested','interview','offered','rejected','withdrawn'].includes(String(v.selectionStatus))&&obj(v.resumeSnapshot)&&str(v.resumeSnapshot.title)&&str(v.resumeSnapshot.summary)&&Number.isInteger(v.resumeSnapshot.version)&&(v.history===undefined||list(v.history,h=>str(h.at)&&str(h.text)))&&(v.projectSnapshot===undefined||list(v.projectSnapshot,p=>entity(p)&&str(p.title)&&str(p.studentId)&&str(p.contribution)&&strings(p.tools)))&&(v.educationSnapshot===undefined||obj(v.educationSnapshot)&&entity(v.educationSnapshot)&&list(v.educationSnapshot.disciplines,d=>str(d.name)&&str(d.result))&&strings(v.educationSnapshot.skills)))&&
 list(value.events,v=>str(v.id)&&str(v.actorId)&&str(v.type)&&str(v.objectRef)&&str(v.at)&&v.origin==='visitor')&&
 list(value.searches,v=>str(v.id)&&str(v.userId)&&str(v.title)&&str(v.url,2000)&&/^\/(practices|jobs)(\?|$)/.test(String(v.url)))&&
 obj(value.lastSearch)&&Object.values(value.lastSearch).every(v=>str(v,2000)&&/^\/(practices|jobs)(\?|$)/.test(v))&&
 map(value.assistant,v=>['ПТО','BIM/ТИМ','Сметное дело','Проектирование'].includes(String(v.branch))&&Array.isArray(v.answers)&&v.answers.length===6&&v.answers.every(a=>str(a,600))&&str(v.preview,3000)&&typeof v.simulateError==='boolean'&&Number.isInteger(v.step)&&Number(v.step)>=0&&Number(v.step)<=5);
}


