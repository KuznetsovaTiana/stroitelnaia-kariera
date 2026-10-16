import { useState } from 'react';
import type { Organization, PracticeOffer } from '../domain/b2-types';

/** Compact company identifier, ready for a local logo without layout changes. */
export function CompanyLogo({name,logoUrl}:{name:string;logoUrl?:string}){
 const [failedUrl,setFailedUrl]=useState<string>();
 const initials=name.replace(/\s*[—–]\s*демо$/i,'').split(/\s+/).slice(0,2).map(word=>word[0]).join('').toLocaleUpperCase('ru');
 return <div className="company-logo">
  {logoUrl&&failedUrl!==logoUrl?<img src={logoUrl} alt={'Логотип компании «'+name+'»'} onError={()=>setFailedUrl(logoUrl)}/>:<span aria-label={'Условный знак компании «'+name+'»'}>{initials||'К'}</span>}
 </div>;
}

export function CompanyCard({company,offers}:{company:Organization;offers:PracticeOffer[]}){
 const regions=[...new Set(offers.map(o=>o.region).filter(Boolean))];
 const directions=[...new Set(offers.map(o=>o.programId).filter(Boolean))];
 return <article className="card company-card" aria-labelledby={'company-title-'+company.id}>
  <CompanyLogo name={company.name} logoUrl={company.logoUrl}/>
  <div className="company-card-copy"><h2 id={'company-title-'+company.id}>{company.name}</h2><p>{company.description}</p>
   {offers.length>0&&<dl className="company-card-facts"><div><dt>Где есть предложения</dt><dd>{regions.join(' · ')||'Регион не указан'}</dd></div><div><dt>Направления</dt><dd>{directions.join(' · ')||'Не указаны'}</dd></div></dl>}
  </div>
  <div className="company-card-footer"><p className="company-offer-count">Открытых предложений: <strong>{offers.length}</strong></p><a className="button" href={'#/companies/'+company.id}>Карточка компании <span aria-hidden="true">→</span></a></div>
 </article>;
}
