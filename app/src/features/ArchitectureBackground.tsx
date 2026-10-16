import { useEffect, useState } from 'react';

const sources={final:'./architecture/welcome-final.webp',drawing:'./architecture/welcome-drawing.webp',completed:'./architecture/welcome-completed.webp'};
const decode=(src:string)=>new Promise<void>((resolve,reject)=>{
 const image=new Image();image.onload=()=>{image.decode().then(resolve,reject)};image.onerror=()=>reject(new Error('Background unavailable'));image.src=src;
});
type Phase='loading'|'cycling'|'final'|'drawing'|'empty';

/** Three aligned images share a single reversible timeline; the UI stays outside it. */
export function ArchitectureBackground(){
 const [phase,setPhase]=useState<Phase>('loading');
 const [completedLoaded,setCompletedLoaded]=useState(false);
 const [paused,setPaused]=useState(false);
 useEffect(()=>{
  let cancelled=false,loaded:{final:boolean;drawing:boolean;completed:boolean}|undefined;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const refresh=()=>{
   if(cancelled||!loaded)return;
   const allReady=loaded.final&&loaded.drawing&&loaded.completed;
   setPhase(allReady&&!motion.matches?'cycling':loaded.completed||loaded.final?'final':loaded.drawing?'drawing':'empty');
  };
  const visibility=()=>setPaused(document.hidden);
  motion.addEventListener('change',refresh);
  document.addEventListener('visibilitychange',visibility);visibility();
  Promise.allSettled([decode(sources.final),decode(sources.drawing),decode(sources.completed)]).then(([final,drawing,completed])=>{
   if(cancelled)return;
   loaded={final:final.status==='fulfilled',drawing:drawing.status==='fulfilled',completed:completed.status==='fulfilled'};
   setCompletedLoaded(loaded.completed);refresh();
  });
  return()=>{cancelled=true;motion.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',visibility)};
 },[]);
 return <div className="architecture-background" data-phase={phase} data-completed={completedLoaded} data-paused={paused} aria-hidden="true">
  <div className="architecture-frame">
   <img className="architecture-drawing" src={sources.drawing} alt="" loading="eager" decoding="async" width="1672" height="941"/>
   <img className="architecture-final" src={sources.final} alt="" loading="eager" decoding="async" width="1672" height="941"/>
   {completedLoaded&&<img className="architecture-completed" src={sources.completed} alt="" loading="eager" decoding="async" fetchPriority="high" width="1672" height="941"/>}
  </div>
 </div>;
}
