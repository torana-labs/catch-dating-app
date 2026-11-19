#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import {resolveFirebaseProjectId} from "../lib/firebase_project.mjs";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

const args = parseArgs(process.argv.slice(2));
const envValues = readLocalEnv(args.envFile);
const debugToken =
  process.env.FIREBASE_APP_CHECK_DEBUG_TOKEN ||
  envValues.get("FIREBASE_APP_CHECK_DEBUG_TOKEN");

if (!debugToken) {
  fail(
    `Missing FIREBASE_APP_CHECK_DEBUG_TOKEN in environment or ${args.envFile}.`
  );
}

const appId = args.appId || readGoogleAppId(resolveConfigPath(args));
const projectNumber = args.projectNumber || projectNumberFromAppId(appId);
const displayName =
  args.displayName ||
  `Catch ${args.role} ${args.env} ${args.platform} local debug token`;
const quotaProject = args.quotaProject || resolveFirebaseProjectId({env: args.env});

if (projectNumber !== "619661127800" && !args.allowNonDev) {
  fail(
    "Refusing to register a non-dev App Check debug token without " +
      "--allow-non-dev."
  );
}

if (args.dryRun) {
  console.log(
    `Would register App Check debug token for ${appId} ` +
      `with display name "${displayName}".`
  );
  process.exit(0);
}

const accessToken =
  process.env.GOOGLE_OAUTH_ACCESS_TOKEN || getAccessTokenFromGcloud();

const requestPath =
  `/v1/projects/${projectNumber}/apps/${encodeURIComponent(appId)}` +
  "/debugTokens";

const response = await postJson({
  path: requestPath,
  accessToken,
  body: {
    displayName,
    token: debugToken,
  },
  quotaProject,
});

if (response.statusCode >= 200 && response.statusCode < 300) {
  const tokenName = response.json?.name ?? "(name unavailable)";
  console.log(
    `Registered App Check debug token for ${appId}: ${tokenName}`
  );
  process.exit(0);
}

const status = response.json?.error?.status;
if (response.statusCode === 409 || status === "ALREADY_EXISTS") {
  console.log(`App Check debug token is already registered for ${appId}.`);
  process.exit(0);
}

const message =
  response.json?.error?.message ||
  response.body ||
  `HTTP ${response.statusCode}`;
fail(`App Check debug token registration failed for ${appId}: ${message}`);

function parseArgs(argv) {
  const parsed = {
    appId: null,
    allowNonDev: false,
    config: null,
    displayName: null,
    dryRun: false,
    env: "dev",
    envFile: ".env.local",
    platform: "ios",
    projectNumber: null,
    quotaProject: null,
    role: "host",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--allow-non-dev") parsed.allowNonDev = true;
    else if (arg === "--app-id") parsed.appId = requireValue(argv, ++i, arg);
    else if (arg === "--config") parsed.config = requireValue(argv, ++i, arg);
    else if (arg === "--display-name") {
      parsed.displayName = requireValue(argv, ++i, arg);
    } else if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--env") {
      parsed.env = requireValue(argv, ++i, arg);
    } else if (arg === "--env-file") {
      parsed.envFile = requireValue(argv, ++i, arg);
    } else if (arg === "--platform") {
      parsed.platform = requireValue(argv, ++i, arg);
    } else if (arg === "--project-number") {
      parsed.projectNumber = requireValue(argv, ++i, arg);
    } else if (arg === "--quota-project") {
      parsed.quotaProject = requireValue(argv, ++i, arg);
    } else if (arg === "--role") {
      parsed.role = requireValue(argv, ++i, arg);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  if (!["dev", "prod"].includes(parsed.env)) {
    fail(`Unsupported env: ${parsed.env}`);
  }
  if (!["consumer", "host"].includes(parsed.role)) {
    fail(`Unsupported role: ${parsed.role}`);
  }
  if (!["ios", "macos"].includes(parsed.platform)) {
    fail(`Unsupported platform: ${parsed.platform}`);
  }

  return parsed;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    fail(`${flag} requires a value.`);
  }
  return value;
}

function resolveConfigPath({config, env, platform, role}) {
  if (config) return path.resolve(config);
  const roleSegment = role === "host" ? ["host"] : [];
  return fromRepo(
    "firebase",
    env,
    ...roleSegment,
    platform,
    "GoogleService-Info.plist"
  );
}

function readGoogleAppId(configPath) {
  if (!fs.existsSync(configPath)) {
    fail(`Missing Firebase app config: ${relativeToRepo(configPath)}`);
  }
  const contents = fs.readFileSync(configPath, "utf8");
  const match = contents.match(
    /<key>GOOGLE_APP_ID<\/key>\s*<string>([^<]+)<\/string>/
  );
  if (!match) {
    fail(`Missing GOOGLE_APP_ID in ${relativeToRepo(configPath)}`);
  }
  return match[1];
}

function projectNumberFromAppId(appId) {
  const match = appId.match(/^1:(\d+):/);
  if (!match) {
    fail(`Could not infer project number from Firebase app id: ${appId}`);
  }
  return match[1];
}

function readLocalEnv(envFile) {
  const resolved = path.isAbsolute(envFile) ? envFile : fromRepo(envFile);
  const values = new Map();
  if (!fs.existsSync(resolved)) return values;

  const lines = fs.readFileSync(resolved, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice("export ".length);
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return values;
}

function getAccessTokenFromGcloud() {
  const result = spawnSync(
    "gcloud",
    ["auth", "print-access-token", "--quiet"],
    {encoding: "utf8"}
  );
  if (result.status !== 0) {
    fail(
      "Could not get a Google OAuth access token from gcloud. " +
        sanitize(result.stderr || result.stdout || "gcloud exited non-zero")
    );
  }
  const token = result.stdout.trim();
  if (!token) fail("gcloud returned an empty OAuth access token.");
  return token;
}

function postJson({path: requestPath, accessToken, body, quotaProject}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(
      {
        method: "POST",
        hostname: "firebaseappcheck.googleapis.com",
        path: requestPath,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "X-Goog-User-Project": quotaProject,
        },
      },
      (res) => {
        let bodyText = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          bodyText += chunk;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = bodyText ? JSON.parse(bodyText) : null;
          } catch {
            json = null;
          }
          resolve({
            body: sanitize(bodyText),
            json,
            statusCode: res.statusCode ?? 0,
          });
        });
      }
    );
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

function sanitize(value) {
  let sanitized = String(value);
  if (debugToken) sanitized = sanitized.split(debugToken).join("[redacted]");
  return sanitized;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`Register a local Firebase App Check debug token.

Usage:
  node tool/firebase/register_app_check_debug_token.mjs [options]

Options:
  --env <dev|prod>       Firebase environment. Defaults to dev.
  --role <consumer|host>         App role. Defaults to host.
  --platform <ios|macos>         Apple config to read. Defaults to ios.
  --config <path>                Read GOOGLE_APP_ID from this plist.
  --app-id <firebase-app-id>     Use an explicit Firebase app id.
  --project-number <number>      Override project number inferred from app id.
  --quota-project <project-id>   Quota project header. Defaults to env alias.
  --display-name <name>          Debug-token display name in Firebase.
  --env-file <path>              File containing FIREBASE_APP_CHECK_DEBUG_TOKEN.
  --allow-non-dev                Allow prod token registration.
  --dry-run                      Print target app id without registering.

The token is read from FIREBASE_APP_CHECK_DEBUG_TOKEN or .env.local and is never
printed. OAuth is read from GOOGLE_OAUTH_ACCESS_TOKEN or minted through gcloud.`);
}
