import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createAIHandler } from './server/aiHandler.ts';
export default defineConfig(({mode})=>({plugins:[react(),{name:'local-ai-function',configureServer(server){
 const handler=createAIHandler({...loadEnv(mode,process.cwd(),''),...process.env});
 server.middlewares.use('/.netlify/functions/ai',async(req,res)=>{
  const controller=new AbortController();res.on('close',()=>controller.abort());
  try{const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>32000){res.statusCode=413;res.end();return}chunks.push(Buffer.from(chunk))}
   const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
   const response=await handler(new Request('http://'+req.headers.host+'/.netlify/functions/ai',{method:req.method,headers,signal:controller.signal,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));
   res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(await response.text());
  }catch{res.statusCode=503;res.end(JSON.stringify({error:'UNAVAILABLE'}))}
 });
 }}],base:'./'}));
