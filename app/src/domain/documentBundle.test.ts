import { expect,it } from 'vitest';
import { initialState,seed } from '../data/seed';
import { dataFor,submitApplication } from './b1';
import { switchPersona } from './operations';
import { changeSelection,respondOffer,saveCaseConditions,createDocument,latestDocuments } from './b2';
import { submitDocumentBundle } from './documentBundle';
import { practiceGuidance } from './guidance';
const as=(s:ReturnType<typeof initialState>,id:string)=>switchPersona(s,id,seed);
function prepared(){let s=initialState();const app=submitApplication(s,'offer_pto_demo','resume_0',true);s=changeSelection(as(app.state,'employer_sever_demo'),app.id,'offered','Учебное предложение');s=respondOffer(as(s,'persona_anna'),app.id,true);const c=dataFor(s).practices.find(c=>c.applicationId===app.id)!;s=saveCaseConditions(s,c.id,{...c.conditions,notes:'Учебное примечание'});return {s,id:c.id}}
it('bundle sends only current drafts atomically, repeats safely and rejects stale versions',()=>{const preparedResult=prepared();let s=preparedResult.s;const id=preparedResult.id;expect(()=>submitDocumentBundle(s,id)).toThrow('Сначала');for(const type of ['agreement','direction','assignment'] as const)s=createDocument(s,id,type);const next=submitDocumentBundle(s,id);expect(latestDocuments(next,id).every(d=>d.status==='in_review')).toBe(true);expect(latestDocuments(s,id).every(d=>d.status==='draft')).toBe(true);expect(submitDocumentBundle(next,id)).toBe(next);const c=dataFor(s).practices.find(c=>c.id===id)!;s=saveCaseConditions(s,id,{...c.conditions,notes:'Новые существенные условия'});expect(()=>submitDocumentBundle(s,id)).toThrow('Условия изменились')});
it('guidance does not claim university review before submission and ends credited cases',()=>{const {s,id}=prepared(),c=dataFor(s).practices.find(c=>c.id===id)!;expect(practiceGuidance(s,c,'student')).toMatchObject({status:'Подготовка документов',owner:'Студент'});expect(practiceGuidance(s,{...c,status:'completed',academicResult:'credited'},'student')).toMatchObject({status:'Практика зачтена',next:'Процесс завершён'})});

