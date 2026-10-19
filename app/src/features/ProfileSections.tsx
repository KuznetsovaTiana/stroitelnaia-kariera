import { AIEntryLabel } from './AIAvailability';
import type { ReactNode } from 'react';
import type { Profile, Education, Project, Resume } from '../domain/b1-types';
import type { Case, Organization } from '../domain/b2-types';
import type { ProfessionalProfile } from '../domain/profile-details';
import { Avatar } from './Avatar';
import { CompanyLogo } from './CompanyCard';
import { officialName } from '../domain/personName';
import type { StudentVerifiedProfile } from '../services/universityDataProvider';
export const dateLabel = (value: string) => value
  ? new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
  : 'Не указано';
export function ProfileSection({ id, title, action, children }: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return <section
    className="student-profile-section"
    id={'profile-' + id}
    aria-labelledby={'profile-' + id + '-title'}



  >
    <div className="profile-section-heading">
      <h2 id={'profile-' + id + '-title'}>
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>;
}
export function StudentProfileHeader({ student, details, completion, missing, onEdit }: {
  student: Profile;
  details: ProfessionalProfile;
  completion: number;
  missing: string[];
  onEdit: () => void;
}) {
  return <section className="profile-overview card">
    <div className="profile-identity">
      <Avatar name={student.name} photoUrl={student.photoUrl} size="large" />
      <div>
        <h1>
          {officialName(student)}
        </h1>
        <p>Студент · НИУ МГСУ</p>
        <p>{student.programId} · {student.course} курс</p>
      </div>
    </div>
    <div className="profile-overview-bottom">
      <span className="profile-search-status">
        {details.searchStatus}
      </span>
      <button className="primary" onClick={onEdit}>Редактировать профиль</button>
    </div>
    <div className="profile-completion">
      <label htmlFor="profile-progress">Профиль заполнен на {completion}%</label>
      <progress id="profile-progress" value={completion} max={100} />
      {missing.length > 0 && <p className="tiny">Можно дополнить: {missing.slice(0, 3).join(', ')}.</p>}
    </div>
  </section>;
}
export function ResumeSection({ resumes, student, onCreate }: {
  resumes: Resume[];
  student: Profile;
  onCreate: () => void;
}) {
  return <ProfileSection
    id="resumes"
    title="Мои резюме"
    action={<button className="profile-link" onClick={onCreate}>+ Создать резюме</button>}



  >
    <div className="profile-stack">
      {resumes.length
        ? resumes.map(candidateResume => <article className="card profile-resume" key={candidateResume.id}>
          <div className="profile-resume-heading">
            <h3>
              {candidateResume.title}
            </h3>
            <span className="tiny">
              {candidateResume.primary ? 'Основное · ' : ''}
              {candidateResume.status === 'ready' ? 'Готово для отклика' : 'Черновик'}
            </span>
          </div>
          <p>{candidateResume.target} · {student.region || 'Город не указан'}</p>
          <p className="tiny">Обновлено {dateLabel(candidateResume.updatedAt)}</p>
          <div className="profile-inline-actions">
            <a className="button" href={'#/student/resumes/' + candidateResume.id + '/edit'}>Редактировать</a>
            <a href={'#/student/resumes/' + candidateResume.id}>Посмотреть</a>
            <a className="button ai-entry" href={'#/student/resumes/' + candidateResume.id + '/assistant'}>
              <AIEntryLabel>Улучшить описание с ИИ</AIEntryLabel>
            </a>
          </div>
        </article>)
        : <p className="profile-empty">Резюме пока нет. Создайте первое, чтобы откликаться на предложения.</p>}
    </div>
  </ProfileSection>;
}
export function JobPreferencesSection({ student, details, action, editor }: {
  student: Profile;
  details: ProfessionalProfile;
  action: ReactNode;
  editor: ReactNode;
}) {
  return <ProfileSection id="search" title="Что я ищу" action={action}>
    {editor
      || <div className="card">
        <dl className="profile-facts">
          <div>
            <dt>Занятость</dt>
            <dd>
              {details.employment || 'Не указана'}
            </dd>
          </div>
          <div>
            <dt>Направления</dt>
            <dd>
              {details.directions.join(' · ') || student.programId}
            </dd>
          </div>
          <div>
            <dt>Город</dt>
            <dd>
              {student.region || 'Не указан'}
            </dd>
          </div>
          <div>
            <dt>Формат и график</dt>
            <dd>
              {[details.workFormat, student.schedule].filter(Boolean).join(' · ') || 'Не указаны'}
            </dd>
          </div>
          <div>
            <dt>Готовность приступить</dt>
            <dd>{dateLabel(student.availability[0])} — {dateLabel(student.availability[1])}</dd>
          </div>
          <div>
            <dt>Переезд</dt>
            <dd>
              {student.relocate ? 'Готовность к переезду' : 'Без переезда'}
            </dd>
          </div>
        </dl>
        {student.interests && <p className="profile-interests">
          {student.interests}
        </p>}
      </div>}
  </ProfileSection>;
}
function duration(start: string, end: string) {
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  return Number.isFinite(days) && days > 0 ? days + ' дн.' : '';
}
function months(start: string, end: string) {
  if (!start) return '';
  const finish = end || new Date().toISOString().slice(0, 7);
  const a = start.split('-').map(Number);
  const b = finish.split('-').map(Number);
  const total = (b[0] - a[0]) * 12 + b[1] - a[1] + 1;
  return total > 0 ? total + ' мес.' : '';
}
export function ExperienceSection({ cases, details, companies, action, editor }: {
  cases: Case[];
  details: ProfessionalProfile;
  companies: Organization[];
  action: ReactNode;
  editor: ReactNode;
}) {
  const statuses: Record<string, string> = {
    awaiting_university: 'На согласовании',
    changes_requested: 'Уточнение условий',
    approved: 'Согласовано',
    in_progress: 'Практика идёт',
    review: 'Проверка отчёта',
    completed: 'Завершена'
  };
  return <ProfileSection id="experience" title="Опыт и практика" action={action}>
    {editor}
    <div className="profile-stack">
      {cases.map(candidatePractice => {
        const company = companies.find(candidateCompany => candidateCompany.id === candidatePractice.companyId);
        return <article className="card profile-experience" key={candidatePractice.id}>
          <div className="profile-company">
            <CompanyLogo name={company?.name ?? 'Компания'} logoUrl={company?.logoUrl} />
            <div>
              <h3>
                {company?.name ?? 'Компания'}
              </h3>
              <p>
                {candidatePractice.offerSnapshot.title}
              </p>
            </div>
          </div>
          <p>{dateLabel(candidatePractice.offerSnapshot.startDate)} — {dateLabel(candidatePractice.offerSnapshot.endDate)} · {duration(candidatePractice.offerSnapshot.startDate, candidatePractice.offerSnapshot.endDate)}</p>
          <span className="profile-source">{candidatePractice.employerFeedback ? 'Источник: работодатель · отзыв в учебном деле' : 'Источник: дело практики'} · {statuses[candidatePractice.status]}</span>
          <p>
            {candidatePractice.conditions.tasks || candidatePractice.offerSnapshot.expectedTasks}
          </p>
          {candidatePractice.employerFeedback && <p className="tiny">Отзыв: {candidatePractice.employerFeedback}</p>}
          <a href={'#/student/practices/' + candidatePractice.id}>Открыть дело практики →</a>
        </article>;
      })}
      {details.experience.map((r, i) => <article className="card" key={i}>
        <h3>
          {r.position}
        </h3>
        <p>
          {r.company}
        </p>
        <p>{r.start} — {r.end || 'По настоящее время'} · {months(r.start, r.end)}</p>
        <span className="profile-source">Указано студентом</span>
        {r.description && <p>
          {r.description}
        </p>}
        {r.skills.length > 0 && <div className="profile-chips">
          {r.skills.map(s => <span key={s}>
            {s}
          </span>)}
        </div>}
      </article>)}
      {!cases.length && !details.experience.length && !editor
        && <p className="profile-empty">Опыт ещё не добавлен. Укажите работу или практику, если они у вас были. Учебные проекты можно показать ниже.</p>}
    </div>
  </ProfileSection>;
}
export function EducationSection({ education, student, verified }: {
  education?: Education;
  student: Profile;
  verified?: StudentVerifiedProfile;
}) {
  return <ProfileSection id="education" title="Образование">
    <div className="card">
      <h3>
        {verified?.university ?? "НИУ МГСУ"}
      </h3>
      <p>{verified?.educationProgram ?? student.programId} · {verified?.course ?? student.course} курс</p>
      <span className="profile-source">Подтверждено университетом · учебный пример</span>
      <details className="profile-disclosure">
        <summary>Программа и учебные результаты</summary>
        <p>Группа: {student.group || 'Не указана'}. Уровень образования и год выпуска в учебном наборе не указаны.</p>
        {education
          ? <>
            <p className="tiny">Сведения на {dateLabel(education.sourceDate)} · версия {education.version}</p>
            <dl className="profile-disciplines">
              {verified?.academicPerformance.map((d, i) => <div key={i}>
                <dt>
                  {d.discipline}
                </dt>
                <dd>
                  {d.result}
                </dd>
              </div>)}
            </dl>
          </>
          : <p>Учебные результаты пока не добавлены.</p>}
      </details>
      <p>Подтверждённые учебные навыки: {verified?.verifiedSkills.join(", ") || "Не указаны"}</p>
      <p className="tiny">В демонстрационной версии используются учебные данные. Сведения вуза изменяются через запрос координатору.</p>
      <a href="#/student/education/history">Запросить исправление →</a>
    </div>
  </ProfileSection>;
}
export function ProjectsSection({ projects }: {
  projects: Project[];
}) {
  return <ProfileSection
    id="projects"
    title="Проекты"
    action={<a href="#/student/projects/new">+ Добавить проект</a>}



  >
    <div className="profile-stack">
      {projects.length
        ? projects.map(candidateProject => <article className="card" key={candidateProject.id}>
          <h3>
            {candidateProject.title}
          </h3>
          <span className="profile-source">
            {candidateProject.source === 'university_demo'
              ? 'Учебный проект · источник: вуз, учебный набор'
              : 'Проект · указано студентом'}
          </span>
          <p>
            {candidateProject.task}
          </p>
          <p><strong>Мой вклад:</strong> {candidateProject.contribution}</p>
          <div className="profile-chips">
            {candidateProject.tools.map(t => <span key={t}>
              {t}
            </span>)}
          </div>
          <a href={'#/student/projects/' + candidateProject.id}>Посмотреть проект →</a>
        </article>)
        : <p className="profile-empty">Пока нет проектов. Добавьте учебный или личный проект, чтобы показать свой вклад и результат.</p>}
    </div>
  </ProfileSection>;
}
export function SkillsSection({ education, projects, details, action, editor }: {
  education?: Education;
  projects: Project[];
  details: ProfessionalProfile;
  action: ReactNode;
  editor: ReactNode;
}) {
  const groups = [
    {
      label: 'Учебные навыки',
      source: 'Источник: вуз · учебный набор',
      skills: education?.skills ?? []
    },
    {
      label: 'Инструменты проектов',
      source: 'Источники указаны в карточках проектов',
      skills: [...new Set(projects.flatMap(candidateProject => candidateProject.tools))]
    },
    {
      label: 'Дополнительные навыки',
      source: 'Указано студентом',
      skills: details.selfSkills
    }
  ];
  return <ProfileSection id="skills" title="Навыки" action={action}>
    {editor}
    <div className="card profile-skill-groups">
      {groups.filter(g => g.skills.length).map(g => <div key={g.label}>
        <h3>
          {g.label}
        </h3>
        <p className="profile-source">
          {g.source}
        </p>
        <div className="profile-chips">
          {g.skills.map(s => <span key={s}>
            {s}
          </span>)}
        </div>
      </div>)}
      {groups.every(g => !g.skills.length) && <p className="profile-empty">Навыки пока не добавлены.</p>}
    </div>
  </ProfileSection>;
}
export function AdditionalSections({ details, achievementAction, languageAction, achievementEditor, languageEditor }: {
  details: ProfessionalProfile;
  achievementAction: ReactNode;
  languageAction: ReactNode;
  achievementEditor: ReactNode;
  languageEditor: ReactNode;
}) {
  return <>
    <ProfileSection id="achievements" title="Достижения и обучение" action={achievementAction}>
      {achievementEditor
        || (details.achievements.length
          ? <div className="card profile-records">
            {details.achievements.map((a, i) => <article key={i}>
              <h3>
                {a.title}
              </h3>
              <p>
                {a.description}
              </p>
              <span className="profile-source">Указано студентом</span>
            </article>)}
          </div>
          : <p className="profile-empty">Пока нет достижений и курсов. Здесь можно указать чемпионаты, конференции и дополнительное обучение.</p>)}
    </ProfileSection>
    <ProfileSection id="languages" title="Языки" action={languageAction}>
      {languageEditor
        || (details.languages.length
          ? <dl className="card profile-languages">
            {details.languages.map((l, i) => <div key={i}>
              <dt>
                {l.name}
              </dt>
              <dd>
                {l.level}
              </dd>
            </div>)}
          </dl>
          : <p className="profile-empty">Языки пока не указаны.</p>)}
    </ProfileSection>
  </>;
}
export function ContactsSection({ details, action, editor }: {
  details: ProfessionalProfile;
  action: ReactNode;
  editor: ReactNode;
}) {
  const labels = {
    phone: 'Телефон',
    email: 'Email',
    telegram: 'Telegram'
  };
  return <ProfileSection id="contacts" title="Контакты" action={action}>
    {editor
      || <div className="card">
        <dl className="profile-facts">
          {Object.entries(details.contacts).filter(([, v]) => v).map(([key, v]) => <div key={key}>
            <dt>
              {labels[key as keyof typeof labels]}
            </dt>
            <dd>
              {v}
            </dd>
          </div>)}
        </dl>
        {!Object.values(details.contacts).some(Boolean)
          && <p className="profile-empty">Контакты пока не указаны.</p>}
        <p className="tiny">Контактные поля доступны только вам. Общение с работодателем открывается в переписке после отклика или принятого приглашения.</p>
      </div>}
  </ProfileSection>;
}

export function VisibilitySection({ student, action, editor }: {
  student: Profile;
  action: ReactNode;
  editor: ReactNode;
}) {
  return <ProfileSection id="visibility" title="Видимость" action={action}>
    {editor
      || <div className="card">
        <p>Профиль {student.visibility === 'visible' ? 'виден' : 'скрыт'} в поиске работодателей.</p>
        <p className="tiny">Скрытие из поиска не отменяет уже отправленные отклики и приглашения.</p>
      </div>}
  </ProfileSection>;
}
