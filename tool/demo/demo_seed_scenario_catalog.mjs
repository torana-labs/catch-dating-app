#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {isDemoWorld, validateDemoWorld} from "./lib/demo_world.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const scenariosDir = path.join(toolDir, "demo_seed", "scenarios");

export function loadScenarioConfig(nameOrPath) {
  const filePath = scenarioPath(nameOrPath);
  const config = JSON.parse(fs.readFileSync(filePath, "utf8"));
  validateScenarioConfig(config, filePath);
  return config;
}

export function listScenarioConfigs() {
  return fs.readdirSync(scenariosDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => loadScenarioConfig(path.join(scenariosDir, file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function scenarioPath(nameOrPath) {
  if (!nameOrPath) throw new Error("Scenario name or path is required.");
  const directPath = path.resolve(repoRoot, nameOrPath);
  if (fs.existsSync(directPath)) return directPath;
  const fromScenarioDir = path.join(scenariosDir, `${nameOrPath}.json`);
  if (fs.existsSync(fromScenarioDir)) return fromScenarioDir;
  throw new Error(`Unknown demo scenario: ${nameOrPath}`);
}

function validateScenarioConfig(config, filePath) {
  const label = path.relative(repoRoot, filePath);
  if (isDemoWorld(config)) {
    validateDemoWorld(config, label);
    return;
  }
  for (const field of ["id", "label", "description"]) {
    if (typeof config?.[field] !== "string" || config[field].trim() === "") {
      throw new Error(`${label}.${field} must be a non-empty string.`);
    }
  }
  if (config.seedWorld != null) validateSeedWorld(config.seedWorld, label);
}

function validateSeedWorld(seedWorld, label) {
  const numericFields = [
    "usersPerCity",
    "organizersPerCity",
    "eventsPerOrganizer",
    "anchorsPerRun",
  ];
  if (!Array.isArray(seedWorld.cities) || seedWorld.cities.length === 0) {
    throw new Error(`${label}.seedWorld.cities must be a non-empty array.`);
  }
  for (const field of numericFields) {
    if (!Number.isInteger(seedWorld[field]) || seedWorld[field] < 0) {
      throw new Error(`${label}.seedWorld.${field} must be a non-negative integer.`);
    }
  }
  if (seedWorld.eventPatterns != null) {
    if (
      !Array.isArray(seedWorld.eventPatterns) ||
      seedWorld.eventPatterns.length === 0
    ) {
      throw new Error(`${label}.seedWorld.eventPatterns must be a non-empty array.`);
    }
    for (const [index, pattern] of seedWorld.eventPatterns.entries()) {
      validateEventPattern(pattern, `${label}.seedWorld.eventPatterns[${index}]`);
    }
  }
}

function validateEventPattern(pattern, label) {
  for (const field of ["kind", "activityKind", "meetingPointKey"]) {
    if (typeof pattern?.[field] !== "string" || pattern[field].trim() === "") {
      throw new Error(`${label}.${field} must be a non-empty string.`);
    }
  }
  for (const field of ["offsetHours", "price", "capacity", "durationMinutes"]) {
    if (!Number.isFinite(pattern[field])) {
      throw new Error(`${label}.${field} must be a finite number.`);
    }
  }
}
