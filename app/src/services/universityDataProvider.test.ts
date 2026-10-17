import {describe,it,expect} from 'vitest';
import {initialState,seed} from '../data/seed';
import {dataFor,saveProfessional,saveResume,submitApplication} from '../domain/b1';
import {emptyProfessional} from '../domain/profile-details';
import {switchPersona} from '../domain/operations';
import {decode} from '../storage/storage';
import {getVerifiedProfile,mockUniversityDataProvider,aiProfileContext} from './universityDataProvider';
describe('Два источника профиля',()=>{
 it('провайдер использует единый учебный набор без вымышленных дополнительных фактов',async()=>{const state=initialState(),id=dataFor(state).students[0].id,profile=getVerifiedProfile(state,id)!;expect(await mockUniversityDataProvider(state).getVerifiedProfile(id)).toEqual(profile);expect(profile.academicPerformance[0].result).toBe(dataFor(state).education[0].disciplines[0].result);expect(profile.achievements).toEqual([]);expect(profile.verifiedProjects.every(p=>p.source==='university_demo')).toBe(true);expect(Object.keys(aiProfileContext(profile))).not.toContain('academicPerformance')});
 it('одобренные тексты сохраняются как selfReported, не меняя вуз и отправленный снимок',()=>{const initial=submitApplication(initialState(),'offer_pto_demo','resume_0',true).state,before=getVerifiedProfile(initial,'student_anna_demo'),snapshot=dataFor(initial).applications[0].resumeSnapshot;const saved=saveProfessional(initial,{...emptyProfessional(),about:'Интересуют графики работ',experienceSummary:'В курсовой составила график',textSources:{about:'ai_assisted',experienceSummary:'mock_assisted'}});const resume=dataFor(saved).resumes[0];const updated=saveResume(saved,{...resume,experienceSummary:'Описание курсовой',origin:'ai_assisted'});const restored=decode(JSON.stringify(switchPersona(updated,'employer_sever_demo',seed)));expect(dataFor(restored).students[0].professional?.textSources?.about).toBe('ai_assisted');expect(getVerifiedProfile(restored,'student_anna_demo')).toEqual(before);expect(dataFor(restored).applications[0].resumeSnapshot).toEqual(snapshot);expect(dataFor(restored).resumes[0].experienceSummary).toBe('Описание курсовой')});
});
