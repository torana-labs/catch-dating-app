// Shared core for catalog-driven command clients: the admin action CLI
// (catch-admin) and the product command CLI (catch). See README.md.
export {parseCommandLine, parseFlags, camel, positiveInteger, isMainModule} from "./argv.mjs";
export {successEnvelope, failureEnvelope, runCli} from "./envelope.mjs";
export {executeWithReceipts} from "./execution.mjs";
export {LocalReceiptStore} from "./receipt-store.mjs";
export {CallableTransport, callableBaseUrl, isIndeterminateTransportError} from "./transport.mjs";
export {EFFECT_CONFIRMATION_POLICY, confirmationPolicy} from "./confirmation-policy.mjs";
export {inputJsonSchema, loadCommandCatalog, publicCommand, requireCommand, schemaIssues} from "./command-catalog.mjs";
