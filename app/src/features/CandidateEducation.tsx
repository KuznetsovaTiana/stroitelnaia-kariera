import type { Envelope } from '../domain/types';
import type { Profile } from '../domain/b1-types';
import { getVerifiedProfile } from '../services/universityDataProvider';
import { textSource } from './ProfileDescription';
export function CandidateEducation({ state, student }: {
  state: Envelope;
  student: Profile;
}) {
  const verified = getVerifiedProfile(state, student.id);
  const self = student.professional;
  return <div className="columns">
    <section>
      <h3>Подтверждённые данные</h3>
      <p className="profile-source">Источник: университет · демонстрационный учебный набор</p>
      {verified
        ? <>
          <p>{verified.university} · {verified.educationProgram} · {verified.course} курс</p>
          <p>Изученные дисциплины: {verified.disciplines.join(', ')}</p>
          <p>Учебные навыки: {verified.verifiedSkills.join(', ')}</p>
          {verified.verifiedProjects.map(candidateProject => <p key={candidateProject.id}>Учебный проект: {candidateProject.title}. {candidateProject.contribution}</p>)}
        </>
        : <p>Учебные сведения не добавлены.</p>}
    </section>
    <section>
      <h3>Информация от студента</h3>
      <p>Интересы: {student.interests || 'Не указаны'}</p>
      {self?.about
        && <>
          <p className="profile-source">
            {textSource(self.textSources?.about)}
          </p>
          <p className="prewrap">
            {self.about}
          </p>
        </>}
      {self?.experienceSummary
        && <>
          <h4>Учебный и практический опыт</h4>
          <p className="profile-source">
            {textSource(self.textSources?.experienceSummary)}
          </p>
          <p className="prewrap">
            {self.experienceSummary}
          </p>
        </>}
      {!!self?.selfSkills.length && <p>Заявленные навыки: {self.selfSkills.join(', ')}</p>}
    </section>
  </div>;
}
