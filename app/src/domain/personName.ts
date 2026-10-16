import type { PersonName } from './types';
/** Keep existing data until all components of an official name are supplied. */
export function officialName(person:PersonName|undefined):string {
 if(!person)return '';
 return person.firstName&&person.lastName&&person.patronymic?[person.lastName,person.firstName,person.patronymic].join(' '):person.name;
}
