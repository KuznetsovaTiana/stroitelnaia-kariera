import {randomUUID} from 'node:crypto';
import {record,validAIAnswer} from '../shared/aiContract.ts';
import type {AIAnswer,AIRequest} from '../shared/aiContract.ts';
import type {Transport} from './transport.ts';
import {systemPrompt} from './prompts.ts';
export interface GigaConfig {credentials:string;scope:string;model:string;caPem?:string}
export class AIProviderError extends Error{code:'AUTH'|'LIMIT'|'PROVIDER'|'FORMAT';status:number;constructor(code:'AUTH'|'LIMIT'|'PROVIDER'|'FORMAT',status=503){super(code);this.code=code;this.status=status}}
const OAUTH='https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
const CHAT='https://api.giga.chat/v1/chat/completions';
export function createGigaChat(transport:Transport,now=Date.now){
 let cached:{key:string;token:string;expires:number}|undefined;
 let pending:{key:string;promise:Promise<string>}|undefined;
 async function token(config:GigaConfig,signal:AbortSignal,force=false):Promise<string>{
  const key=config.credentials+':'+config.scope;
  if(!force&&cached?.key===key&&cached.expires>now()+60000)return cached.token;
  if(pending?.key===key)return pending.promise;
  const promise=(async()=>{
   const result=await transport(OAUTH,{headers:{Authorization:'Basic '+config.credentials,'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json',RqUID:randomUUID()},body:new URLSearchParams({scope:config.scope}).toString(),signal,caPem:config.caPem});
   if(result.status!==200)throw new AIProviderError(result.status===429?'LIMIT':'AUTH',result.status===429?429:503);
   const data=result.body;if(!record(data)||typeof data.access_token!=='string'||!data.access_token||typeof data.expires_at!=='number')throw new AIProviderError('AUTH');
   const expires=data.expires_at>1e12?data.expires_at:data.expires_at*1000;
   if(expires<=now())throw new AIProviderError('AUTH');
   cached={key,token:data.access_token,expires};return data.access_token;
  })();
  pending={key,promise};
  try{return await promise}finally{if(pending?.promise===promise)pending=undefined}
 }
 return async(config:GigaConfig,input:AIRequest,signal:AbortSignal):Promise<AIAnswer>=>{
  let access=await token(config,signal);
  const messages=[{role:'system',content:systemPrompt(input.action)},...input.history,
   {role:'user',content:JSON.stringify({message:input.message,profileContext:input.profileContext,draft:input.draft??'',target:input.target??(input.action==='resume_experience'?'experience':'about')})}];
  const call=()=>transport(CHAT,{headers:{Authorization:'Bearer '+access,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({model:config.model,messages,temperature:0.2,max_tokens:1400,stream:false}),signal,caPem:config.caPem});
  let result=await call();
  if(result.status===401){cached=undefined;access=await token(config,signal,true);result=await call()}
  if(result.status===429)throw new AIProviderError('LIMIT',429);
  if(result.status!==200)throw new AIProviderError('PROVIDER');
  const body=result.body;
  if(!record(body)||!Array.isArray(body.choices)||!record(body.choices[0])||!record(body.choices[0].message)||typeof body.choices[0].message.content!=='string')throw new AIProviderError('FORMAT');
  if(body.choices[0].finish_reason==='length')throw new AIProviderError('FORMAT');
  let parsed:unknown;try{parsed=JSON.parse(body.choices[0].message.content)}catch{throw new AIProviderError('FORMAT')}
  if(!validAIAnswer(parsed))throw new AIProviderError('FORMAT');
  const target=input.action==='resume_experience'||input.target==='experience'?'experience':'about';
  if(parsed.type==='result'&&(!parsed.content[target]||Object.keys(parsed.content).some(k=>k!==target)))throw new AIProviderError('FORMAT');
  return parsed;
 };
}
