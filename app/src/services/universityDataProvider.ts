import { dataFor } from '../domain/b1';
import type { Envelope } from '../domain/types';
import type { Education, Project } from '../domain/b1-types';
import type { AIContext } from '../../shared/aiContract';
export interface StudentVerifiedProfile {
  studentId: string; university: string; educationProgram: string; specialization: string; course: number;
  academicPerformance: { discipline: string; result: string }[];
  disciplines: string[]; additionalDisciplines: string[]; verifiedSkills: string[];
  achievements: string[]; verifiedProjects: Project[]; source: 'university_demo'; sourceDate: string; version: number;
}
export interface UniversityDataProvider { getVerifiedProfile(studentId: string): Promise<StudentVerifiedProfile | undefined> }
function normalize(state: Envelope, studentId: string): StudentVerifiedProfile | undefined {
  const data = dataFor(state), student = data.students.find(candidateStudent => candidateStudent.id === studentId), education: Education | undefined = data.education.find(candidateEducation => candidateEducation.studentId === studentId);

  if (!student || !education) return undefined;

  return {
    studentId,
    university: data.universities.find(u => u.id === student.universityId)?.name ?? 'МГСУ',
    educationProgram: student.programId,
    specialization: student.programId,
    course: student.course,

    academicPerformance: education.disciplines.map(d => ({ discipline: d.name, result: d.result })),
    disciplines: education.disciplines.map(d => d.name),
    additionalDisciplines: [],
    verifiedSkills: [...education.skills],
    achievements: [],

    verifiedProjects: data.projects.filter(candidateProject => candidateProject.studentId === studentId && candidateProject.source === 'university_demo').map(candidateProject => structuredClone(candidateProject)),
    source: 'university_demo',
    sourceDate: education.sourceDate,
    version: education.version
  };
}
export function mockUniversityDataProvider(state: Envelope): UniversityDataProvider {
  return {
    async getVerifiedProfile(id) {
      return normalize(state, id)
    }
  }
}
/** Synchronous selector for the existing local demo; shares the exact provider normalization. */
export const getVerifiedProfile = normalize;
export function aiProfileContext(profile: StudentVerifiedProfile | undefined): AIContext {
  return {
    university: profile?.university ?? '',
    educationProgram: profile?.educationProgram ?? '',
    course: profile?.course ?? 1,
    disciplines: profile?.disciplines.slice(0, 20) ?? [],
    verifiedSkills: profile?.verifiedSkills.slice(0, 20) ?? [],
    source: 'university_demo'
  };
}
