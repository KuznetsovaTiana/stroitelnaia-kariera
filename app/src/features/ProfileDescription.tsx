import {useId,useState} from 'react';
import type {Envelope} from '../domain/types';
import type {ProfessionalProfile} from '../domain/profile-details';
import {AIResumeAssistant} from './AIResumeAssistant';
import {EditorPanel} from './ProfileEditors';
import {ProfileSection} from './ProfileSections';
export const textSource=(source:string|undefined)=>source==='ai_assisted'?'Указано студентом · сформулировано с ИИ и принято студентом':source==='mock_assisted'?'Указано студентом · демонстрационный помощник':'Указано студентом';
export function ProfileDescription({state,studentId,details,field,editing,onEdit,onClose,save}:{state:Envelope;studentId:string;details:ProfessionalProfile;field:'about'|'experienceSummary';editing:boolean;onEdit:()=>void;onClose:()=>void;save:(v:ProfessionalProfile)=>boolean}){
 const [startAI,setStartAI]=useState(false);
 const title=field==='about'?'О себе / профессиональный профиль':'Учебный и практический опыт';
 return <ProfileSection id={field} title={title} action={<button className="profile-link" onClick={()=>{setStartAI(false);onEdit()}}>Редактировать</button>}>{editing?<DescriptionEditor key={field} {...{state,studentId,details,field,onClose,save,startAI}}/>:<div className="card"><p className="profile-source">{textSource(details.textSources?.[field])}</p><p className="prewrap">{details[field]||'Расскажите своими словами или воспользуйтесь ИИ-помощником. Сохранение — только после вашей проверки.'}</p><button onClick={()=>{setStartAI(true);onEdit()}}>Заполнить с помощью ИИ</button></div>}</ProfileSection>;
}
function DescriptionEditor({state,studentId,details,field,onClose,save,startAI}:{state:Envelope;studentId:string;details:ProfessionalProfile;field:'about'|'experienceSummary';onClose:()=>void;save:(v:ProfessionalProfile)=>boolean;startAI:boolean}){
 const [value,setValue]=useState(details[field]??''),[assistant,setAssistant]=useState(startAI),id=useId();
 function store(text:string,source:'student'|'ai_assisted'|'mock_assisted'){return save({...details,[field]:text,textSources:{...details.textSources,[field]:source}})}
 return <><EditorPanel title={field==='about'?'О себе':'Описание учебного и практического опыта'} onSave={()=>store(value,'student')} onCancel={onClose}><div className="field"><label htmlFor={id}>Текст от студента</label><textarea id={id} rows={6} maxLength={3000} value={value} onChange={e=>setValue(e.target.value)}/></div><button type="button" onClick={()=>setAssistant(true)}>ИИ-помощник</button></EditorPanel>{assistant&&<AIResumeAssistant {...{state,studentId}} initialText={value} target={field==='about'?'about':'experience'} onClose={()=>setAssistant(false)} onApply={(text,mode)=>{const result=store(text,mode==='live'?'ai_assisted':'mock_assisted');if(result)onClose();return result}}/>}</>;
}
