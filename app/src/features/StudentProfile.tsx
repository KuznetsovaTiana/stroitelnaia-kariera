import { useState } from 'react';
import { createResume, dataFor, saveProfile, saveProfessional } from '../domain/b1';
import { saveInterests } from '../domain/operations';
import { emptyProfessional } from '../domain/profile-details';
import type { Envelope } from '../domain/types';
import type { ProfessionalProfile } from '../domain/profile-details';
import { SearchEditor, ExperienceEditor, SkillsEditor, AchievementsEditor, LanguagesEditor, ContactsEditor } from './ProfileEditors';
import { StudentProfileHeader, ResumeSection, JobPreferencesSection, ExperienceSection, EducationSection, ProjectsSection, SkillsSection, AdditionalSections, ContactsSection } from './ProfileSections';
type Edit='search'|'experience'|'skills'|'achievements'|'languages'|'contacts'|null;
export function StudentProfile({state,commit}:{state:Envelope;commit:(state:Envelope)=>boolean}){
 const data=dataFor(state),actor=data.personas.find(p=>p.id===state.activePersonaId)!,student=data.students.find(s=>s.id===actor.studentId)!;
 const details=student.professional??emptyProfessional(),education=data.education.find(e=>e.studentId===student.id),projects=data.projects.filter(p=>p.studentId===student.id),resumes=data.resumes.filter(r=>r.studentId===student.id),cases=data.practices.filter(c=>c.studentId===student.id&&c.status!=='cancelled');
 const [editing,setEditing]=useState<Edit>(null),[message,setMessage]=useState(''),[error,setError]=useState('');
 const checks=[['город',!!student.region],['условия поиска',!!details.employment&&!!details.workFormat],['период доступности',student.availability.every(Boolean)],['интересы',!!student.interests.trim()],['резюме',resumes.some(r=>r.status==='ready'&&r.summary.trim())],['образование',!!education],['проекты',projects.length>0],['навыки',!!education?.skills.length||details.selfSkills.length>0],['языки',details.languages.length>0],['контакты',Object.values(details.contacts).some(Boolean)]] as const;
 const completion=Math.round(checks.filter(([,filled])=>filled).length/checks.length*100);
 function edit(section:Edit){if(editing===section){if(section)document.getElementById('profile-'+section)?.scrollIntoView({block:'start'});return}if(editing&&editing!==section&&!window.confirm('Закрыть редактирование без сохранения?'))return;document.dispatchEvent(new Event('career:discard-draft'));setEditing(section);setMessage('');setError('');if(section)requestAnimationFrame(()=>document.getElementById('profile-'+section)?.scrollIntoView({block:'start',behavior:'auto'}))}
 function finish(){const section=editing;setEditing(null);if(section)requestAnimationFrame(()=>document.getElementById('profile-'+section)?.querySelector('button')?.focus({preventScroll:true}))}
 function save(value:ProfessionalProfile){const saved=commit(saveProfessional(state,value));if(saved)setMessage('Изменения профиля сохранены');return saved}
 function create(){if(editing&&!window.confirm('Перейти к новому резюме без сохранения открытого редактора?'))return;try{const next=createResume(state);if(commit(next.state))location.hash='/student/resumes/'+next.id+'/edit'}catch(e){setError((e as Error).message)}}
 const action=(section:Exclude<Edit,null>,label='Редактировать')=><button className="profile-link" onClick={()=>edit(section)} aria-label={label+': '+({search:'Что я ищу',experience:'Опыт и практика',skills:'Навыки',achievements:'Достижения и обучение',languages:'Языки',contacts:'Контакты и видимость'}[section])}>{label}</button>;
 const editorProps={details,onCancel:finish,save};
 return <section className="student-profile" data-screen="S02"><StudentProfileHeader student={student} details={details} completion={completion} missing={checks.filter(([,filled])=>!filled).map(([label])=>label)} onEdit={()=>edit('search')}/>{message&&<p className="notice" role="status">{message}</p>}{error&&<p className="notice error" role="alert">{error}</p>}
 <ResumeSection student={student} resumes={resumes} onCreate={create}/>
 <JobPreferencesSection student={student} details={details} action={action('search')} editor={editing==='search'&&<SearchEditor student={student} details={details} onCancel={finish} save={(value,profile,interests)=>{const next=saveProfessional(saveInterests(saveProfile(state,profile),interests,data),value);const saved=commit(next);if(saved)setMessage('Условия поиска и интересы сохранены');return saved}}/>}/>
 <ExperienceSection cases={cases} details={details} companies={data.companies} action={action('experience','Добавить / изменить')} editor={editing==='experience'&&<ExperienceEditor {...editorProps}/>}/>
 <EducationSection student={student} education={education}/>
 <ProjectsSection projects={projects}/>
 <SkillsSection education={education} projects={projects} details={details} action={action('skills')} editor={editing==='skills'&&<SkillsEditor {...editorProps}/>}/>
 <AdditionalSections details={details} achievementAction={action('achievements','Добавить / изменить')} languageAction={action('languages')} achievementEditor={editing==='achievements'&&<AchievementsEditor {...editorProps}/>} languageEditor={editing==='languages'&&<LanguagesEditor {...editorProps}/>}/>
 <ContactsSection student={student} details={details} action={action('contacts','Настроить видимость')} editor={editing==='contacts'&&<ContactsEditor student={student} details={details} onCancel={finish} save={(value,visibility)=>{const saved=commit(saveProfessional(saveProfile(state,{...student,visibility}),value));if(saved)setMessage('Контакты и видимость сохранены');return saved}}/>}/>
 </section>;
}
