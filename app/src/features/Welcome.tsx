import { ArchitectureBackground } from './ArchitectureBackground';
import { CaseInMark } from './CaseInMark';
import { useEffect, useRef, useState } from 'react';
import { projectContext } from '../data/projectContext';
import { officialName } from '../domain/personName';
import type { Role } from '../domain/types';
import { dataFor } from '../domain/b1';
import { teamRule } from '../domain/access';
import type { Envelope } from '../domain/types';

const roles: { id: Role; title: string; description: string }[] = [
 {id:'student',title:'Студент',description:'Изучайте предложения, собирайте резюме и проходите путь от отклика до результата практики.'},
 {id:'employer',title:'Работодатель',description:'Работайте с предложениями, откликами и практикой в пределах полномочий выбранного сотрудника.'},
 {id:'coordinator',title:'Координатор вуза',description:'Согласовывайте практики и документы, рассматривайте исправления учебных сведений МГСУ.'},
 {id:'operator',title:'Оператор',description:'Проверяйте компании и объявления, рассматривайте обращения и изучайте отчётность.'},
];
const capabilities:Record<Role,string[]>={student:['Поиск практики и вакансий','Резюме и отклики','Документы и результат практики'],employer:['Предложения и отбор кандидатов','Сопровождение практикантов','Документы в пределах полномочий'],coordinator:['Согласование практик','Проверка документов','Исправление учебных сведений'],operator:['Модерация компаний и предложений','Обращения пользователей','Демонстрационная отчётность']};
const continueLabels:Record<Role,string>={student:'Продолжить как студент',employer:'Продолжить как работодатель',coordinator:'Продолжить как координатор',operator:'Продолжить как оператор'};
const subroles:Record<string,string>={owner:'Владелец / администратор',recruiter:'Рекрутер',manager:'Руководитель подразделения',documents:'Специалист по документам'};
export function Welcome({state,selection,start,resumeHref}:{state:Envelope;selection:boolean;start:(id:string)=>void;resumeHref?:string}){
 const role=roles.find(r=>r.id===new URLSearchParams(location.hash.split('?')[1]).get('role'));
 const [profile,setProfile]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement|null>(null);
 const personas=dataFor(state).personas.filter(p=>p.role===role?.id);
 const selectedProfile=personas.some(p=>p.id===profile&&p.active)?profile:personas.find(p=>p.active)?.id??'';
 const close=()=>location.replace('#/demo');
 useEffect(()=>{if(!role)return;dialog.current?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;trigger.current?.focus()}},[role]);
 return <div className={'entry-page'+(!selection?' welcome-page':' role-selection-page')}>{!selection&&<ArchitectureBackground/>}<header className="entry-header"><a className="brand" href="#/"><span className="brandmark"><img src="./brand/site-logo.svg" alt="" width="352" height="200" aria-hidden="true"/></span><span>Строительная<br/>карьера</span></a><div className="entry-header-context"><CaseInMark/><span className="demobadge">Демонстрационная версия</span></div></header><main id="main" tabIndex={-1} className="entry-main">
 {selection?<section className="role-entry"><span className="eyebrow">ЗНАКОМСТВО С ПЛАТФОРМОЙ</span><h1>Выберите роль</h1><p>Попробуйте общий сценарий с разных сторон. Регистрация не требуется.</p><div className="entry-roles">{roles.map(r=><button key={r.id} className={'card role-choice'+(role?.id===r.id?' selected':'')} aria-haspopup="dialog" onClick={e=>{trigger.current=e.currentTarget;setProfile('');location.hash='/demo?role='+r.id}}><strong>{r.title}</strong><span>{r.description}</span><span className="role-choice-action">Выбрать роль →</span></button>)}</div>{role&&<dialog ref={dialog} role="dialog" aria-modal="true" aria-labelledby="role-dialog-title" aria-describedby="role-dialog-description" className="role-dialog" onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===e.currentTarget){const rect=e.currentTarget.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)close()}}}>
 <div className="role-dialog-content"><div className="role-dialog-heading"><span className="eyebrow">ТЕСТОВЫЙ СЦЕНАРИЙ</span><button type="button" className="role-dialog-close" onClick={close} aria-label="Закрыть"><span aria-hidden="true">×</span></button></div><h2 id="role-dialog-title">{role.title}</h2><p id="role-dialog-description">{role.description}</p><ul>{capabilities[role.id].map(c=><li key={c}>{c}</li>)}</ul><div className="profile-choice"><label htmlFor="entry-profile">Тестовый профиль</label><select id="entry-profile" value={selectedProfile} onChange={e=>setProfile(e.target.value)}>{personas.map(p=><option key={p.id} value={p.id} disabled={!p.active}>{officialName(p)}{p.role==='employer'?' · '+subroles[teamRule({...state,activePersonaId:p.id}).subrole]:''}{!p.active?' · отключён':''}</option>)}</select></div><p className="tiny">Вымышленные данные. Все роли работают с одним локальным сценарием.</p></div><div className="role-dialog-actions"><button className="primary" disabled={!selectedProfile} onClick={()=>start(selectedProfile)}>{continueLabels[role.id]} <span aria-hidden="true">→</span></button><button onClick={close}>Назад</button></div></dialog>}<nav className="role-entry-footer" aria-label="Возврат"><a href="#/">← Приветствие</a>{resumeHref&&<a className="resume-workspace" href={resumeHref}>Вернуться в кабинет →</a>}</nav></section>:<section className="welcome-layout"><div className="welcome-copy"><span className="eyebrow">ОТ УЧЕБНОГО ПРОЕКТА — К ПЕРВОЙ ПРАКТИКЕ</span><h1><span className="welcome-greeting">Добро пожаловать</span>{' '}<span className="welcome-heading-detail">в демонстрационную версию</span>{' '}<span className="welcome-product">Строительной карьеры</span></h1><p>Выберите роль и попробуйте работу платформы</p><a className="button primary" href="#/demo">Выбрать роль <span aria-hidden="true">→</span></a></div></section>}
 {!selection&&<aside className="project-context" aria-label="О проекте"><div><p>Учебная демонстрационная версия платформы подготовлена в рамках кейс-чемпионата <span style={{whiteSpace:'nowrap'}}>CASE-IN</span></p><p className="tiny">Проект команды «{projectContext.teamName || 'Название команды уточняется'}»</p></div></aside>}
 {resumeHref&&!selection&&<p><a className="resume-workspace" href={resumeHref}>Вернуться в кабинет →</a></p>}
 </main></div>;
}
