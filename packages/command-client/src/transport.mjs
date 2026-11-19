import {OperationsError} from "./errors.mjs";

// One HTTPS client for Firebase callables, shared by every catalog-driven CLI
// (the admin action catalog and the product command catalog). It sends the
// callable envelope with a Firebase ID token and an App Check token and turns
// every failure into an OperationsError whose code starts with `codePrefix`.
// Callers name their prefixes so existing error codes stay stable.
export class CallableTransport {
  constructor({
    baseUrl,
    idToken,
    appCheckToken,
    timeoutMs = 30_000,
    fetchImpl = globalThis.fetch,
    codePrefix = "CALLABLE",
    configCodePrefix = "COMMAND_CLI",
    label = "Callable",
    purpose = "live calls",
    actorType = "agent_cli",
    extraHeaders = {},
  }) {
    if (!baseUrl) {
      throw new OperationsError(
        `${configCodePrefix}_CONFIGURATION_INVALID`,
        "A Firebase callable base URL is required.",
        {exitCode: 2}
      );
    }
    if (!idToken) {
      throw new OperationsError(
        `${configCodePrefix}_AUTH_REQUIRED`,
        `A Firebase ID token is required for ${purpose}.`,
        {exitCode: 2}
      );
    }
    if (!appCheckToken) {
      throw new OperationsError(
        `${configCodePrefix}_APP_CHECK_REQUIRED`,
        `A Firebase App Check token is required for ${purpose}.`,
        {exitCode: 2}
      );
    }
    this.baseUrl = baseUrl.replace(/\/$/u, "");
    this.idToken = idToken;
    this.appCheckToken = appCheckToken;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
    this.codePrefix = codePrefix;
    this.label = label;
    this.actorType = actorType;
    this.extraHeaders = extraHeaders;
  }

  async invoke(callable, payload, {executionId} = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/${callable}`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${this.idToken}`,
          "content-type": "application/json",
          "x-firebase-appcheck": this.appCheckToken,
          ...this.extraHeaders,
          ...(executionId ? {
            "x-catch-actor-type": this.actorType,
            "x-catch-execution-id": executionId,
          } : {}),
        },
        body: JSON.stringify({data: payload}),
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = error?.name === "AbortError";
      throw new OperationsError(
        timedOut ? `${this.codePrefix}_TIMEOUT` : `${this.codePrefix}_NETWORK_ERROR`,
        timedOut ?
          `${this.label} ${callable} timed out.` :
          `${this.label} ${callable} could not be reached.`,
        {cause: error}
      );
    } finally {
      clearTimeout(timeout);
    }
    let body;
    try {
      body = await response.json();
    } catch (error) {
      throw new OperationsError(
        `${this.codePrefix}_INVALID_RESPONSE`,
        `${this.label} ${callable} returned non-JSON output.`,
        {cause: error, details: {status: response.status}}
      );
    }
    if (!response.ok || body?.error) {
      const remote = body?.error ?? {};
      throw new OperationsError(
        normalizeRemoteCode(this.codePrefix, remote.status, response.status),
        typeof remote.message === "string" ?
          remote.message : `${this.label} ${callable} failed.`,
        {
          details: {
            callable,
            httpStatus: response.status,
            remoteStatus: remote.status ?? null,
          },
        }
      );
    }
    if (Object.hasOwn(body ?? {}, "result")) return body.result;
    if (Object.hasOwn(body ?? {}, "data")) return body.data;
    throw new OperationsError(
      `${this.codePrefix}_INVALID_RESPONSE`,
      `${this.label} ${callable} returned no result envelope.`,
      {details: {status: response.status}}
    );
  }
}

// The HTTPS address of a deployed callable or HTTP function.
export function callableUrl({projectId, region, name}) {
  return `${functionsOrigin({projectId, region})}/${name}`;
}

function functionsOrigin({projectId, region}) {
  return `https://${region}-${projectId}.cloudfunctions.net`;
}

export function callableBaseUrl({
  baseUrl,
  project,
  region = "asia-south1",
  configCodePrefix = "COMMAND_CLI",
  projectHint = "--project",
}) {
  if (baseUrl) return baseUrl;
  if (!project) {
    throw new OperationsError(
      `${configCodePrefix}_PROJECT_REQUIRED`,
      `${projectHint} is required.`,
      {exitCode: 2}
    );
  }
  if (!/^[a-z][a-z0-9-]{3,62}$/u.test(project)) {
    throw new OperationsError(
      `${configCodePrefix}_PROJECT_INVALID`,
      "Firebase project id has an invalid format.",
      {exitCode: 2}
    );
  }
  if (!/^[a-z]+(?:-[a-z]+)+[0-9]$/u.test(region)) {
    throw new OperationsError(
      `${configCodePrefix}_REGION_INVALID`,
      "Firebase region has an invalid format.",
      {exitCode: 2}
    );
  }
  return functionsOrigin({projectId: project, region});
}

// A transport failure after the request may have reached the server: the
// callable could have run. Clients must report the outcome as unknown, never
// as "not done".
export function isIndeterminateTransportError(error, codePrefix = "CALLABLE") {
  return [
    `${codePrefix}_TIMEOUT`,
    `${codePrefix}_NETWORK_ERROR`,
    `${codePrefix}_INVALID_RESPONSE`,
  ].includes(error.code) || error.code.startsWith(`${codePrefix}_HTTP_`);
}

function normalizeRemoteCode(codePrefix, status, httpStatus) {
  if (typeof status === "string" && status.length > 0) {
    return `${codePrefix}_${status.toUpperCase().replace(/-/gu, "_")}`;
  }
  return `${codePrefix}_HTTP_${httpStatus}`;
}
