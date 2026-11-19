// OperationsError lives in packages/command-client so the shared command
// client, tool/ and operations/ throw one error class. Re-exported here so
// every existing import keeps working and `instanceof` stays true.
export * from "../../../packages/command-client/src/errors.mjs";
