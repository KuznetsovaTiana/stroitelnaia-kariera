
import type { CChanges, Subrole } from './c-types';
import type { B2Changes } from './b2-types';
import type { B1Changes } from './b1-types';
export type Role = 'student' | 'employer' | 'coordinator' | 'operator';
export interface Entity {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface PersonName {
  photoUrl?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  patronymic?: string;
}
export interface Persona extends PersonName {
  id: string;
  role: Role;
  name: string;
  studentId?: string;
  organizationId?: string;
  subrole?: Subrole;
  active?: boolean;
}
export interface Student extends Entity, PersonName {
  name: string;
  universityId: string;
  programId: string;
  course: number;
  region: string;
  interests: string;
  skills: string[];
  availability: [string, string];
}
export interface EducationRecord extends Entity {
  studentId: string;
  source: 'university_demo';
  sourceDate: string;
  disciplines: {
    name: string;
    result: string;
  }[];
}
export interface Company extends Entity {
  logoUrl?: string;
  name: string;
  status: 'approved' | 'pending' | 'rejected' | 'draft' | 'suspended';
}
export interface Offer extends Entity {
  paid?: boolean;
  schedule?: 'Полный день' | 'Гибкий график';
  minCourse?: number;
  maxCourse?: number;
  companyId: string;
  kind: 'practice' | 'job' | 'internship';
  title: string;
  programId: string;
  region: string;
  status: 'published' | 'draft' | 'rejected' | 'pending_moderation' | 'changes_requested' | 'archived';
  skills: string[];
  startDate: string;
  endDate: string;
  capacity: number;
  supervisor: string;
}
export type PracticeStatus = 'awaiting_university' |
  'changes_requested' |
  'approved' |
  'in_progress' |
  'review' |
  'completed' |
  'cancelled';
export interface PracticeCase extends Entity {
  studentId: string;
  applicationId: string;
  offerId: string;
  status: PracticeStatus;
  academicResult: 'not_assessed' | 'credited' | 'not_credited' | 'needs_revision';
  reservationActive: boolean;
}
export interface Application extends Entity {
  studentId: string;
  offerId: string;
  selectionStatus: 'submitted' | 'viewed' | 'info_requested' | 'interview' | 'offered' | 'rejected' | 'withdrawn';
  resumeSnapshot: {
    title: string;
    summary: string;
    version: number;
  };
}
export interface Notification extends Entity {
  recipientId: string;
  eventId?: string;
  text: string;
  target: string;
  read: boolean;
}
export interface Seed {
  universities: University[];
  programs: Program[];
  personas: Persona[];
  students: Student[];
  education: EducationRecord[];
  companies: Company[];
  offers: Offer[];
  applications: Application[];
  practices: PracticeCase[];
  resumes: (Entity & {
    studentId: string;
    title: string;
    summary: string;
  })[];
  projects: (Entity & {
    studentId: string;
    title: string;
    contribution: string;
  })[];
}
export interface Changes {
  interests: Record<string, string>;
  favorites: string[];
  favoritesByUser?: Record<string, string[]>;
  notifications: Notification[];
  b1?: B1Changes;
  b2?: B2Changes;
  c?: CChanges;
}
export interface Envelope {
  schemaVersion: 1;
  seedVersion: 1;
  revision: number;
  savedAt: string;
  demoClock: string;
  activePersonaId: string;
  changes: Changes;
}

export interface University extends Entity {
  name: string;
  slug: string;
  demoOnly: true;
}
export interface Program extends Entity {
  universityId: string;
  name: string;
  skillIds: string[];
}
export interface CorrectionRequest extends Entity {
  studentId: string;
  recordId: string;
  fieldPath: string;
  proposedValue: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  resolution?: string;
}
export interface Invitation extends Entity {
  companyId: string;
  studentId: string;
  offerId: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
}
export interface PracticeDocument extends Entity {
  practiceId: string;
  templateId: string;
  templateVersion: number;
  contentSnapshot: string;
  status: 'draft' | 'in_review' | 'approved' | 'changes_requested';
  comments: string[];
}
export interface PracticeTask extends Entity {
  practiceId: string;
  title: string;
  dueDate: string;
  studentText: string;
  status: 'assigned' | 'submitted' | 'revision' | 'accepted';
}
export interface AuditEvent {
  id: string;
  actorId: string;
  type: string;
  objectRef: string;
  at: string;
  origin: 'seed' | 'visitor';
}
