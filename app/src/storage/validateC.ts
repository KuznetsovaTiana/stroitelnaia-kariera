import type { CChanges } from '../domain/c-types';
export function validC(v:unknown):v is CChanges{
 const obj=(x:unknown):x is Record<string,unknown>=>typeof x==='object'&&x!==null&&!Array.isArray(x),str=(x:unknown,max=10000)=>typeof x==='string'&&x.length<=max,strings=(x:unknown)=>Array.isArray(x)&&x.length<=1000&&x.every(t=>str(t));
 const list=(x:unknown,check:(x:Record<string,unknown>)=>boolean)=>Array.isArray(x)&&x.length<=3000&&x.every(t=>obj(t)&&check(t));const map=(x:unknown,check:(x:Record<string,unknown>)=>boolean)=>obj(x)&&Object.values(x).every(t=>obj(t)&&check(t));
 const entity=(x:Record<string,unknown>)=>str(x.id)&&Number.isInteger(x.version)&&Number(x.version)>0&&str(x.createdAt)&&str(x.updatedAt);
 if(!obj(v))return false;
 return list(v.requests,x=>entity(x)&&str(x.companyId)&&str(x.programId)&&str(x.start)&&str(x.end)&&Number.isInteger(x.requested)&&Number.isInteger(x.proposed)&&['pending','answered'].includes(String(x.status))&&str(x.message)&&str(x.response))&&
 list(v.requirements,x=>entity(x)&&str(x.programId)&&str(x.practiceType)&&Number.isInteger(x.minHours)&&Number(x.minHours)>0&&Array.isArray(x.requiredDocuments)&&x.requiredDocuments.length>0&&x.requiredDocuments.every(t=>['agreement','direction','assignment'].includes(t))&&str(x.completionRule))&&
 list(v.templates,x=>entity(x)&&['agreement','direction','assignment','report'].includes(String(x.type))&&str(x.body,3000)&&strings(x.fields))&&
 list(v.tickets,x=>entity(x)&&str(x.authorId)&&str(x.category)&&['offer','company','education','none'].includes(String(x.objectType))&&str(x.objectId)&&['open','in_progress','resolved','closed'].includes(String(x.status))&&list(x.comments,c=>str(c.actorId)&&str(c.text)&&str(c.at)))&&
 list(v.dictionaries,x=>entity(x)&&['direction','skill','profession'].includes(String(x.category))&&str(x.name)&&typeof x.active==='boolean'&&strings(x.skillIds)&&str(x.tasks)&&str(x.programId))&&
 list(v.aiExamples,x=>entity(x)&&str(x.resumeId)&&str(x.branch)&&str(x.text)&&strings(x.facts)&&['pending','approved','needs_revision'].includes(String(x.verdict))&&str(x.comment))&&
 map(v.team,x=>['owner','recruiter','manager','documents'].includes(String(x.subrole))&&strings(x.offerIds))&&strings(v.inactive)&&str(v.universityDescription)&&
 map(v.programs,x=>str(x.name)&&strings(x.skills)&&str(x.group))&&obj(v.content)&&Object.values(v.content).every(x=>str(x,3000))&&map(v.notificationSettings,x=>typeof x.recommendations==='boolean')&&
 list(v.integrationChecks,x=>str(x.id)&&str(x.at)&&typeof x.success==='boolean'&&str(x.message))&&
 list(v.batches,x=>entity(x)&&['ready','invalid','applied'].includes(String(x.status))&&strings(x.appliedIds)&&list(x.rows,r=>Number.isInteger(r.index)&&strings(r.errors)&&(r.row===null||obj(r.row)&&str(r.row.externalId)&&str(r.row.name)&&str(r.row.programId)&&Number.isInteger(r.row.course)&&str(r.row.group)&&strings(r.row.skills)&&list(r.row.disciplines,d=>str(d.name)&&str(d.result)))))&&
 map(v.importedProfiles,x=>entity(x)&&str(x.name)&&str(x.programId)&&Number.isInteger(x.course)&&str(x.universityId)&&str(x.region)&&strings(x.skills)&&strings(x.availability)&&Array.isArray(x.availability)&&x.availability.length===2&&str(x.interests)&&str(x.schedule)&&typeof x.relocate==='boolean'&&['visible','hidden'].includes(String(x.visibility)))&&
 map(v.importedEducation,x=>entity(x)&&str(x.studentId)&&x.source==='university_demo'&&str(x.sourceDate)&&strings(x.skills)&&list(x.disciplines,d=>str(d.name)&&str(d.result))&&Array.isArray(x.history));
}
