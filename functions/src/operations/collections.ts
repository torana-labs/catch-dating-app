/** Firestore collections the operations engine persists. Decisions,
 * publication plans and rule proposals/evaluations live only in memory. */
export const operationCollections = {
  runs: "operationRuns",
  workItems: "operationWorkItems",
  actionReceipts: "operationActionReceipts",
  leases: "operationLeases",
} as const;

export type OperationCollectionName =
  typeof operationCollections[keyof typeof operationCollections];
