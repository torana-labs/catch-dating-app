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
  if (config.salesDemo != null) validateSalesDemo(config.salesDemo, label);
}

function validateSeedWorld(seedWorld, label) {
  const numericFields = [
    "usersPerCity",
    "clubsPerCity",
    "eventsPerClub",
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

function validateSalesDemo(salesDemo, label) {
  if (!isRecord(salesDemo.host)) {
    throw new Error(`${label}.salesDemo.host must be an object.`);
  }
  if (!isRecord(salesDemo.club)) {
    throw new Error(`${label}.salesDemo.club must be an object.`);
  }
  if (!Array.isArray(salesDemo.rosterPersonaIds) ||
      salesDemo.rosterPersonaIds.length === 0) {
    throw new Error(`${label}.salesDemo.rosterPersonaIds must be non-empty.`);
  }
  if (!Array.isArray(salesDemo.events) || salesDemo.events.length === 0) {
    throw new Error(`${label}.salesDemo.events must be non-empty.`);
  }
  if (salesDemo.proofCoverage != null) {
    validateProofCoverage(salesDemo.proofCoverage, `${label}.salesDemo.proofCoverage`);
  }
}

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function validateProofCoverage(items, label) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`${label} must be a non-empty array when present.`);
  }
  for (const [index, item] of items.entries()) {
    const itemLabel = `${label}[${index}]`;
    if (!isRecord(item)) {
      throw new Error(`${itemLabel} must be an object.`);
    }
    for (const field of ["claim", "productSurface", "fixtureKey"]) {
      if (typeof item[field] !== "string" || item[field].trim() === "") {
        throw new Error(`${itemLabel}.${field} must be a non-empty string.`);
      }
    }
    if (
      !Array.isArray(item.evidence) ||
      item.evidence.length === 0 ||
      item.evidence.some((entry) => typeof entry !== "string" || entry.trim() === "")
    ) {
      throw new Error(`${itemLabel}.evidence must be a non-empty string array.`);
    }
  }
}
