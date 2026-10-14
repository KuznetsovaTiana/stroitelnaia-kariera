import type { Template } from './c-types';
import type { Entity, Offer, Company, PracticeCase, Invitation } from './types';
export type DocType='agreement'|'direction'|'assignment'|'report';
export interface Case extends PracticeCase {companyId:string;offerSnapshot:PracticeOffer;conditions:{hours:number;tasks:string;companySupervisor:string;universitySupervisor:string;notes:string};conditionsVersion:number;submittedToUniversityAt?:string;requirementSnapshot:{version:number;requiredDocuments:DocType[];minHours?:number;completionRule?:string;templates?:Template[]};reportText:string;reportVersion:number;employerFeedback:string;coordinatorFeedback:string;history:{at:string;actorId:string;text:string}[]}
export interface DocumentVersion extends Entity {practiceId:string;type:DocType;templateVersion:number;templateBody?:string;selectedFields?:string[];conditionsVersion:number;fields:Record<string,string>;status:'draft'|'in_review'|'approved'|'changes_requested';reviewSteps:{role:'employer'|'coordinator';actorId:string;decision:'approved'|'changes_requested';comment:string;at:string}[]}
export interface Task extends Entity {practiceId:string;title:string;dueDate:string;studentText:string;status:'assigned'|'submitted'|'revision'|'accepted';comments:{actorId:string;text:string;at:string}[]}
export interface Message extends Entity {contextType:'application'|'practice';contextId:string;authorId:string;text:string;requestId:string}
export interface PracticeOffer extends Offer {practiceType:string;durationHours:number;expectedTasks:string;universityCompatibility:string;moderationReason?:string;constructionDirectionId?:string}
export interface Organization extends Company {description:string;verificationReason?:string}
export interface Invite extends Invitation {applicationId?:string}
export interface B2Changes {practices:Record<string,Case>;documents:DocumentVersion[];tasks:Task[];messages:Message[];invitations:Invite[];offers:Record<string,PracticeOffer>;companies:Record<string,Organization>}
export const emptyB2=():B2Changes=>({practices:{},documents:[],tasks:[],messages:[],invitations:[],offers:{},companies:{}});
export const docNames:Record<DocType,string>={agreement:'Образец договора',direction:'Направление',assignment:'Индивидуальное задание',report:'Отчёт'};



