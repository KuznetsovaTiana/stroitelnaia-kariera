import {describe,it,expect} from 'vitest';
import {initialState,seed} from '../data/seed';
import {dataFor,saveProfessional,saveProfile,submitApplication} from './b1';
import {emptyProfessional,validProfessional} from './profile-details';
import {switchPersona} from './operations';
import {decode} from '../storage/storage';
describe('Профессиональные сведения профиля',()=>{
 it('сохраняет свои сведения между ролями и reload, не меняя отправленные снимки',()=>{
  const state=submitApplication(initialState(),'offer_pto_demo','resume_0',true).state;
  const before=JSON.stringify(dataFor(state).applications[0].resumeSnapshot);
  const details=emptyProfessional();details.languages=[{name:'Русский',level:'Родной',source:'student'}];details.selfSkills=['Чтение чертежей'];details.contacts.email='student@example.invalid';
  const saved=saveProfessional(state,details);
  const switched=switchPersona(switchPersona(saved,'employer_sever_demo',seed),'persona_anna',seed);
  const restored=decode(JSON.stringify(switched));
  expect(dataFor(restored).students[0].professional).toEqual(details);
  expect(JSON.stringify(dataFor(restored).applications[0].resumeSnapshot)).toBe(before);
  expect(dataFor(restored).students[1].professional).toBeUndefined();
 });
 it('не позволяет студенту присвоить своим сведениям источник вуза или работодателя',()=>{
  const details=emptyProfessional();details.languages=[{name:'Русский',level:'Родной',source:'student'}];
  expect(validProfessional({...details,languages:[{...details.languages[0],source:'university'}]})).toBe(false);
  expect(()=>saveProfessional(initialState(),{...details,achievements:[{title:'Курс',description:'',source:'employer'}]} as never)).toThrow();
  expect(()=>saveProfessional(switchPersona(initialState(),'employer_sever_demo',seed),details)).toThrow();
 });
 it('проверяет порядок дат, email и пределы, не повреждая исходное состояние',()=>{
  const state=initialState(),details=emptyProfessional();
  details.experience=[{company:'Учебная компания',position:'Практикант',start:'2026-05',end:'2026-04',description:'',skills:[],source:'student'}];
  expect(()=>saveProfessional(state,details)).toThrow();
  expect(validProfessional({...emptyProfessional(),contacts:{phone:'',email:'wrong',telegram:''}})).toBe(false);
  expect(validProfessional({...emptyProfessional(),selfSkills:Array(21).fill('Навык')})).toBe(false);
  expect(state.changes.b1).toBeUndefined();
 });
 it('принимает старое сохранение без новых полей и сохраняет видимость при обновлении деталей',()=>{
  const state=initialState();expect(()=>decode(JSON.stringify(state))).not.toThrow();
  const profile=dataFor(state).students[0],hidden=saveProfile(state,{...profile,visibility:'hidden'});
  const next=saveProfessional(hidden,emptyProfessional());
  expect(dataFor(decode(JSON.stringify(next))).students[0].visibility).toBe('hidden');
 });
});
