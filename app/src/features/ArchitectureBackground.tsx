import { useEffect, useState } from 'react';

const sources={final:'./architecture/welcome-final.webp',drawing:'./architecture/welcome-drawing.webp',completed:'./architecture/welcome-completed.webp'};
const decode=(src:string)=>new Promise<void>((resolve,reject)=>{
 const image=new Image();image.onload=()=>{image.decode().then(resolve,reject)};image.onerror=()=>reject(new Error('Background unavailable'));image.src=src;
});
type Phase='loading'|'reveal'|'finishing'|'final'|'drawing'|'empty';

/** All three images share a single frame and crop; controls are never masked. */
export function ArchitectureBackground(){
 const [phase,setPhase]=useState<Phase>('loading');
 const [completedLoaded,setCompletedLoaded]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const finish=()=>{if(motion.matches)setPhase(p=>p==='reveal'||p==='finishing'?'final':p)};
  motion.addEventListener('change',finish);
  const finalReady=decode(sources.final);
  const completedReady=decode(sources.completed);
  completedReady.then(()=>{if(!cancelled){setCompletedLoaded(true);if(motion.matches)setPhase('final')}},()=>{});
  Promise.allSettled([finalReady,decode(sources.drawing),completedReady]).then(([final,drawing,completed])=>{
   if(cancelled)return;
   setPhase(final.status==='fulfilled'?(drawing.status==='fulfilled'&&!motion.matches?'reveal':'final'):completed.status==='fulfilled'?'final':drawing.status==='fulfilled'?'drawing':'empty');
  });
  return()=>{cancelled=true;motion.removeEventListener('change',finish)};
 },[]);
 return <div className="architecture-background" data-phase={phase} data-completed={completedLoaded} aria-hidden="true">
  <div className="architecture-frame">
   <img className="architecture-drawing" src={sources.drawing} alt="" loading="eager" decoding="async" width="1672" height="941"/>
   <img className="architecture-final" src={sources.final} alt="" loading="eager" decoding="async" fetchPriority="high" width="1672" height="941" onAnimationEnd={()=>setPhase(p=>p==='reveal'?(completedLoaded?'finishing':'final'):p)}/>
   {completedLoaded&&<img className="architecture-completed" src={sources.completed} alt="" loading="eager" decoding="async" width="1672" height="941" onAnimationEnd={()=>setPhase(p=>p==='finishing'?'final':p)}/>}
  </div>
 </div>;
}
