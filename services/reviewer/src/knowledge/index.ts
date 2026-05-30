import basic from './basic.js';
import magento from './magento.js';
import reviewPlan from './review-plan.js';

export const knowledgePacks: Record<string, string> = {
  'review-plan': reviewPlan,
  basic,
  magento,
};
