import { withDemoPatronymic } from '../domain/personName';
import { extraEmployees } from '../domain/c-types';
import type { Seed, Entity, Envelope } from '../domain/types';
const at='2026-10-14T09:00:00.000Z';
const entity=(id:string):Entity=>({id,version:1,createdAt:at,updatedAt:at});
const ids=['student_anna_demo','student_ilya_demo','student_maria_demo',...Array.from({length:9},(_,i)=>`student_${i+4}_demo`)];
const names=['Анна Миронова','Илья Соколов','Мария Лебедева','Денис Волков','Ольга Белова','Артём Орлов','Елена Крылова','Павел Зайцев','Дарья Морозова','Максим Лукин','Вера Тихонова','Никита Лазарев'];
export const programs=['ПТО','BIM/ТИМ','Сметное дело','Проектирование'];
const companyIds=['company_sever_demo',...Array.from({length:5},(_,i)=>`company_${i+2}_demo`)];
const caseStudents=[ids[4],ids[2],ids[3],ids[1],ids[6]];
const caseOffers=[0,2,3,1,6];
const offerIds=['offer_pto_demo',...Array.from({length:17},(_,i)=>`offer_${i+2}_demo`)];
export const seed:Seed={
 universities:[{...entity('university_mgsu_demo'),name:'МГСУ',slug:'mgsu',demoOnly:true}],
 programs:programs.map(name=>({...entity(name),universityId:'university_mgsu_demo',name,skillIds:name==='BIM/ТИМ'?['Моделирование']:['Таблицы','График работ']})),
 personas:[{id:'persona_anna',role:'student',name:names[0],firstName:names[0].split(' ')[0],lastName:names[0].split(' ')[1],studentId:ids[0]},{id:'persona_ilya',role:'student',name:names[1],firstName:names[1].split(' ')[0],lastName:names[1].split(' ')[1],studentId:ids[1]},{id:'persona_maria',role:'student',name:names[2],firstName:names[2].split(' ')[0],lastName:names[2].split(' ')[1],studentId:ids[2]},{id:'persona_vera',role:'student',name:names[8],firstName:names[8].split(' ')[0],lastName:names[8].split(' ')[1],studentId:ids[8]},{id:'employer_sever_demo',role:'employer',name:'Алексей Громов · Северный контур',firstName:'Алексей',lastName:'Громов',organizationId:companyIds[0]},{id:'coordinator_mgsu_demo',role:'coordinator',name:'Елена Данилова · МГСУ',firstName:'Елена',lastName:'Данилова',organizationId:'university_mgsu_demo'},{id:'operator_demo',role:'operator',name:'Оператор демонстрации'},...extraEmployees],
 students:ids.map((id,i)=>({...entity(id),name:names[i],firstName:names[i].split(' ')[0],lastName:names[i].split(' ')[1],universityId:'university_mgsu_demo',programId:programs[i%4],course:3+(i%2),region:i%4===3?'Казань':'Москва',interests:i===0?'Хочу разобраться в организации строительных работ и подготовке исполнительной документации.':'Учебные проекты и профессиональный старт',skills:i===1?['Моделирование']:['Таблицы','График работ'],availability:i===1?['2026-10-01','2026-10-30']:i===2?['2026-10-01','2026-10-14']:i===6?['2026-09-01','2026-09-25']:['2026-11-02','2026-11-27']})),
 education:ids.map((studentId,i)=>({...entity(`education_${i}`),studentId,source:'university_demo',sourceDate:'2026-10-12',disciplines:[{name:'Организация строительства',result:'Зачёт'},{name:'Технология строительных процессов',result:'Хорошо'},{name:'Инженерная графика',result:'Отлично'}]})),
 companies:companyIds.map((id,i)=>({...entity(id),name:['Северный контур — демо','Городской каркас — демо','ТИМ-мастерская — демо','Сметный ориентир — демо','Новая площадка — демо','Проектный вектор — демо'][i],status:i<4?'approved':i===4?'pending':'rejected'})),
 offers:offerIds.map((id,i)=>({...entity(id),companyId:companyIds[i%6],kind:i<10?'practice':i<15?'job':'internship',title:i===0?'Практика в отделе ПТО':`${['Организация работ','Моделирование зданий','Подготовка смет','Проектирование конструкций'][i%4]} · ${i<10?'практика':i<15?'стартовая вакансия':'стажировка'}`,programId:programs[i%4],region:i%4===3?'Казань':'Москва',status:i===7?'draft':i===8?'rejected':'published',skills:i%4===1?['Моделирование']:['Таблицы','График работ'],startDate:i===6?'2026-09-01':i===1||i===2?'2026-10-01':'2026-11-02',endDate:i===6?'2026-09-25':i===1?'2026-10-30':i===2?'2026-10-14':'2026-11-27',capacity:i===0?2:3,supervisor:'Демо-наставник'})),
 applications:Array.from({length:14},(_,i)=>({...entity(`application_${i}`),studentId:i<5?caseStudents[i]:ids[1+i%11],offerId:offerIds[i<5?caseOffers[i]:[0,1,2,3,6,9][i%6]],selectionStatus:i<5?'offered':(['submitted','viewed','rejected'] as const)[i%3],resumeSnapshot:{title:'Учебное резюме',summary:'Вымышленный учебный опыт',version:1}})),
 practices:Array.from({length:5},(_,i)=>({...entity(`practice_${i}`),studentId:caseStudents[i],applicationId:`application_${i}`,offerId:offerIds[caseOffers[i]],status:(['approved','review','changes_requested','in_progress','completed'] as const)[i],academicResult:i===4?'credited':'not_assessed',reservationActive:true})),
 resumes:[...ids.map((studentId,i)=>({...entity(`resume_${i}`),studentId,title:`Старт в ${programs[i%4]}`,summary:'Учебный проект, без профессионального стажа'})),{...entity('resume_anna_2'),studentId:ids[0],title:'Организация строительства',summary:'Интерес к планированию работ'}],
 projects:ids.map((studentId,i)=>({...entity(`project_${i}`),studentId,title:`Учебный проект · ${programs[i%4]}`,contribution:i===0?'Подготовила график производства работ и таблицу ресурсов.':'Подготовил фрагмент учебного проекта'}))
};
seed.personas=seed.personas.map(withDemoPatronymic);
seed.students=seed.students.map(withDemoPatronymic);
export const initialState=():Envelope=>({schemaVersion:1,seedVersion:1,revision:0,savedAt:at,demoClock:'2026-10-14',activePersonaId:'persona_anna',changes:{interests:{},favorites:[],notifications:[]}});





