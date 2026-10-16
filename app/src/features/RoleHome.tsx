import { dataFor } from '../domain/b1';
import { canEmployer } from '../domain/access';
import { canReadCase } from '../domain/b2';
import { ranked } from '../domain/matching';
import type { Envelope } from '../domain/types';

type Action={title:string;detail:string;href:string};
const homes={student:'/student',employer:'/employer',coordinator:'/university',operator:'/operator'};
export function RoleHome({state}:{state:Envelope}){
 const data=dataFor(state),actor=data.personas.find(p=>p.id===state.activePersonaId)!;
 const student=data.students.find(s=>s.id===actor.studentId);
 let title:string,intro:string,main:Action,secondary:Action[]=[],items:Action[]=[],recommendations:Action[]=[];
 if(actor.role==='student'&&student){
  const applications=data.applications.filter(a=>a.studentId===student.id&&!['withdrawn','rejected'].includes(a.selectionStatus));
  const practice=data.practices.filter(c=>c.studentId===student.id&&c.status!=='cancelled').at(-1);
  const application=applications.at(-1);
  title=(student.firstName??student.name.split(' ')[0])+', ваш следующий шаг';intro='От поиска места до результата практики.';
  main=practice?{title:practice.status==='completed'?'Посмотреть результат практики':'Продолжить практику',detail:practice.status==='completed'?'Практика завершена. Итог и учебные документы доступны в деле.':'Документы, задания и сообщения участников — в одном деле.',href:'/student/practices/'+practice.id}:application?{title:'Посмотреть ответ работодателя',detail:'Отклик отправлен. Следите за этапом отбора и отвечайте компании в карточке отклика.',href:'/student/applications/'+application.id}:{title:'Найти практику',detail:'Выберите место по вашей траектории, сравните условия и отправьте резюме.',href:'/practices'};
  secondary=[{title:'Подготовить резюме',detail:'Опишите проекты и навыки. Помощник доступен внутри резюме.',href:'/student/resumes'},{title:'Мой профиль',detail:student.programId+' · '+student.course+' курс · условия поиска и образование',href:'/student/profile'}];
  items=[{title:'Отклики и приглашения',detail:'Активных откликов: '+applications.length,href:'/student/applications'},{title:'Мои практики',detail:'Текущие дела и завершённые результаты',href:'/student/practices'},{title:'Избранное',detail:'Сохранённые предложения и условия поиска',href:'/student/saved'}];
  if(state.changes.c?.notificationSettings[actor.id]?.recommendations!==false)recommendations=ranked(state,student.id,data.offers.filter(o=>o.kind==='practice')).filter(r=>r.result.eligible).slice(0,2).map(({offer})=>({title:offer.title,detail:(data.companies.find(c=>c.id===offer.companyId)?.name??'')+' · '+offer.region,href:'/practices/'+offer.id}));
 }else if(actor.role==='employer'){
  const apps=data.applications.filter(a=>data.offers.some(o=>o.id===a.offerId&&o.companyId===actor.organizationId)&&canEmployer(state,'selection',a.offerId));
  const fresh=apps.filter(a=>['submitted','info_requested'].includes(a.selectionStatus));
  const cases=data.practices.filter(c=>canReadCase(state,c)&&!['cancelled','completed'].includes(c.status));
  title='Подбор и практика';intro='Найдите студентов и проведите их от отклика до практики.';
  main=canEmployer(state,'selection')&&fresh.length?{title:'Рассмотреть отклики',detail:'Ожидают решения: '+fresh.length+'. Изучите резюме и выберите следующий этап.',href:'/employer/applications'}:canEmployer(state,'search')?{title:'Найти студентов',detail:'Сравните учебные навыки с требованиями вашего предложения и пригласите кандидата.',href:'/employer/students'}:{title:'Открыть дела практикантов',detail:'Задания, документы и отчёты по назначенным вам практикам.',href:'/employer/interns'};
  if(canEmployer(state,'publish'))secondary.push({title:'Разместить предложение',detail:'Укажите условия, сроки и требования к студентам.',href:'/employer/practices/new/edit'});
  secondary.push({title:'Практиканты',detail:'Активных дел: '+cases.length,href:'/employer/interns'});
  if(canEmployer(state,'selection'))items.push({title:'Все отклики',detail:'Всего в доступных предложениях: '+apps.length,href:'/employer/applications'});
  if(canEmployer(state,'publish'))items.push({title:'Мои предложения',detail:'Практики, вакансии и стажировки',href:'/employer/practices'});
  if(canEmployer(state,'team'))items.push({title:'Профиль компании',detail:'Описание и статус проверки',href:'/employer/company'});
 }else if(actor.role==='coordinator'){
  const queue=data.practices.filter(c=>canReadCase(state,c)&&c.submittedToUniversityAt&&!['completed','cancelled'].includes(c.status));
  const corrections=state.changes.b1?.corrections.filter(c=>c.status==='pending')??[];
  title='Организация практики';intro='Согласуйте условия, проверьте документы и зафиксируйте учебный результат.';
  main={title:queue.length?'Открыть практики на проверке':'Проверить готовность студентов',detail:queue.length?'Дел в работе: '+queue.length+'. Откройте дело, чтобы увидеть текущий этап и документы.':'Посмотрите, кто уже нашёл место и кому ещё нужна практика.',href:queue.length?'/university/approvals':'/university/students'};
  secondary=[{title:'Студенты и исправления',detail:'Запросов на исправление: '+corrections.length,href:'/university/students'},{title:'Запросить места у компаний',detail:'Согласуйте число мест и направление подготовки.',href:'/university/company-requests'}];
  items=[{title:'Практики',detail:'Согласование, сопровождение и итог',href:'/university/approvals'},{title:'Отчёты',detail:'Обеспеченность практикой и результаты',href:'/university/analytics'},{title:'Требования и документы',detail:'Правила практики и шаблоны',href:'/university/requirements'}];
 }else{
  const companies=data.companies.filter(c=>c.status==='pending').length,offers=data.offers.filter(o=>o.status==='pending_moderation').length;
  title='Проверка и поддержка';intro='Проверяйте публикации и помогайте участникам.';
  main=offers?{title:'Проверить предложения',detail:'На модерации: '+offers+'. Проверьте условия перед публикацией.',href:'/operator/offers'}:companies?{title:'Проверить компании',detail:'Ожидают решения: '+companies+'. Изучите карточки организаций.',href:'/operator/organizations'}:{title:'Открыть обращения',detail:'Посмотрите вопросы участников и продолжите работу с обращениями.',href:'/operator/appeals'};
  secondary=[{title:'Компании',detail:'На проверке: '+companies,href:'/operator/organizations'},{title:'Предложения',detail:'На модерации: '+offers,href:'/operator/offers'}];
  items=[{title:'Обращения',detail:'Вопросы, ответы и жалобы участников',href:'/operator/appeals'},{title:'Отчётность',detail:'Показатели по общему набору',href:'/operator/reports'},{title:'Управление',detail:'Справочники, контент и настройки',href:'/operator/more'}];
 }
 return <section className="role-home"><div className="pageheading"><div><h1>{title}</h1><p>{intro}</p></div></div><div className="home-priority"><section className="home-next"><span className="eyebrow">Следующий шаг</span><h2>{main.title}</h2><p>{main.detail}</p><a className="button primary" href={'#'+main.href}>{main.title} <span aria-hidden="true">→</span></a></section><aside className="home-secondary" aria-label="Подготовка и сопровождение">{secondary.map(a=><article key={a.href}><h2><a href={'#'+a.href}>{a.title} →</a></h2><p>{a.detail}</p></article>)}</aside></div><section className="home-overview" aria-label="Ваши задачи">{items.map(a=><a key={a.href} href={'#'+a.href}><strong>{a.title} →</strong><span>{a.detail}</span></a>)}</section>{recommendations.length>0&&<section className="home-recommendations"><div className="sectionhead"><h2>Практики по вашей траектории</h2><a href="#/practices?sort=matching">Все предложения →</a></div><div className="offergrid">{recommendations.map(a=><article className="card" key={a.href}><h3><a href={'#'+a.href}>{a.title}</a></h3><p>{a.detail}</p><a href={'#'+a.href}>Посмотреть условия →</a></article>)}</div></section>}<p className="home-help">Нужны другие возможности? <a href={'#'+homes[actor.role]+'/more'}>Все разделы кабинета →</a></p></section>;
}
