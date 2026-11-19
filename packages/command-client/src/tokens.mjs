import {OperationsError} from "./errors.mjs";

// Firebase token exchanges for scripted callers: a custom token (minted with
// the Admin SDK for a synthetic or staff user) becomes an ID token, and an App
// Check debug token becomes an App Check token. Both go through Google's REST
// endpoints with the web API key, so no client SDK is needed. A caller passes
// `fail(stage, message)` to keep its own error type; the stage is "auth" or
// "app-check".

export async function exchangeCustomToken({fetchImpl, apiKey, customToken, fail = defaultFail}) {
  const response = await fetchImpl(
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken" +
      `?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({token: customToken, returnSecureToken: true}),
    }
  );
  const body = await readJson(response);
  if (!response.ok || !body.idToken) {
    throw fail("auth", responseMessage(response, body));
  }
  return body.idToken;
}

export async function exchangeAppCheckDebugToken({
  fetchImpl,
  apiKey,
  appId,
  projectNumber,
  debugToken,
  fail = defaultFail,
}) {
  const response = await fetchImpl(
    "https://firebaseappcheck.googleapis.com/v1/projects/" +
      `${projectNumber}/apps/${encodeURIComponent(appId)}:exchangeDebugToken` +
      `?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({debugToken}),
    }
  );
  const body = await readJson(response);
  if (!response.ok || !body.token) {
    throw fail("app-check", responseMessage(response, body));
  }
  return body.token;
}

function defaultFail(stage, message) {
  return new OperationsError(
    `TOKEN_${stage.toUpperCase().replace(/-/gu, "_")}_FAILED`,
    `${stage}: ${message}`,
    {details: {stage}}
  );
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function responseMessage(response, body) {
  return body?.error?.message || body?.error || `HTTP ${response.status}`;
}
