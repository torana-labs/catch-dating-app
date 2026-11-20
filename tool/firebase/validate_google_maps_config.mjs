#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const placesSecretName = "GOOGLE_MAPS_PLACES_API_KEY";
const supportedPlacesRegionCodes = ["in", "np", "au", "us"];

const args = parseArgs(process.argv.slice(2));
const appRoot = resolveAppRoot(args.projectRoot);
const envs = args.env ? [args.env] : ["dev", "prod"];
const platforms = args.platform === "all" ? ["ios", "android"] : [args.platform];
const errors = [];

for (const platform of platforms) {
  if (platform === "ios") validateIos(envs);
  else if (platform === "android") validateAndroid(envs);
  else errors.push(`Unsupported platform: ${platform}`);
}

if (args.includePlacesSecret) {
  await validatePlacesSecrets(envs, args.project);
}

if (args.iosBuiltPlist) {
  validateIosBuiltPlist(args.iosBuiltPlist, args.env);
}

if (errors.length > 0) {
  console.error("Google Maps config validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Google Maps config validation passed for ${platforms.join(", ")} ` +
    `(${envs.join(", ")})${args.includePlacesSecret ? " with Places secret" : ""}.`
);

function parseArgs(argv) {
  const parsed = {
    env: null,
    includePlacesSecret: false,
    iosBuiltPlist: null,
    platform: "all",
    project: null,
    projectRoot: "",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--env") parsed.env = requireValue(argv, ++i, arg);
    else if (arg === "--include-places-secret") {
      parsed.includePlacesSecret = true;
    } else if (arg === "--ios-built-plist") {
      parsed.iosBuiltPlist = requireValue(argv, ++i, arg);
    } else if (arg === "--project") {
      parsed.project = requireValue(argv, ++i, arg);
    } else if (arg === "--project-root") {
      parsed.projectRoot = requireValue(argv, ++i, arg);
    } else if (arg === "--platform") {
      parsed.platform = requireValue(argv, ++i, arg);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (parsed.env && !["dev", "prod"].includes(parsed.env)) {
    throw new Error(`Unsupported env: ${parsed.env}`);
  }
  if (!["ios", "android", "all"].includes(parsed.platform)) {
    throw new Error(`Unsupported platform: ${parsed.platform}`);
  }
  return parsed;
}

function resolveAppRoot(projectRoot) {
  const resolved = path.resolve(repoRoot, projectRoot || ".");
  const relative = path.relative(repoRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`--project-root must stay inside the repository: ${projectRoot}`);
  }
  return resolved;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function validateIos(targetEnvs) {
  const filePath = path.join(appRoot, "ios/Flutter/GoogleMapsKeys.xcconfig");
  const sourcePath = path.relative(repoRoot, filePath);
  const values = readKeyValueFile(filePath, "iOS Google Maps key file");
  for (const env of targetEnvs) {
    const key = `GOOGLE_MAPS_IOS_API_KEY_${env.toUpperCase()}`;
    validateApiKey({
      label: `ios ${key}`,
      value: values.get(key),
      source: sourcePath,
    });
  }
}

function validateIosBuiltPlist(plistPath, targetEnv) {
  const resolvedPath = path.isAbsolute(plistPath)
    ? plistPath
    : path.join(repoRoot, plistPath);
  if (!fs.existsSync(resolvedPath)) {
    errors.push(
      `Missing built iOS Info.plist: ${path.relative(repoRoot, resolvedPath)}`
    );
    return;
  }

  const result = spawnSync(
    "/usr/libexec/PlistBuddy",
    ["-c", "Print :GoogleMapsApiKey", resolvedPath],
    {encoding: "utf8"}
  );
  if (result.error) {
    errors.push(
      `Could not read GoogleMapsApiKey from ${path.relative(repoRoot, resolvedPath)}: ` +
        result.error.message
    );
    return;
  }
  if (result.status !== 0) {
    errors.push(
      `Missing GoogleMapsApiKey in built iOS Info.plist: ` +
        path.relative(repoRoot, resolvedPath)
    );
    return;
  }

  const builtValue = result.stdout.trim();
  validateApiKey({
    label: "built ios GoogleMapsApiKey",
    value: builtValue,
    source: path.relative(repoRoot, resolvedPath),
  });

  if (!targetEnv) return;
  const values = readKeyValueFile(
    path.join(appRoot, "ios/Flutter/GoogleMapsKeys.xcconfig"),
    "iOS Google Maps key file"
  );
  const expectedKey = `GOOGLE_MAPS_IOS_API_KEY_${targetEnv.toUpperCase()}`;
  const expectedValue = values.get(expectedKey);
  if (expectedValue && builtValue !== expectedValue) {
    errors.push(
      `built ios GoogleMapsApiKey in ${path.relative(repoRoot, resolvedPath)} ` +
        `does not match ${expectedKey} from ${path.relative(
          repoRoot,
          path.join(appRoot, "ios/Flutter/GoogleMapsKeys.xcconfig"),
        )}.`
    );
  }
}

function validateAndroid(targetEnvs) {
  const filePath = path.join(appRoot, "android/local.properties");
  const sourcePath = path.relative(repoRoot, filePath);
  const values = readKeyValueFile(filePath, "Android local.properties");
  for (const env of targetEnvs) {
    const specificKey = `GOOGLE_MAPS_ANDROID_API_KEY_${env.toUpperCase()}`;
    const fallbackKey = "GOOGLE_MAPS_ANDROID_API_KEY";
    const value = values.get(specificKey) ?? values.get(fallbackKey);
    validateApiKey({
      label: `android ${specificKey} or ${fallbackKey}`,
      value,
      source: sourcePath,
    });
  }
}

async function validatePlacesSecrets(targetEnvs, projectOverride) {
  for (const env of targetEnvs) {
    const projectId = projectOverride ?? firebaseProjectForEnv(env);
    if (!projectId) {
      errors.push(
        `Missing Firebase project for ${env}; pass --project or configure .firebaserc.`
      );
      continue;
    }

    const value = readSecretValue({
      env,
      projectId,
      secretName: placesSecretName,
    });
    const errorCountBeforeValueCheck = errors.length;
    validateApiKey({
      label: `${env} ${placesSecretName}`,
      value,
      source: `Secret Manager project ${projectId}`,
    });
    if (!value || errors.length > errorCountBeforeValueCheck) continue;

    await validatePlacesEndpoint({
      env,
      projectId,
      secretName: placesSecretName,
      apiKey: value,
    });
  }
}

function firebaseProjectForEnv(env) {
  const filePath = path.join(repoRoot, ".firebaserc");
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return data?.projects?.[env] ?? null;
  } catch {
    errors.push(".firebaserc is not valid JSON.");
    return null;
  }
}

function readSecretValue({env, projectId, secretName}) {
  const result = spawnSync(
    "gcloud",
    [
      "secrets",
      "versions",
      "access",
      "latest",
      `--secret=${secretName}`,
      `--project=${projectId}`,
    ],
    {encoding: "utf8"}
  );

  if (result.error) {
    errors.push(
      `Could not read ${env} ${secretName}: ${result.error.message}.`
    );
    return "";
  }
  if (result.status !== 0) {
    errors.push(
      `Could not read ${env} ${secretName} from Secret Manager. ` +
        `Run gcloud auth login or check project ${projectId}.`
    );
    return "";
  }
  return result.stdout.trim();
}

async function validatePlacesEndpoint({env, projectId, secretName, apiKey}) {
  let response;
  try {
    response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": [
            "suggestions.placePrediction.placeId",
            "suggestions.placePrediction.text.text",
          ].join(","),
        },
        body: JSON.stringify({
          input: "Neighbour",
          includedRegionCodes: supportedPlacesRegionCodes,
          languageCode: "en",
          locationBias: {
            circle: {
              center: {latitude: 22.726506, longitude: 75.900464},
              radius: 50000,
            },
          },
        }),
      }
    );
  } catch (error) {
    errors.push(
      `Could not reach Google Places for ${env} ${secretName} in ${projectId}: ` +
        error.message
    );
    return;
  }

  if (response.ok) return;

  const message = await extractPlacesErrorMessage(response);
  errors.push(
    `${env} ${secretName} in ${projectId} failed Google Places validation: ` +
      `${response.status}${message ? ` ${message}` : ""}.`
  );
}

async function extractPlacesErrorMessage(response) {
  try {
    const json = await response.json();
    return json?.error?.message ?? "";
  } catch {
    return "";
  }
}

function readKeyValueFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${label}: ${path.relative(repoRoot, filePath)}`);
    return new Map();
  }
  const values = new Map();
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      continue;
    }
    const equals = trimmed.indexOf("=");
    if (equals === -1) continue;
    values.set(
      trimmed.slice(0, equals).trim(),
      trimmed.slice(equals + 1).trim()
    );
  }
  return values;
}

function validateApiKey({label, value, source}) {
  if (!value) {
    errors.push(`Missing ${label} in ${source}.`);
    return;
  }
  if (value.includes("keyString:")) {
    errors.push(`${label} in ${source} includes the invalid keyString prefix.`);
  }
  if (value.includes("$(") || value.startsWith("replace-with")) {
    errors.push(`${label} in ${source} is still a placeholder.`);
  }
  if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(value)) {
    errors.push(`${label} in ${source} does not look like a raw Google API key.`);
  }
}

function printHelp() {
  console.log(`Usage: node tool/firebase/validate_google_maps_config.mjs [options]

Options:
  --env <dev|prod>       Validate one environment. Defaults to all.
  --platform <ios|android|all>   Validate one platform. Defaults to all.
  --ios-built-plist <path>       Also validate GoogleMapsApiKey in a built
                                 iOS app Info.plist.
  --include-places-secret        Also validate GOOGLE_MAPS_PLACES_API_KEY
                                 from Secret Manager via gcloud.
  --project <project-id>         Override the Firebase project used for the
                                 Places secret check.
  --project-root <path>          Resolve native Maps files below an app package
                                 root. Defaults to the repository root.

The validator never prints API key values. It checks that local ignored config
files contain raw Google Maps API keys, not placeholders or keyString wrappers.`);
}
