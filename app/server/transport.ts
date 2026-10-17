import {request} from 'node:https';
import {rootCertificates} from 'node:tls';
export interface HTTPResult {status:number;body:unknown}
export type Transport=(url:string,options:{headers:Record<string,string>;body:string;signal:AbortSignal;caPem?:string})=>Promise<HTTPResult>;
/** Strict TLS by default; optional additional CA extends, never replaces, public trust. */
export const secureTransport:Transport=(url,options)=>new Promise((resolve,reject)=>{
 const req=request(url,{method:'POST',headers:options.headers,signal:options.signal,...(options.caPem?{ca:[...rootCertificates,options.caPem.split(String.fromCharCode(92)+'n').join(String.fromCharCode(10))]}:{})},res=>{
  const chunks:Buffer[]=[];let bytes=0;
  res.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>256000){req.destroy(new Error('Provider response too large'));return}chunks.push(chunk)});
  res.on('end',()=>{try{resolve({status:res.statusCode??502,body:JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown})}catch{reject(new Error('Invalid provider JSON'))}});
  res.on('error',reject);
 });
 req.on('error',reject);req.end(options.body);
});
