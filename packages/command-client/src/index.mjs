// Shared core for catalog-driven command clients: the admin action CLI
// (catch-admin), the product command CLI (catch), the command tools library
// and repository tooling under tool/. Node built-ins only. See ../README.md.
export {adminActionCatalogPath, assembleAdminActionCatalog, readAdminActionCatalog} from "./admin-catalog.mjs";
export {parseCommandLine, parseFlags, camel, positiveInteger, isMainModule} from "./argv.mjs";
export {canonicalize, stableStringify, hashValue, hashText, shortHash, cloneJson} from "./canonical-json.mjs";
export {EFFECT_CONFIRMATION_POLICY, confirmationPolicy} from "./confirmation-policy.mjs";
export {successEnvelope, failureEnvelope, runCli} from "./envelope.mjs";
export {OperationsError, invariant, asOperationsError} from "./errors.mjs";
export {executeWithReceipts} from "./execution.mjs";
export {LocalReceiptStore} from "./receipt-store.mjs";
export {CallableTransport, callableBaseUrl, callableUrl, isIndeterminateTransportError} from "./transport.mjs";
export {exchangeAppCheckDebugToken, exchangeCustomToken} from "./tokens.mjs";
