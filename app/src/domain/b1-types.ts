import type { ProfessionalProfile } from './profile-details';
import type { Entity, Student, EducationRecord, Application, CorrectionRequest, AuditEvent } from './types';
export interface Profile extends Student { professional?:ProfessionalProfile; schedule:string; relocate:boolean; visibility:'visible'|'hidden'; group?:string }
export interface Education extends EducationRecord { skills:string[]; history:{requestId:string;fieldPath:string;oldValue:string;newValue:string;at:string;resolution:string}[] }
export interface Project extends Entity {studentId:string;title:string;task:string;contribution:string;tools:string[];outcome:string;source:'university_demo'|'student';programId:string}
export interface Resume extends Entity {studentId:string;title:string;target:string;summary:string;projectIds:string[];skillClaims:string[];status:'draft'|'ready';primary:boolean;origin:'student'|'scripted_assistant'}
export interface SentApplication extends Application {resumeSnapshot:Application['resumeSnapshot'] & Partial<Pick<Resume,'target'|'skillClaims'|'origin'>>;resumeId?:string;educationSnapshot?:Education;projectSnapshot?:Project[];history?:{at:string;text:string;selectionStatus?:Application['selectionStatus']}[];offerResponse?:'none'|'pending'|'accepted'|'declined'}
export interface Correction extends CorrectionRequest {oldValue:string;recordVersion:number}
export interface AssistantDraft {branch:string;answers:string[];preview:string;simulateError:boolean;step:number}
export interface B1Changes {profiles:Record<string,Profile>;education:Record<string,Education>;projects:Record<string,Project>;resumes:Record<string,Resume>;corrections:Correction[];applications:SentApplication[];events:AuditEvent[];searches:{id:string;userId:string;title:string;url:string}[];lastSearch:Record<string,string>;assistant:Record<string,AssistantDraft>}
export const emptyB1=():B1Changes=>({profiles:{},education:{},projects:{},resumes:{},corrections:[],applications:[],events:[],searches:[],lastSearch:{},assistant:{}});
export type FactorStatus='match'|'partial'|'mismatch'|'unknown';
export interface MatchFactor {name:string;weight:number;status:FactorStatus;description:string;evidenceRefs:string[]}
export interface MatchResult {score:number|null;coverage:number;factors:MatchFactor[];constraints:{status:'mismatch'|'unknown';text:string;evidenceRefs:string[]}[];eligible:boolean}


