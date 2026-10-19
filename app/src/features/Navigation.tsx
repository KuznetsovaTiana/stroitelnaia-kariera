import { canEmployer } from '../domain/access';
import type { Envelope } from '../domain/types';
import type { Role } from '../domain/types';
type Link = [string, string];
const homes = {
  student: '/student',
  employer: '/employer',
  coordinator: '/university',
  operator: '/operator'
};
const primary: Record<Role, Link[]> = {
  student: [
    ['/student', 'Главная'],
    ['/practices', 'Поиск'],
    ['/student/applications', 'Отклики'],
    ['/student/practices', 'Практика'],
    ['/student/profile', 'Профиль']
  ],
  employer: [
    ['/employer', 'Главная'],
    ['/employer/students', 'Кандидаты'],
    ['/employer/applications', 'Отклики'],
    ['/employer/practices', 'Предложения'],
    ['/employer/more', 'Ещё']
  ],
  coordinator: [
    ['/university', 'Главная'],
    ['/university/approvals', 'Практики'],
    ['/university/students', 'Студенты'],
    ['/university/analytics', 'Отчёты'],
    ['/university/more', 'Ещё']
  ],
  operator: [
    ['/operator', 'Главная'],
    ['/operator/organizations', 'Компании'],
    ['/operator/offers', 'Объявления'],
    ['/operator/appeals', 'Обращения'],
    ['/operator/more', 'Ещё']
  ]
};
const groups: Record<Role, [string, Link[]][]> = {
  student: [
    [
      'Поиск',
      [
        ['/practices', 'Практики'],
        ['/jobs', 'Работа и стажировки'],
        ['/companies', 'Компании'],
        ['/student/saved', 'Избранное и поиски'],
        ['/professions', 'Профессии и навыки']
      ]
    ],
    [
      'Профиль',
      [
        ['/student/profile', 'Профиль'],
        ['/student/education', 'Образование'],
        ['/student/resumes', 'Мои резюме'],
        ['/student/settings', 'Видимость']
      ]
    ]
  ],
  employer: [
    ['Подбор', [['/employer/students', 'Кандидаты'], ['/employer/applications', 'Отклики']]],
    [
      'Предложения',
      [['/employer/practices', 'Места практики'], ['/employer/jobs', 'Вакансии и стажировки']]
    ],
    ['Практика', [['/employer/interns', 'Практиканты']]],
    [
      'Компания',
      [
        ['/employer/company', 'Профиль компании'],
        ['/employer/team', 'Команда'],
        ['/employer/university-requests', 'Запросы вузов'],
        ['/employer/analytics', 'Аналитика']
      ]
    ]
  ],
  coordinator: [
    [
      'Учебный процесс',
      [
        ['/university/company-requests', 'Запросы мест'],
        ['/university/requirements', 'Требования'],
        ['/university/templates', 'Шаблоны']
      ]
    ],
    [
      'Университет',
      [
        ['/university/profile', 'Профиль вуза'],
        ['/university/programs', 'Программы'],
        ['/university/import', 'Тестовый импорт']
      ]
    ]
  ],
  operator: [
    [
      'Управление',
      [
        ['/operator/dictionaries', 'Справочники'],
        ['/operator/content', 'Контент'],
        ['/operator/users', 'Участники'],
        ['/operator/reports', 'Отчётность']
      ]
    ],
    [
      'Контроль демонстрации',
      [['/operator/ai-quality', 'Архив примеров'], ['/operator/integrations', 'Симуляция интеграций']]
    ]
  ]
};
function allowed(state: Envelope, url: string) {
  if (!url.startsWith('/employer/') || url.endsWith('/more') || url.endsWith('/interns')
    || url.includes('/practice-cases/')) return true;
  return canEmployer(
    state,
    url.includes('/students')
      ? 'search'
      : url.includes('/applications') || url.includes('/offers/')
        ? 'selection'
        : url.endsWith('/team') || url.endsWith('/company')
          ? 'team'
          : url.endsWith('/analytics') ? 'analytics' : url.endsWith('/university-requests') ? 'read' : 'publish'
  );
}
function active(
  url: string,
  route: string,
  role: Role
) {
  const path = route.split('?')[0];
  if (url === homes[role]) return path === url;
  if (url === '/practices') return /^\/(practices|jobs|companies|professions)(\/|$)/.test(path) || path === '/student/saved';
  if (url === '/student/profile') return /^\/student\/(profile|education|projects|resumes|settings)(\/|$)/.test(path);
  if (url === '/employer/practices') return /^\/employer\/(practices|jobs)(\/|$)/.test(path);
  if (url === '/employer/applications') return /^\/employer\/(applications|offers)(\/|$)/.test(path);
  if (url === '/employer/interns') return /^\/employer\/(interns|practice-cases)(\/|$)/.test(path);
  if (url === '/university/approvals') return /^\/university\/(approvals|practices)(\/|$)/.test(path);
  return path === url || path.startsWith(url + '/');
}
export function Navigation({ role, route, state }: {
  role: Role;
  route: string;
  state: Envelope;
}) {
  const links = primary[role].filter(([url]) => allowed(state, url));
  if (role === 'employer' && !canEmployer(state, 'search')) links.splice(1, 0, ['/employer/interns', 'Практиканты']);
  return <aside className="sidebar">
    <a className="brand" href="#/" aria-label="Строительная карьера — приветственная страница">
      <span className="brandmark">
        <img src="./brand/site-logo.svg" alt="" width="352" height="200" aria-hidden="true" />
      </span>
      <span>Строительная<br />карьера</span>
    </a>
    <nav aria-label="Основная навигация">
      {links.map(([url, label]) => <a key={url} href={'#' + url} aria-current={active(url, route, role) ? 'page' : undefined}>
        {label}
      </a>)}
    </nav>
    {role === 'student'
      && <a
        className="desktop-more"
        href="#/student/more"
        aria-current={route === '/student/more' ? 'page' : undefined}



      >Ещё</a>}
  </aside>;
}
export function ContextNavigation({ role, route, expanded = false, state }: {
  role: Role;
  route: string;
  expanded?: boolean;
  state: Envelope;
}) {
  const visible = groups[role].map(([title, links]) => [title, links.filter(([url]) => allowed(state, url))] as [string, Link[]])
    .filter(([, links]) => links.length);
  if (expanded) return <div className="more-groups">
    {visible.map(([title, links]) => <section key={title}>
      <h2>
        {title}
      </h2>
      <nav aria-label={title}>
        {links.map(([url, label]) => <a href={'#' + url} key={url}>{label} →</a>)}
      </nav>
    </section>)}
    <section>
      <h2>Связь и настройки</h2>
      <nav>
        <a href="#/messages">Сообщения</a>
        <a href="#/support">Поддержка</a>
        <a href="#/settings/notifications">Настройки уведомлений</a>
      </nav>
    </section>
  </div>;
  const path = route.split('?')[0];
  if (path === homes[role] || path.endsWith('/more') || path === '/student/profile') return null;
  const group = visible.find(([, links]) => links.some(([url]) => path === url || path.startsWith(url + '/')));
  return group
    ? <nav className="context-nav" aria-label={group[0]}>
      {group[1].map(([url, label]) => <a
        href={'#' + url}
        key={url}
        aria-current={path === url || path.startsWith(url + '/') ? 'page' : undefined}



      >
        {label}
      </a>)}
    </nav>
    : null;
}
