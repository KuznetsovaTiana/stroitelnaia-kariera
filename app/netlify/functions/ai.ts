import {handleAI} from '../../server/aiHandler';
export default handleAI;
export const config={rateLimit:{windowLimit:12,windowSize:60,aggregateBy:['ip','domain'],action:'rate_limit'}};
