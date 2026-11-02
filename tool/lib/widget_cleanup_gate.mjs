#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

const isCliEntrypoint =
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

export function parseWidgetCleanupSummary(source) {
  const counts = {};
  for (const line of String(source).split(/\r?\n/u)) {
    const match = /^\s{2}([a-z0-9_]+):\s+(\d+)\s*$/u.exec(line);
    if (!match) continue;
    counts[match[1]] = Number.parseInt(match[2], 10);
  }
  return counts;
}

/**
 * Every category the scan must report. A renamed or broken scan shows up as a
 * missing category instead of silently counting nothing.
 */
export const widgetCleanupCategories = Object.freeze([
  "raw_material_button_candidates",
  "raw_text_input_candidates",
  "fixed_white_pill_cta_candidates",
  "raw_range_slider_candidates",
  "raw_number_stepper_candidates",
  "feature_tappable_candidates",
  "literal_sized_box_spacing_candidates",
  "raw_text_style_candidates",
]);

export function widgetCleanupErrors({
  actual,
  categories = widgetCleanupCategories,
}) {
  const errors = [];
  for (const key of categories) {
    if (!(key in actual)) {
      errors.push(`Live widget cleanup summary is missing category ${key}.`);
    } else if (actual[key] > 0) {
      errors.push(`${key}: ${actual[key]} live candidate(s); this must be 0.`);
    }
  }
  for (const key of Object.keys(actual).sort()) {
    if (!categories.includes(key)) {
      errors.push(`Live widget cleanup summary has unknown category ${key}.`);
    }
  }
  return errors;
}

async function main() {
  const actual = parseWidgetCleanupSummary(await readStdin());
  const errors = widgetCleanupErrors({actual});
  if (errors.length > 0) {
    console.error("Widget cleanup gate failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Widget cleanup gate passed: ${widgetCleanupCategories.length} categories at zero.`,
  );
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      value += chunk;
    });
    process.stdin.on("end", () => resolve(value));
    process.stdin.on("error", reject);
  });
}

if (isCliEntrypoint) {
  await main();
}
