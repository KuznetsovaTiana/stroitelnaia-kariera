import { AIDemoNotice } from './AIAvailability';
import {useEffect,useId,useRef,useState} from 'react';
import {AI_UNAVAILABLE} from '../../shared/aiContract';
import type {AIAvailability,AIMessage,AIMode,AIRequest} from '../../shared/aiContract';
import {aiService} from '../services/aiService';
import {aiProfileContext,getVerifiedProfile} from '../services/universityDataProvider';
import type {Envelope} from '../domain/types';
import type {Resume} from '../domain/b1-types';
import {saveResume} from '../domain/b1';
import './ai-assistant.css';

export function AIResumeAssistant({state,studentId,target,initialText='',onApply,onClose}:{state:Envelope;studentId:string;target:'about'|'experience';initialText?:string;onApply:(text:string,mode:AIMode)=>boolean;onClose:()=>void}){
 const id=useId(),[availability,setAvailability]=useState<AIAvailability>(),[history,setHistory]=useState<AIMessage[]>([]),[message,setMessage]=useState(''),[preview,setPreview]=useState(''),[mode,setMode]=useState<AIMode>('live'),[pending,setPending]=useState(false),[error,setError]=useState('');
 const request=useRef<AbortController|null>(null),busy=useRef(false),input=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{let mounted=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);aiService.availability(controller.signal).then(v=>{if(mounted)setAvailability(v)}).catch(()=>{if(mounted)setError(AI_UNAVAILABLE)}).finally(()=>clearTimeout(timer));return()=>{mounted=false;controller.abort();request.current?.abort()}},[]);
 async function send(improve=false){
  if(busy.current||!availability?.available||(!improve&&!message.trim()))return;
  const value=improve?'Улучши формулировки, сохранив все факты.':message.trim(),controller=new AbortController();request.current=controller;busy.current=true;setPending(true);setError('');
  const timer=setTimeout(()=>controller.abort(),30000);
  const payload:AIRequest={action:improve?'improve_text':target==='about'?'resume_about':'resume_experience',target,message:value,history,profileContext:aiProfileContext(getVerifiedProfile(state,studentId)),...((preview||initialText)?{draft:preview||initialText}:{})};
  try{const result=await aiService.sendResumeMessage(payload,controller.signal);setMode(result.mode);setHistory([...history,{role:'user',content:value},{role:'assistant',content:result.answer.message}]);if(!improve)setMessage('');if(result.answer.type==='result')setPreview(result.answer.content[target]??'');document.dispatchEvent(new Event('career:mark-draft'))}
  catch(e){setError(controller.signal.aborted?AI_UNAVAILABLE:(e instanceof Error?e.message:AI_UNAVAILABLE))}
  finally{clearTimeout(timer);busy.current=false;setPending(false);request.current=null}
 }
 const unavailable=availability?.available===false||(!availability&&error===AI_UNAVAILABLE);
 return <div className="ai-assistant card" aria-label="ИИ-помощник студента"><div className="profile-section-heading"><h3>{target==='about'?'Помочь рассказать о себе':'Помочь описать опыт'}</h3><button type="button" onClick={()=>{request.current?.abort();onClose()}} aria-label="Закрыть ИИ-помощника">×</button></div>
 {unavailable?<AIDemoNotice/>:<><p className="profile-source">{availability?(availability.mode==='mock'?'Демонстрационный режим · без языковой модели':'GigaChat · ИИ-помощник'):'Проверяем доступность помощника…'}</p>
 <p className="tiny">По кнопке отправки модель получит ваши сообщения и краткий учебный контекст: программу, курс, дисциплины и навыки. Имя, контакты и оценки не передаются. Не вводите личные данные. История остаётся только в памяти этой страницы.</p>
 <p>Расскажите {target==='about'?'о своих интересах и задачах, которые хотите выполнять':'о реальном учебном проекте или практике и вашем личном вкладе'}. Помощник уточнит детали и предложит текст для проверки.</p>
 </>}
 {!unavailable&&<>
 <div className="ai-dialog" aria-live="polite">{history.map((m,i)=><p key={i} className="prewrap"><strong>{m.role==='user'?'Вы':'Помощник'}:</strong> {m.content}</p>)}</div>
 <label htmlFor={id}>Ваше сообщение</label><textarea ref={input} id={id} rows={4} maxLength={2000} value={message} disabled={pending} onChange={e=>setMessage(e.target.value)}/>
 <div className="actions"><button className="primary" type="button" disabled={pending||!availability?.available||!message.trim()} onClick={()=>void send()}>{pending?'Готовим ответ…':'Отправить'}</button>{history.length>0&&<button type="button" disabled={pending} onClick={()=>{setHistory([]);setError('');input.current?.focus()}}>Новый диалог</button>}</div>
 {error&&<p className="notice error" role="alert">{error}</p>}
 {!preview&&initialText.trim()&&<button type="button" disabled={pending||!availability?.available} onClick={()=>void send(true)}>Улучшить мой текст</button>}
 {preview&&<section className="ai-preview"><h3>Предложенный текст</h3><p className="tiny">Проверьте каждую формулировку. Это информация от студента, а не подтверждение университета. Текст можно изменить перед сохранением.</p><label htmlFor={id+'-preview'}>Изменить текст</label><textarea id={id+'-preview'} rows={8} maxLength={3000} value={preview} disabled={pending} onChange={e=>setPreview(e.target.value)}/><div className="actions"><button type="button" className="primary" disabled={pending||!preview.trim()} onClick={()=>{try{if(onApply(preview,mode)){document.dispatchEvent(new Event('career:discard-draft'));onClose()}else setError('Сохранение не подтверждено. Текст остаётся здесь для повторной попытки.')}catch(e){setError((e as Error).message)}}}>Добавить в профиль</button><button type="button" disabled={pending} onClick={()=>input.current?.focus()}>Продолжить диалог</button><button type="button" disabled={pending||!availability?.available} onClick={()=>void send(true)}>Улучшить формулировку</button></div></section>}
 </>}
 </div>;
}

export function ResumeAssistantPage({state,resume,commit}:{state:Envelope;resume:Resume;commit:(s:Envelope)=>boolean}){
 const [target,setTarget]=useState<'about'|'experience'>('about'),[saved,setSaved]=useState(false),[closed,setClosed]=useState(false);
 function apply(text:string,mode:AIMode){const ok=commit(saveResume(state,{...resume,...(target==='about'?{summary:text}:{experienceSummary:text}),origin:mode==='live'?'ai_assisted':'mock_assisted'}));if(ok)setSaved(true);return ok}
 return <section className="b1page" data-screen="S08"><h1>ИИ-помощник студента</h1><p><a href={'#/student/resumes/'+resume.id+'/edit'}>← Ручной редактор резюме</a></p><p>До вашего подтверждения сохранённое резюме не меняется.</p><div className="actions"><button onClick={()=>{setTarget('about');setSaved(false);setClosed(false)}} aria-pressed={target==='about'}>О себе</button><button onClick={()=>{setTarget('experience');setSaved(false);setClosed(false)}} aria-pressed={target==='experience'}>Учебный и практический опыт</button></div>{saved?<p role="status" className="notice">Текст принят и сохранён в резюме.</p>:closed?<p>Диалог закрыт. Сохранённое резюме не изменилось.</p>:<AIResumeAssistant key={target} state={state} studentId={resume.studentId} initialText={target==='about'?resume.summary:resume.experienceSummary} target={target} onClose={()=>setClosed(true)} onApply={apply}/>}</section>;
}
