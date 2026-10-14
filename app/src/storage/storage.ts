import { validC } from './validateC';
import { validB2 } from './validateB2';
import { validB1 } from './validateB1';
import type { Envelope } from '../domain/types';
import { initialState, seed } from '../data/seed';
export const KEY='stroitelnaia-kariera:demo:v1';
export interface StoragePort {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
export function decode(raw:string):Envelope {
 const v=JSON.parse(raw);
 if(v?.schemaVersion!==1||v.seedVersion!==1) throw new Error('Неизвестная версия сохранения. Данные не перезаписаны.');
 if(!Number.isInteger(v.revision)||v.revision<0||!seed.personas.some(p=>p.id===v.activePersonaId)||typeof v.demoClock!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.demoClock)||!Number.isFinite(Date.parse(v.demoClock))||new Date(v.demoClock).toISOString().slice(0,10)!==v.demoClock||!v.changes||!v.changes.interests||typeof v.changes.interests!=='object'||Array.isArray(v.changes.interests)||!Object.values(v.changes.interests).every(t=>typeof t==='string'&&t.length<=600)||!Array.isArray(v.changes.favorites)||!v.changes.favorites.every((id:unknown)=>typeof id==='string')||!Array.isArray(v.changes.notifications)||!v.changes.notifications.every((n:unknown)=>typeof n==='object'&&n!==null&&'text' in n&&typeof n.text==='string'&&'recipientId' in n&&typeof n.recipientId==='string')) throw new Error('Сохранение повреждено. Восстановите исходный набор или продолжайте в памяти.');
 if(v.changes.b1!==undefined&&!validB1(v.changes.b1))throw new Error('Сохранение B1 повреждено. Восстановите исходный набор.');
 if(v.changes.b2!==undefined&&!validB2(v.changes.b2))throw new Error('Сохранение B2 повреждено. Восстановите исходный набор.');
 if(v.changes.c!==undefined&&!validC(v.changes.c))throw new Error('Сохранение C повреждено. Восстановите исходный набор.');
 return v;
}
export function load(storage:StoragePort):{state:Envelope;error:string} {try {const raw=storage.getItem(KEY);return {state:raw?decode(raw):initialState(),error:''};}catch(e){return {state:initialState(),error:e instanceof Error?e.message:'Хранилище недоступно'};}}
export function persist(storage:StoragePort,state:Envelope) {const raw=JSON.stringify({...state,savedAt:new Date().toISOString()});if(new TextEncoder().encode(raw).length>1024*1024) throw new Error('Превышен бюджет хранения. Предлагается сброс демонстрации.');storage.setItem(KEY,raw);}
export function reset(storage:StoragePort) {storage.removeItem(KEY);return initialState();}



