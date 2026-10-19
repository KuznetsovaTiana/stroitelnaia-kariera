import { useState } from 'react';

/** Fixed-size photo slot with initials fallback; no generated or stock portraits. */
export function Avatar({ name, photoUrl, size = 'small' }: {
  name: string;
  photoUrl?: string;
  size?: 'small' | 'large';
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const initials = name.split(' · ')[0].trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('ru');
  return <span className={'avatar avatar-' + size} role="img" aria-label={'Аватар: ' + name}>
    {photoUrl && failedUrl !== photoUrl
      ? <img src={photoUrl} alt="" onError={() => setFailedUrl(photoUrl)} />
      : <span aria-hidden="true">
        {initials || '•'}
      </span>}
  </span>;
}
