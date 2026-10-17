import { withDemoPatronymic } from './personName';
import { validProfessional } from './profile-details';
import type { ProfessionalProfile } from './profile-details';
import { activeActor } from './access';
import { cState } from './c-types';
import type { Organization } from './b2-types';
import { seedCases, seedDocuments, seedTasks, seedInvitations, enrichedOffer } from '../data/b2-seed';
import { emptyB2 } from './b2-types';
import { seed } from '../data/seed';
import type { Envelope, Entity, Offer } from './types';
import { emptyB1 } from './b1-types';
import type { Profile, Education, Project, Resume, SentApplication, B1Changes, Correction } from './b1-types';
export const b1=(state:Envelope)=>state.changes.b1??emptyB1();
export function dataFor(state:Envelope){
 const changes=b1(state),b2=state.changes.b2??emptyB2();
 return {
  ...seed,
  personas:seed.personas.map(p=>withDemoPatronymic({...p,active:!cState(state).inactive.includes(p.id)})),
  universities:seed.universities.map(u=>({...u,description:cState(state).universityDescription})),
  programs:seed.programs.map(p=>({...p,name:cState(state).programs[p.id]?.name??p.name,skillIds:cState(state).programs[p.id]?.skills??p.skillIds,group:cState(state).programs[p.id]?.group??'Учебная группа'})),
  companies:merge(seed.companies.map((c):Organization=>({...c,description:'Вымышленная строительная компания'})),b2.companies),
  offers:merge(seed.offers.map(enrichedOffer),b2.offers),
  practices:merge(seedCases,b2.practices),
  documents:merge(seedDocuments,Object.fromEntries(b2.documents.map(d=>[d.id,d]))),
  tasks:merge(seedTasks,Object.fromEntries(b2.tasks.map(t=>[t.id,t]))),
  invitations:merge(seedInvitations,Object.fromEntries(b2.invitations.map(i=>[i.id,i]))),
  messages:b2.messages,
  students:[...seed.students.map((s,i):Profile=>({...s,schedule:'Полный день',relocate:false,visibility:'visible',...(changes.profiles[s.id] as Partial<Profile>|undefined),group:cState(state).programs[s.programId]?.group??changes.profiles[s.id]?.group??'Учебная группа',interests:state.changes.interests[s.id]??changes.profiles[s.id]?.interests??s.interests, ...(i===11&&!changes.profiles[s.id]?{region:'',schedule:''}:{})})),...Object.values(cState(state).importedProfiles)].map(withDemoPatronymic),
  education:[...seed.education.map((e,i):Education=>({...e,skills:seed.students[i].skills,history:[],...(changes.education[e.id] as Partial<Education>|undefined)})),...Object.values(cState(state).importedEducation)],
  projects:merge(seed.projects.map(p=>({...p,task:'Планирование учебного строительного объекта',tools:seed.students.find(s=>s.id===p.studentId)!.skills,outcome:'Учебная схема и пояснительная записка',source:'university_demo' as const,programId:seed.students.find(s=>s.id===p.studentId)!.programId})),changes.projects),
  resumes:merge<Resume>(seed.resumes.map((r,i)=>({...r,target:seed.students.find(s=>s.id===r.studentId)!.programId,projectIds:seed.projects.filter(p=>p.studentId===r.studentId).map(p=>p.id),skillClaims:[],status:'ready' as const,primary:i<12,origin:'student' as const})),changes.resumes),
  applications:merge(seed.applications.map(a=>({...a,offerResponse:merge(seedCases,b2.practices).some(p=>p.applicationId===a.id)?'accepted' as const:a.selectionStatus==='offered'?'pending' as const:'none' as const})) as SentApplication[],Object.fromEntries(changes.applications.map(a=>[a.id,a])))
 };
}
function merge<T extends Entity>(base:T[],changed:Record<string,T>):T[]{return [...base.map(item=>changed[item.id]??item),...Object.values(changed).filter(item=>!base.some(e=>e.id===item.id))]}
const at=(s:Envelope)=>s.demoClock+'T12:00:00.000Z';
const id=(prefix:string)=>prefix+'_'+crypto.randomUUID();
function entity(s:Envelope,prefix:string):Entity{return {id:id(prefix),version:1,createdAt:at(s),updatedAt:at(s)}}
function actor(s:Envelope){return activeActor(s)}
function studentActor(s:Envelope){const p=actor(s);if(p.role!=='student'||!p.studentId)throw new Error('Действие доступно только студенту');return p.studentId}
function text(value:string,label:string,max=1200,required=true){if(typeof value!=='string'||value.length>max||required&&!value.trim())throw new Error(`${label}: ${required?'заполните поле, ':''}не более ${max} символов`);return value.trim()}
function update(s:Envelope,mutate:(next:Envelope,c:B1Changes)=>void,type:string,ref:string):Envelope{
 const next=structuredClone(s);next.changes.b1=structuredClone(b1(s));next.revision++;
 mutate(next,next.changes.b1);
 next.changes.b1.events.push({id:id('event'),actorId:s.activePersonaId,type,objectRef:ref,at:at(s),origin:'visitor'});
 return next;
}
function notify(s:Envelope,to:string,message:string,target:string){s.changes.notifications.push({...entity(s,'notification'),recipientId:to,text:message,target,read:false})}
export function saveProfile(s:Envelope,values:Pick<Profile,'region'|'availability'|'schedule'|'relocate'|'visibility'>){const studentId=studentActor(s);const profile=dataFor(s).students.find(p=>p.id===studentId)!;if(values.availability.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)||values.availability[0]>values.availability[1])throw new Error('Укажите корректный период доступности');if(!['Полный день','Гибкий график',''].includes(values.schedule)||!['visible','hidden'].includes(values.visibility)||typeof values.relocate!=='boolean')throw new Error('Некорректные условия профиля');return update(s,(_,c)=>{c.profiles[studentId]={...profile,...values,region:text(values.region,'Регион',100,false),version:profile.version+1,updatedAt:at(s)}},'profile.updated',studentId)}
export function saveProject(s:Envelope,p:Project){const studentId=studentActor(s);const existing=dataFor(s).projects.find(e=>e.id===p.id);if(p.studentId!==studentId||existing&&existing.studentId!==studentId)throw new Error('Недоступен чужой проект');if(existing?.source==='university_demo')throw new Error('Учебный проект из источника вуза доступен только для чтения. Создайте собственное описание.');const item={...p,title:text(p.title,'Название',160),task:text(p.task,'Задача'),contribution:text(p.contribution,'Личный вклад'),outcome:text(p.outcome,'Результат'),tools:p.tools.map(t=>text(t,'Инструмент',80)),source:'student' as const,version:(existing?.version??0)+1,updatedAt:at(s)};if(item.tools.length>12)throw new Error('Не более 12 инструментов');return update(s,(_,c)=>{c.projects[p.id]=item},'project.saved',p.id)}
export function newProject(s:Envelope):Project{return {...entity(s,'project'),studentId:studentActor(s),title:'',task:'',contribution:'',tools:[],outcome:'',source:'student',programId:dataFor(s).students.find(p=>p.id===studentActor(s))!.programId}}
export function createResume(s:Envelope){const studentId=studentActor(s);const r:Resume={...entity(s,'resume'),studentId,title:'Новое резюме',target:'ПТО',summary:'',projectIds:[],skillClaims:[],status:'draft',primary:false,origin:'student'};return {state:update(s,(_,c)=>{c.resumes[r.id]=r},'resume.created',r.id),id:r.id}}
export function saveResume(s:Envelope,r:Resume){const studentId=studentActor(s),data=dataFor(s),existing=data.resumes.find(e=>e.id===r.id);if(!existing||existing.studentId!==studentId||r.studentId!==studentId)throw new Error('Резюме недоступно');if(!['draft','ready'].includes(r.status)||!['ПТО','BIM/ТИМ','Сметное дело','Проектирование'].includes(r.target))throw new Error('Укажите траекторию и статус');if(r.projectIds.some(id=>!data.projects.some(p=>p.id===id&&p.studentId===studentId)))throw new Error('Можно включить только свои проекты');if(r.skillClaims.length>12||r.projectIds.length>12)throw new Error('Не более 12 навыков и проектов');const item={...r,title:text(r.title,'Название',160),summary:text(r.summary,'Самоописание',3000,r.status==='ready'),...(r.experienceSummary===undefined?{}:{experienceSummary:text(r.experienceSummary,'Учебный опыт',3000,false)}),skillClaims:r.skillClaims.map(t=>text(t,'Навык',80)),version:existing.version+1,updatedAt:at(s)};return update(s,(_,c)=>{c.resumes[r.id]=item},'resume.saved',r.id)}
export function primaryResume(s:Envelope,resumeId:string){const studentId=studentActor(s),list=dataFor(s).resumes.filter(r=>r.studentId===studentId);if(!list.some(r=>r.id===resumeId))throw new Error('Резюме недоступно');return update(s,(_,c)=>{list.forEach(r=>{c.resumes[r.id]={...r,primary:r.id===resumeId,version:r.version+1,updatedAt:at(s)}})},'resume.primary',resumeId)}
export const correctionFields=(e:Education)=>e.disciplines.flatMap((d,i)=>[{path:`disciplines.${i}.name`,label:`Дисциплина: ${d.name}`},{path:`disciplines.${i}.result`,label:`Результат: ${d.name}`}]);
export function fieldValue(e:Education,path:string){const m=/^disciplines\.(\d+)\.(name|result)$/.exec(path);if(!m||!e.disciplines[Number(m[1])])throw new Error('Неизвестное образовательное поле');return e.disciplines[Number(m[1])][m[2] as 'name'|'result']}
function applyField(e:Education,path:string,value:string){fieldValue(e,path);const [,index,key]=path.split('.');e.disciplines[Number(index)][key as 'name'|'result']=value}
export function requestCorrection(s:Envelope,path:string,value:string,reason:string){const studentId=studentActor(s),e=dataFor(s).education.find(e=>e.studentId===studentId)!;const oldValue=fieldValue(e,path);if(b1(s).corrections.some(r=>r.recordId===e.id&&r.fieldPath===path&&r.status==='pending'))throw new Error('Запрос по этому полю уже ожидает решения');const proposedValue=text(value,'Предложенное значение',160);if(oldValue===proposedValue)throw new Error('Новое значение совпадает с текущим');const r:Correction={...entity(s,'correction'),studentId,recordId:e.id,fieldPath:path,oldValue,recordVersion:e.version,proposedValue,reason:text(reason,'Причина',600),status:'pending'};return update(s,(next,c)=>{c.corrections.push(r);notify(next,'coordinator_mgsu_demo','Новый запрос исправления образовательных сведений','/university/students/'+studentId)},'education.requested',r.id)}
export function resolveCorrection(s:Envelope,requestId:string,approved:boolean,reason:string){const persona=actor(s);if(persona.role!=='coordinator'||persona.organizationId!=='university_mgsu_demo')throw new Error('Решение доступно координатору МГСУ');const r=b1(s).corrections.find(r=>r.id===requestId);if(!r||r.status!=='pending')throw new Error('Запрос уже рассмотрен или не найден');const data=dataFor(s),e=data.education.find(e=>e.id===r.recordId)!,student=data.students.find(p=>p.id===r.studentId);if(student?.universityId!==persona.organizationId)throw new Error('Чужой вуз');if(approved&&fieldValue(e,r.fieldPath)!==r.oldValue)throw new Error('Поле уже изменилось. Отклоните устаревший запрос с пояснением.');const resolution=text(reason,'Пояснение решения',600);return update(s,(next,c)=>{const request=c.corrections.find(q=>q.id===requestId)!;request.status=approved?'approved':'rejected';request.resolution=resolution;request.version++;request.updatedAt=at(s);if(approved){const record=structuredClone(e);applyField(record,r.fieldPath,r.proposedValue);record.version++;record.updatedAt=at(s);record.history.push({requestId,fieldPath:r.fieldPath,oldValue:r.oldValue,newValue:r.proposedValue,at:at(s),resolution});c.education[e.id]=record}const recipient=seed.personas.find(p=>p.studentId===r.studentId)?.id;if(recipient)notify(next,recipient,approved?'Исправление образовательных сведений принято':'Запрос исправления отклонён','/student/education/history')},'education.resolved',r.id)}
export function isPublic(offer:Offer,state?:Envelope){return offer.status==='published'&&(state?dataFor(state).companies:seed.companies).find(c=>c.id===offer.companyId)?.status==='approved'}
export function submitApplication(s:Envelope,offerId:string,resumeId:string,consent:boolean){const studentId=studentActor(s),data=dataFor(s),offer=data.offers.find(o=>o.id===offerId),r=data.resumes.find(r=>r.id===resumeId);const existing=data.applications.find(a=>a.studentId===studentId&&a.offerId===offerId&&!['rejected','withdrawn'].includes(a.selectionStatus));if(existing)return {state:s,id:existing.id};if(!offer||!isPublic(offer,s))throw new Error('Предложение недоступно');if(offer.endDate<s.demoClock)throw new Error('Набор завершён. Новый отклик недоступен');if(offer.kind==='practice'&&offer.capacity-data.practices.filter(p=>p.offerId===offerId&&p.reservationActive).length<=0)throw new Error('Свободных мест нет');if(!r||r.studentId!==studentId||r.status!=='ready')throw new Error('Выберите готовое собственное резюме');if(!consent)throw new Error('Подтвердите передачу выбранного резюме');const application:SentApplication={...entity(s,'application'),studentId,offerId,selectionStatus:'submitted',offerResponse:'none',resumeId,resumeSnapshot:structuredClone(r),educationSnapshot:structuredClone(data.education.find(e=>e.studentId===studentId)!),projectSnapshot:structuredClone(data.projects.filter(p=>r.projectIds.includes(p.id))),history:[{at:at(s),text:'Студент направил отклик и выбранную версию резюме'}]};return {state:update(s,(next,c)=>{c.applications.push(application);const employer=seed.personas.find(p=>p.role==='employer'&&p.organizationId===offer.companyId);if(employer)notify(next,employer.id,'Новый отклик на '+offer.title,'/employer/applications/'+application.id);notify(next,s.activePersonaId,'Отклик отправлен: '+offer.title,'/student/applications/'+application.id)},'application.submitted',application.id),id:application.id}}
export function withdrawApplication(s:Envelope,id:string){const studentId=studentActor(s),a=dataFor(s).applications.find(a=>a.id===id);if(!a||a.studentId!==studentId)throw new Error('Отклик недоступен');if(['withdrawn','rejected'].includes(a.selectionStatus)||a.offerResponse==='accepted'||dataFor(s).practices.some(p=>p.applicationId===a.id))throw new Error('Отклик нельзя отозвать');return update(s,(next,c)=>{c.applications=c.applications.filter(e=>e.id!==id);c.applications.push({...a,version:a.version+1,updatedAt:at(s),selectionStatus:'withdrawn',history:[...(a.history??[]),{at:at(s),text:'Студент отозвал отклик'}]});const companyId=dataFor(s).offers.find(o=>o.id===a.offerId)!.companyId;const employer=seed.personas.find(p=>p.organizationId===companyId&&p.role==='employer');if(employer)notify(next,employer.id,'Студент отозвал отклик','/employer/applications/'+id)},'application.withdrawn',id)}
export function favoriteIds(s:Envelope){return s.changes.favoritesByUser?.[s.activePersonaId]??[]}
export function toggleFavorite(s:Envelope,offerId:string){studentActor(s);const list=favoriteIds(s);if(!list.includes(offerId)&&!dataFor(s).offers.some(o=>o.id===offerId&&isPublic(o,s)))throw new Error('Предложение недоступно');return update(s,next=>{next.changes.favoritesByUser??={};next.changes.favoritesByUser[s.activePersonaId]=list.includes(offerId)?list.filter(id=>id!==offerId):[...list,offerId]},'favorite.toggled',offerId)}
export function saveSearch(s:Envelope,url:string,title:string){studentActor(s);if(!/^\/(practices|jobs)(\?|$)/.test(url)||url.length>2000)throw new Error('Некорректный поисковый запрос');if(b1(s).searches.some(q=>q.userId===s.activePersonaId&&q.url===url))return s;return update(s,(_,c)=>{c.searches.push({id:id('search'),userId:s.activePersonaId,url,title:text(title,'Название поиска',160)})},'search.saved',url)}
export function deleteSearch(s:Envelope,id:string){studentActor(s);return update(s,(_,c)=>{c.searches=c.searches.filter(q=>!(q.id===id&&q.userId===s.activePersonaId))},'search.deleted',id)}
export function rememberSearch(s:Envelope,path:string,url:string){return update(s,(_,c)=>{c.lastSearch[path]=url},'search.changed',path)}
export function markNotification(s:Envelope,id:string){return update(s,next=>{const n=next.changes.notifications.find(n=>n.id===id&&n.recipientId===s.activePersonaId);if(!n)throw new Error('Уведомление недоступно');n.read=true},'notification.read',id)}









export function saveProfessional(s:Envelope,details:ProfessionalProfile){
 const studentId=studentActor(s),profile=dataFor(s).students.find(p=>p.id===studentId)!;
 if(!validProfessional(details))throw new Error('Проверьте поля: даты, email, обязательные названия и ограничения длины.');
 return update(s,(_,c)=>{c.profiles[studentId]={...profile,professional:structuredClone(details),version:profile.version+1,updatedAt:at(s)}},'profile.professional.updated',studentId);
}
