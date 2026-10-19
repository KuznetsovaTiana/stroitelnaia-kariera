import { CaseInMark } from './CaseInMark';

export function PartnerMarks() {
  return <div className="partner-marks" aria-label="Логотипы CASE-IN и Вектор развития">
    <CaseInMark />
    <span className="vector-development-mark">
      <img src="./brand/vector-development.png" alt="Вектор развития" width="1536" height="1024" />
    </span>
  </div>;
}
