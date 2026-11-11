#!/usr/bin/env node
import fs from "node:fs";

const commonFirebaseVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const target = process.argv[2];
const args = parseArgs(process.argv.slice(3));

if (!["marketing", "admin"].includes(target)) {
  console.error("Usage: node tool/env/check_web_hosting_env.mjs <marketing|admin> [options]");
  process.exit(64);
}

const required = target === "marketing" ? [
  ...commonFirebaseVars,
  "VITE_GTM_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
  "VITE_WEBSITE_APPCHECK_SITE_KEY",
  "VITE_STORE_LINKS_MODE",
] : [
  ...commonFirebaseVars,
  "VITE_FIREBASE_MEASUREMENT_ID",
  "VITE_ADMIN_DATA_MODE",
  "VITE_ADMIN_FIREBASE_ENV",
  "VITE_ADMIN_APPCHECK_SITE_KEY",
];

const errors = [];
for (const name of required) {
  if (!process.env[name]?.trim()) {
    errors.push(`${name} is required for ${target} hosting deploys.`);
  }
}

if (target === "marketing" && process.env.VITE_STORE_LINKS_MODE?.trim()) {
  validateMarketingStoreLinks(process.env.VITE_STORE_LINKS_MODE.trim());
}

if (
  target === "marketing" &&
  process.env.VITE_GTM_ID?.trim() &&
  !/^GTM-[A-Z0-9]+$/u.test(process.env.VITE_GTM_ID.trim())
) {
  errors.push("VITE_GTM_ID must be a Google Tag Manager container id such as GTM-XXXXXXX.");
}

const deployEnv = process.env.CATCH_FIREBASE_DEPLOY_ENV;
const deployProjectId = process.env.CATCH_FIREBASE_PROJECT_ID ||
  projectIdForAlias(deployEnv);

if (
  target === "admin" &&
  process.env.VITE_ADMIN_DATA_MODE &&
  process.env.VITE_ADMIN_DATA_MODE !== "live"
) {
  errors.push("VITE_ADMIN_DATA_MODE must be live for admin hosting deploys.");
}

if (
  args.expectedFirebaseEnv &&
  process.env.VITE_ADMIN_FIREBASE_ENV !== args.expectedFirebaseEnv
) {
  errors.push(
    `VITE_ADMIN_FIREBASE_ENV must be ${args.expectedFirebaseEnv}, ` +
    `found ${process.env.VITE_ADMIN_FIREBASE_ENV || "missing"}.`,
  );
}

if (
  target === "admin" &&
  deployEnv &&
  process.env.VITE_ADMIN_FIREBASE_ENV &&
  process.env.VITE_ADMIN_FIREBASE_ENV !== deployEnv
) {
  errors.push(
    `VITE_ADMIN_FIREBASE_ENV must match deploy env ${deployEnv}, ` +
    `found ${process.env.VITE_ADMIN_FIREBASE_ENV}.`,
  );
}

if (
  args.expectedProjectId &&
  process.env.VITE_FIREBASE_PROJECT_ID !== args.expectedProjectId
) {
  errors.push(
    `VITE_FIREBASE_PROJECT_ID must be ${args.expectedProjectId}, ` +
    `found ${process.env.VITE_FIREBASE_PROJECT_ID || "missing"}.`,
  );
}

if (
  deployProjectId &&
  process.env.VITE_FIREBASE_PROJECT_ID &&
  process.env.VITE_FIREBASE_PROJECT_ID !== deployProjectId
) {
  errors.push(
    `VITE_FIREBASE_PROJECT_ID must match deploy project ${deployProjectId}, ` +
    `found ${process.env.VITE_FIREBASE_PROJECT_ID}.`,
  );
}

if (errors.length > 0) {
  console.error(`${target} hosting environment validation failed:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`${target} hosting environment validation passed.`);

function parseArgs(argv) {
  const parsed = {
    expectedFirebaseEnv: null,
    expectedProjectId: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--expected-firebase-env") {
      parsed.expectedFirebaseEnv = requiredValue(argv, ++index, arg);
    } else if (arg === "--expected-project-id") {
      parsed.expectedProjectId = requiredValue(argv, ++index, arg);
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printUsage();
      process.exit(64);
    }
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    console.error(`${flag} requires a value.`);
    process.exit(64);
  }
  return value;
}

function projectIdForAlias(env) {
  if (!env) return null;
  try {
    const rc = JSON.parse(fs.readFileSync(".firebaserc", "utf8"));
    const projectId = rc.projects?.[env];
    return typeof projectId === "string" ? projectId : null;
  } catch {
    return null;
  }
}

function validateStoreUrl({
  name,
  hostname,
  pathPattern,
  requiredSearchParam = null,
  description,
}) {
  const value = process.env[name]?.trim();
  if (!value) return;
  try {
    const url = new URL(value);
    const hasRequiredParam = requiredSearchParam === null ||
      Boolean(url.searchParams.get(requiredSearchParam)?.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname !== hostname ||
      !pathPattern.test(url.pathname) ||
      !hasRequiredParam
    ) {
      errors.push(`${name} must be ${description}.`);
    }
  } catch {
    errors.push(`${name} must be ${description}.`);
  }
}

function validateMarketingStoreLinks(mode) {
  if (mode === "prelaunch") {
    for (const name of ["VITE_APP_STORE_URL", "VITE_PLAY_STORE_URL", "VITE_HOST_APP_STORE_URL", "VITE_HOST_PLAY_STORE_URL"]) {
      if (process.env[name]?.trim()) {
        errors.push(`${name} must be empty when VITE_STORE_LINKS_MODE is prelaunch.`);
      }
    }
    return;
  }

  if (mode !== "live") {
    errors.push("VITE_STORE_LINKS_MODE must be prelaunch or live.");
    return;
  }

  for (const name of ["VITE_APP_STORE_URL", "VITE_PLAY_STORE_URL"]) {
    if (!process.env[name]?.trim()) {
      errors.push(`${name} is required when VITE_STORE_LINKS_MODE is live.`);
    }
  }

  validateStoreUrl({
    name: "VITE_APP_STORE_URL",
    hostname: "apps.apple.com",
    pathPattern: /\/id\d+(?:$|[/?#])/u,
    description: "an HTTPS apps.apple.com product URL containing an Apple app id",
  });
  validateStoreUrl({
    name: "VITE_PLAY_STORE_URL",
    hostname: "play.google.com",
    pathPattern: /^\/store\/apps\/details$/u,
    requiredSearchParam: "id",
    description: "an HTTPS play.google.com/store/apps/details URL with an id parameter",
  });
  // Catch Host's store pages are optional while live: until the owner adds
  // them, the host landing's badges stay pending and record the press.
  if (process.env.VITE_HOST_APP_STORE_URL?.trim()) {
    validateStoreUrl({
      name: "VITE_HOST_APP_STORE_URL",
      hostname: "apps.apple.com",
      pathPattern: /\/id\d+(?:$|[/?#])/u,
      description: "an HTTPS apps.apple.com product URL containing an Apple app id",
    });
  }
  if (process.env.VITE_HOST_PLAY_STORE_URL?.trim()) {
    validateStoreUrl({
      name: "VITE_HOST_PLAY_STORE_URL",
      hostname: "play.google.com",
      pathPattern: /^\/store\/apps\/details$/u,
      requiredSearchParam: "id",
      description: "an HTTPS play.google.com/store/apps/details URL with an id parameter",
    });
  }
}

function printUsage() {
  console.log(`Usage:
  node tool/env/check_web_hosting_env.mjs <marketing|admin> [options]

Options:
  --expected-firebase-env <env>  Require VITE_ADMIN_FIREBASE_ENV to match.
  --expected-project-id <id>     Require VITE_FIREBASE_PROJECT_ID to match.
`);
}
