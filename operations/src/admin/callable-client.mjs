import {
  CallableTransport,
  callableBaseUrl as sharedCallableBaseUrl,
} from "../../../packages/command-client/src/transport.mjs";

// The admin action CLI's view of the shared callable transport. It keeps the
// ADMIN_CALLABLE_* and ADMIN_CLI_* error codes that receipts and runbooks use.
export class FirebaseAdminCallableClient extends CallableTransport {
  constructor(options) {
    super({
      ...options,
      codePrefix: "ADMIN_CALLABLE",
      configCodePrefix: "ADMIN_CLI",
      label: "Admin callable",
      purpose: "live admin actions",
      actorType: "agent_cli",
    });
  }
}

export function callableBaseUrl({baseUrl, project, region = "asia-south1"}) {
  return sharedCallableBaseUrl({
    baseUrl,
    project,
    region,
    configCodePrefix: "ADMIN_CLI",
    projectHint: "--project or CATCH_ADMIN_FIREBASE_PROJECT",
  });
}
