import type { Entity, Envelope, Persona } from './types';
import type { Profile,Education } from './b1-types';
import type { DocType } from './b2-types';
export type Subrole='owner'|'recruiter'|'manager'|'documents';
export interface TeamRule {subrole:Subrole;offerIds:string[]}
export interface PlaceRequest extends Entity {companyId:string;programId:string;start:string;end:string;requested:number;proposed:number;status:'pending'|'answered';message:string;response:string}
export interface Requirement extends Entity {programId:string;practiceType:string;minHours:number;requiredDocuments:DocType[];completionRule:string}
export interface Template extends Entity {type:DocType;body:string;fields:string[]}
export interface Ticket extends Entity {authorId:string;category:string;objectType:'offer'|'company'|'education'|'none';objectId:string;status:'open'|'in_progress'|'resolved'|'closed';comments:{actorId:string;text:string;at:string}[]}
export interface Dictionary extends Entity {category:'direction'|'skill'|'profession';name:string;active:boolean;skillIds:string[];tasks:string;programId:string}
export interface AiExample extends Entity {resumeId:string;branch:string;text:string;facts:string[];verdict:'pending'|'approved'|'needs_revision';comment:string}
export interface ImportRow {externalId:string;name:string;programId:string;course:number;group:string;skills:string[];disciplines:{name:string;result:string}[]}
export interface ImportBatch extends Entity {rows:{index:number;row:ImportRow|null;errors:string[]}[];status:'ready'|'invalid'|'applied';appliedIds:string[]}
export interface CChanges {requests:PlaceRequest[];requirements:Requirement[];templates:Template[];tickets:Ticket[];dictionaries:Dictionary[];aiExamples:AiExample[];team:Record<string,TeamRule>;inactive:string[];universityDescription:string;programs:Record<string,{name:string;skills:string[];group:string}>;content:Record<string,string>;notificationSettings:Record<string,{recommendations:boolean}>;integrationChecks:{id:string;at:string;success:boolean;message:string}[];batches:ImportBatch[];importedProfiles:Record<string,Profile>;importedEducation:Record<string,Education>}
export const emptyC=():CChanges=>({requests:[],requirements:[],templates:[],tickets:[],dictionaries:[],aiExamples:[],team:{},inactive:[],universityDescription:'МГСУ — учебный контекст демонстрации. Программы иллюстративны, официального обмена данными нет.',programs:{},content:{},notificationSettings:{},integrationChecks:[],batches:[],importedProfiles:{},importedEducation:{}});
export const cState=(s:Envelope)=>s.changes.c??emptyC();
export const extraEmployees:Persona[]=[{id:'employer_recruiter_demo',role:'employer',name:'Рекрутер — демо',organizationId:'company_sever_demo',subrole:'recruiter'},{id:'employer_manager_demo',role:'employer',name:'Руководитель отдела — демо',organizationId:'company_sever_demo',subrole:'manager'},{id:'employer_documents_demo',role:'employer',name:'Документовед — демо',organizationId:'company_sever_demo',subrole:'documents'}];
