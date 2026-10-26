/**
 * The manager application-review mutation budget. Community membership
 * decisions deliberately share it, so both callables import this one limit.
 */
export const applicationReviewRateLimit = {
  maxRequests: 60, windowMs: 60 * 1000,
};
