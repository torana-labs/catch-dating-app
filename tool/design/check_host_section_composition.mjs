import fs from 'node:fs';
import path from 'node:path';
import {scanDartSource} from '../lib/dart_source.mjs';

// These are the migrated operational surfaces, not a global ban on form cards.
export const hostSectionSources = [
  'lib/event_success/presentation/event_assistance_help_entry_section.dart',
  'lib/event_success/presentation/event_assistance_delivery_entry_section.dart',
];

export function hostSectionCompositionProblems(source, file) {
  const {code} = scanDartSource(source);
  const failures = [];
  for (const match of code.matchAll(/\bCatchSection\s*\.\s*(contained|plain|divided)\s*\(/gu)) {
    const line = code.slice(0, match.index).split('\n').length;
    failures.push(`${file}:${line}: use the owned action, collection, status or fieldRows recipe instead of ${match[1]}.`);
  }
  for (const match of code.matchAll(/\b(CatchEmptyState|EventSuccessReportEmptyState|CatchSurface|Card)(?:\s*\.\s*\w+)?\s*\(/gu)) {
    const line = code.slice(0, match.index).split('\n').length;
    failures.push(`${file}:${line}: successful-empty content belongs to the shared section recipe.`);
  }
  return failures;
}

export function checkHostSectionComposition(root) {
  return hostSectionSources.flatMap(file => {
    const absolute = path.join(root, file);
    return fs.existsSync(absolute)
      ? hostSectionCompositionProblems(fs.readFileSync(absolute, 'utf8'), file)
      : [`${file}: migrated section source is missing.`];
  });
}
