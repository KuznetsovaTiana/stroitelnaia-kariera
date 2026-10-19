import type { PersonName } from './types';
/** Keep existing data until all components of an official name are supplied. */
export function officialName(person: PersonName | undefined): string {
  if (!person) return '';
  return person.firstName && person.lastName && person.patronymic
    ? [person.lastName, person.firstName, person.patronymic].join(' ')
    : person.name;
}

// Fixed demo assignments: names remain stable between renders and role switches.
const demoPatronymics: Record<string, string> = {
  'Анна Миронова': 'Сергеевна',
  'Илья Соколов': 'Андреевич',
  'Мария Лебедева': 'Александровна',
  'Денис Волков': 'Олегович',
  'Ольга Белова': 'Викторовна',
  'Артём Орлов': 'Дмитриевич',
  'Елена Крылова': 'Павловна',
  'Павел Зайцев': 'Михайлович',
  'Дарья Морозова': 'Игоревна',
  'Максим Лукин': 'Романович',
  'Вера Тихонова': 'Алексеевна',
  'Никита Лазарев': 'Владимирович',
  'Алексей Громов': 'Николаевич',
  'Елена Данилова': 'Васильевна'
};
export function withDemoPatronymic<T extends PersonName>(person: T): T {
  const short = person.name.split(' · ')[0].split(' ');
  const firstName = person.firstName ?? short[0];
  const lastName = person.lastName ?? short[1];
  const patronymic = person.patronymic ?? demoPatronymics[firstName + ' ' + lastName];
  if (!firstName || !lastName || !patronymic) return person;
  const suffix = person.name.includes(' · ') ? ' · ' + person.name.split(' · ').slice(1).join(' · ') : '';
  return {
    ...person,
    firstName,
    lastName,
    patronymic,
    name: [lastName, firstName, patronymic].join(' ') + suffix
  };
}
