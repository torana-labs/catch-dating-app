/**
 * Room presence timing from
 * contracts/catalogs/event_success_presence_policy.json. presencePolicy.test.ts
 * fails when these values and the catalog differ.
 */
export const eventSuccessPresencePolicyCatalog = {
  heartbeatIntervalSeconds: 30,
  presentWindowSeconds: 90,
  likelyDepartedAfterSeconds: 300,
} as const;
