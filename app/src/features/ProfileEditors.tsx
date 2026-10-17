import { cloneElement, useId, useState } from 'react';
import type { ReactNode, ReactElement, FormEvent } from 'react';
import type { Profile } from '../domain/b1-types';
import type { ProfessionalProfile, PersonalExperience, Achievement, Language } from '../domain/profile-details';
export const splitSkills=(text:string)=>[...new Set(text.split(',').map(s=>s.trim()).filter(Boolean))];
function Field({label,children}:{label:string;children:ReactElement<{id?:string}>}){const id=useId();return <div className="field"><label htmlFor={id}>{label}</label>{cloneElement(children,{id})}</div>}
export function EditorPanel({title,onSave,onCancel,children}:{title:string;onSave:()=>boolean;onCancel:()=>void;children:ReactNode}){
 const [error,setError]=useState('');
 function save(e:FormEvent){e.preventDefault();try{if(onSave())onCancel();else setError('Изменения остаются в памяти. Проверьте сообщение о сохранении вверху страницы.')}catch(e){setError((e as Error).message)}}
 return <form className="profile-editor" aria-label={title} onSubmit={save} onClickCapture={e=>{if((e.target as HTMLElement).closest('[data-profile-change]'))document.dispatchEvent(new Event('career:mark-draft'))}}><h3>{title}</h3>{error&&<p className="notice error" role="alert">{error}</p>}{children}<div className="actions"><button className="primary" type="submit">Сохранить</button><button type="button" onClick={()=>{document.dispatchEvent(new Event('career:discard-draft'));onCancel()}}>Отмена</button></div></form>;
}
type Base={onCancel:()=>void;save:(details:ProfessionalProfile)=>boolean;details:ProfessionalProfile};
export function SearchEditor({student,details,onCancel,save}:{student:Profile}&Omit<Base,'save'>&{save:(details:ProfessionalProfile,profile:Profile,interests:string)=>boolean}){
 const [profile,setProfile]=useState(student),[value,setValue]=useState(details),[directions,setDirections]=useState(details.directions.join(', ')),[interests,setInterests]=useState(student.interests);
 return <EditorPanel title="Условия поиска и интересы" onCancel={onCancel} onSave={()=>save({...value,directions:splitSkills(directions)},profile,interests)}>
 <Field label="Статус поиска"><select value={value.searchStatus} onChange={e=>setValue({...value,searchStatus:e.target.value as ProfessionalProfile['searchStatus']})}>{['Открыт к предложениям','Ищу практику','Ищу стажировку','Ищу работу'].map(s=><option key={s}>{s}</option>)}</select></Field>
 <Field label="Тип занятости"><select value={value.employment} onChange={e=>setValue({...value,employment:e.target.value as ProfessionalProfile['employment']})}>{['','Практика','Стажировка','Работа'].map(s=><option value={s} key={s}>{s||'Не указан'}</option>)}</select></Field>
 <Field label="Интересующие направления через запятую"><input maxLength={600} value={directions} onChange={e=>setDirections(e.target.value)}/></Field>
 <Field label="Регион"><input maxLength={100} value={profile.region} onChange={e=>setProfile({...profile,region:e.target.value})}/></Field>
 <Field label="Формат работы"><select value={value.workFormat} onChange={e=>setValue({...value,workFormat:e.target.value as ProfessionalProfile['workFormat']})}>{['','Офис','Гибрид','Удалённо','На объекте'].map(s=><option key={s} value={s}>{s||'Не указан'}</option>)}</select></Field>
 <Field label="Предпочтительный график"><select value={profile.schedule} onChange={e=>setProfile({...profile,schedule:e.target.value})}><option value="">Не указан</option><option>Полный день</option><option>Гибкий график</option></select></Field>
 <div className="profile-date-fields"><Field label="Доступен с"><input type="date" value={profile.availability[0]} onChange={e=>setProfile({...profile,availability:[e.target.value,profile.availability[1]]})}/></Field><Field label="Доступен до"><input type="date" value={profile.availability[1]} onChange={e=>setProfile({...profile,availability:[profile.availability[0],e.target.value]})}/></Field></div>
 <label className="check"><input type="checkbox" checked={profile.relocate} onChange={e=>setProfile({...profile,relocate:e.target.checked})}/>Готовность к переезду</label>
 <Field label="Профессиональные интересы"><textarea rows={3} maxLength={600} value={interests} onChange={e=>setInterests(e.target.value)}/></Field>
 </EditorPanel>;
}
export function ExperienceEditor({details,onCancel,save}:Base){
 const [items,setItems]=useState(details.experience);
 const edit=(index:number,patch:Partial<PersonalExperience>)=>setItems(items.map((r,i)=>i===index?{...r,...patch}:r));
 return <EditorPanel title="Редактировать опыт" onCancel={onCancel} onSave={()=>save({...details,experience:items})}>
 <p className="tiny">Добавленные сведения будут отмечены «Указано студентом». Дела практики заполняются участниками отдельно.</p>
 {items.map((r,i)=><fieldset key={i}><legend>Место {i+1}</legend><Field label="Компания"><input required maxLength={160} value={r.company} onChange={e=>edit(i,{company:e.target.value})}/></Field><Field label="Должность"><input required maxLength={160} value={r.position} onChange={e=>edit(i,{position:e.target.value})}/></Field><Field label="Начало"><input required type="month" value={r.start} onChange={e=>edit(i,{start:e.target.value})}/></Field><Field label="Окончание"><input type="month" value={r.end} onChange={e=>edit(i,{end:e.target.value})}/></Field><p className="tiny">Оставьте окончание пустым, если продолжаете работать.</p><Field label="Описание деятельности"><textarea maxLength={1200} rows={3} value={r.description} onChange={e=>edit(i,{description:e.target.value})}/></Field><Field label="Компетенции через запятую"><input maxLength={600} value={r.skills.join(', ')} onChange={e=>edit(i,{skills:e.target.value.split(',')})} onBlur={()=>edit(i,{skills:splitSkills(r.skills.join(','))})}/></Field><button type="button" data-profile-change onClick={()=>setItems(items.filter((_,n)=>n!==i))}>Удалить место {i+1}</button></fieldset>)}
 <button type="button" data-profile-change disabled={items.length>=12} onClick={()=>setItems([...items,{company:'',position:'',start:'',end:'',description:'',skills:[],source:'student'}])}>Добавить место</button>
 </EditorPanel>;
}
export function SkillsEditor({details,onCancel,save}:Base){
 const [skills,setSkills]=useState(details.selfSkills.join(', '));
 return <EditorPanel title="Редактировать свои навыки" onCancel={onCancel} onSave={()=>save({...details,selfSkills:splitSkills(skills)})}><Field label="Навыки через запятую"><textarea rows={4} maxLength={1200} value={skills} onChange={e=>setSkills(e.target.value)}/></Field><p className="tiny">До 20 навыков. Учебные навыки вуза и сведения работодателя здесь не изменяются.</p></EditorPanel>;
}
export function AchievementsEditor({details,onCancel,save}:Base){
 const [items,setItems]=useState(details.achievements);
 const edit=(index:number,patch:Partial<Achievement>)=>setItems(items.map((r,i)=>i===index?{...r,...patch}:r));
 return <EditorPanel title="Достижения и обучение" onCancel={onCancel} onSave={()=>save({...details,achievements:items})}>
 {items.map((r,i)=><fieldset key={i}><legend>Достижение {i+1}</legend><Field label="Название достижения или курса"><input required maxLength={160} value={r.title} onChange={e=>edit(i,{title:e.target.value})}/></Field><Field label="Организатор, год и результат"><textarea maxLength={600} rows={2} value={r.description} onChange={e=>edit(i,{description:e.target.value})}/></Field><button type="button" data-profile-change onClick={()=>setItems(items.filter((_,n)=>n!==i))}>Удалить достижение {i+1}</button></fieldset>)}
 <button type="button" data-profile-change disabled={items.length>=12} onClick={()=>setItems([...items,{title:'',description:'',source:'student'}])}>Добавить достижение</button></EditorPanel>;
}
export function LanguagesEditor({details,onCancel,save}:Base){
 const [items,setItems]=useState(details.languages);
 const edit=(index:number,patch:Partial<Language>)=>setItems(items.map((r,i)=>i===index?{...r,...patch}:r));
 return <EditorPanel title="Редактировать языки" onCancel={onCancel} onSave={()=>save({...details,languages:items})}>
 {items.map((r,i)=><fieldset key={i}><legend>Язык {i+1}</legend><Field label="Язык"><input required maxLength={80} value={r.name} onChange={e=>edit(i,{name:e.target.value})}/></Field><Field label="Уровень"><select value={r.level} onChange={e=>edit(i,{level:e.target.value})}>{['Родной','A1','A2','B1','B2','C1','C2'].map(s=><option key={s}>{s}</option>)}</select></Field><button type="button" data-profile-change onClick={()=>setItems(items.filter((_,n)=>n!==i))}>Удалить язык {i+1}</button></fieldset>)}
 <button type="button" data-profile-change disabled={items.length>=12} onClick={()=>setItems([...items,{name:'',level:'Родной',source:'student'}])}>Добавить язык</button></EditorPanel>;
}
export function ContactsEditor({details,onCancel,save}:Base){
 const [contacts,setContacts]=useState(details.contacts);
 return <EditorPanel title="Редактировать контакты" onCancel={onCancel} onSave={()=>save({...details,contacts})}>
 <Field label="Телефон"><input type="tel" maxLength={40} value={contacts.phone} onChange={e=>setContacts({...contacts,phone:e.target.value})}/></Field><Field label="Email"><input type="email" maxLength={120} value={contacts.email} onChange={e=>setContacts({...contacts,email:e.target.value})}/></Field><Field label="Telegram"><input maxLength={80} value={contacts.telegram} onChange={e=>setContacts({...contacts,telegram:e.target.value})}/></Field>
 </EditorPanel>;
}
export function VisibilityEditor({student,onCancel,save}:{student:Profile;onCancel:()=>void;save:(visibility:Profile['visibility'])=>boolean}){
 const [visibility,setVisibility]=useState(student.visibility);
 return <EditorPanel title="Настроить видимость" onCancel={onCancel} onSave={()=>save(visibility)}>
 <Field label="Видимость в поиске работодателя"><select value={visibility} onChange={e=>setVisibility(e.target.value as Profile['visibility'])}><option value="visible">Виден</option><option value="hidden">Скрыт</option></select></Field><p className="tiny">Скрытие из поиска не отменяет уже отправленные отклики. Для общения с работодателем используется переписка в отклике.</p>
 </EditorPanel>;
}
