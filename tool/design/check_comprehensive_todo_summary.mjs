#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";

// Progress is derived at consumption; authored priority and next-action decisions
// remain in the Markdown owner. Full registry/schema checks retain their owners.
export function deriveSummary(screenContracts) {
  if (!Array.isArray(screenContracts.screens)) {
    throw new Error("Expected a screen inventory.");
  }
  const counts = {open: 0, blocked: 0, closed: 0};
  const rows = screenContracts.screens.map(screen => {
    if (!screen.id || !Array.isArray(screen.openGaps)) throw new Error("Invalid screen gap inventory.");
    for (const gap of screen.openGaps) {
      if (!gap.id || !["open", "in_progress", "blocked", "closed"].includes(gap.status)) {
        throw new Error(`Invalid gap status or identity for ${screen.id}.`);
      }
      counts[gap.status === "in_progress" ? "open" : gap.status]++;
    }
    return {id: screen.id, priority: screen.priority,
      gaps: screen.openGaps.filter(gap => gap.status !== "closed")};
  });
  return {counts, rows};
}

export function validateAuthoredIndex(todo, screenContracts) {
  const rows = todo.split("\n").filter(line => /^\|\s*P\d\s*\|/u.test(line))
    .map(line => line.split("|").slice(1, -1).map(cell => cell.trim()));
  const known = new Map(screenContracts.screens.map(screen => [screen.id, screen]));
  const seen = new Set();
  const errors = [];
  for (const cells of rows) {
    const id = cells[1]?.replace(/^`|`$/gu, "");
    if (!known.has(id)) continue;
    if (seen.has(id)) errors.push(`${id}: duplicate authored decision row.`);
    seen.add(id);
    if (cells.length !== 4 || !cells[3]) errors.push(`${id}: expected priority, screen, reference decision and next todo.`);
  }
  for (const screen of screenContracts.screens) {
    if (screen.priority === "P1" && !seen.has(screen.id)) {
      errors.push(`${screen.id}: P1 screen is missing from the authored decision index.`);
    }
  }
  return errors;
}

function main(args) {
  const command = args[0] ?? "--help";
  if (["--help", "-h", "help"].includes(command)) {
    console.log(`Usage:
  node tool/design/check_comprehensive_todo_summary.mjs --check
  node tool/design/check_comprehensive_todo_summary.mjs --summary

Checks authored P1 decision coverage; --summary derives current migration counts
and per-screen gaps from the screen registry without writing Markdown or
comparing copied counts. The full schema remains owned by the screen-contract
check.`);
    return;
  }
  if (!["--check", "check", "--summary", "summary"].includes(command)) throw new Error(`Unknown command: ${command}`);
  const screens = JSON.parse(fs.readFileSync(fromRepo("design/screens/catch.screens.json"), "utf8"));
  const todo = fs.readFileSync(fromRepo("docs/design_parity/comprehensive_todo.md"), "utf8");
  const summary = deriveSummary(screens);
  const errors = validateAuthoredIndex(todo, screens);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`Screen registry gaps: ${summary.counts.open} open, ${summary.counts.blocked} blocked, ${summary.counts.closed} closed`);
  if (args.includes("--summary") || command === "summary") {
    console.log("| Priority | Screen | Open registry gaps |\n|---|---|---|");
    for (const row of summary.rows) {
      console.log(`| ${row.priority} | ${row.id} | ${row.gaps.map(gap => `${gap.id} (${gap.status})`).join(", ") || "None"} |`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) {
    console.error(`Design todo check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
