#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";

const defaultDocPath = "docs/app_architecture.md";

const stalePatternsByExhibit = {
  "ARCH-SCREEN-001": [
    {
      label: "isHost: vm.isHost",
      pattern: /EventDetailBody\([^)]*\bisHost:\s*vm\.isHost/u,
    },
    {
      label: "_eventDetailCompanionState",
      pattern: /_eventDetailCompanionState/u,
    },
  ],
};

const requiredTokensByExhibit = {
  "ARCH-SCREEN-001": [
    "eventDetailSectionVisibilityStateFrom",
    "eventDetailCompanionStateFrom",
    "eventDetailHostStateFrom",
    "eventDetailSocialStateFrom",
    "sectionVisibility: sectionVisibility",
  ],
  "ARCH-UI-STATE-001": ["CalendarHomeState", "CalendarEventSummary"],
};

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) {
  const result = checkAppArchitectureExhibits({root: fromRepo()});
  if (result.errors.length > 0) {
    console.error("App architecture exhibit check failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `App architecture exhibit check passed: ${result.exhibits.length} exhibit(s) checked.`,
    );
  }
}

export function checkAppArchitectureExhibits({
  root,
  docPath = defaultDocPath,
}) {
  const errors = [];
  const absoluteDocPath = path.join(root, docPath);
  const source = readTextIfExists(absoluteDocPath);
  if (!source) {
    return {errors: [`Missing architecture doc: ${docPath}.`], exhibits: []};
  }

  const exhibits = extractExhibits(source, docPath);

  for (const exhibit of exhibits) {
    validateFreshnessMarker({exhibit, errors});
    validateTokens({exhibit, errors});
  }

  return {errors, exhibits};
}

function extractExhibits(source, docPath) {
  const lines = source.split(/\r?\n/u);
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^### Exhibit ([A-Z0-9-]+):\s*(.+)$/u.exec(lines[index]);
    if (!match) continue;
    starts.push({
      id: match[1],
      title: match[2].trim(),
      startLine: index + 1,
      startIndex: index,
    });
  }

  return starts.map((start, index) => {
    const next = starts[index + 1]?.startIndex ?? lines.length;
    const block = lines.slice(start.startIndex, next).join("\n");
    return {
      ...start,
      block,
      anchor: `${docPath}#${slugifyHeading(`Exhibit ${start.id}: ${start.title}`)}`,
      marker: parseFreshnessMarker(block),
    };
  });
}

function parseFreshnessMarker(block) {
  const match =
    /<!--\s*exhibit-freshness:\s*([A-Z0-9-]+)\s+owner=([^\s]+)\s*-->/u.exec(
      block,
    );
  if (!match) return null;
  return {
    id: match[1],
    owner: match[2],
  };
}

function validateFreshnessMarker({exhibit, errors}) {
  if (exhibit.marker == null) {
    errors.push(`${exhibit.id}: exhibit is missing an exhibit-freshness marker.`);
    return;
  }
  if (exhibit.marker.id !== exhibit.id) {
    errors.push(
      `${exhibit.id}: exhibit-freshness marker references ${exhibit.marker.id}.`,
    );
  }
  if (!exhibit.marker.owner) {
    errors.push(`${exhibit.id}: exhibit-freshness marker is missing owner.`);
  }
}

function validateTokens({exhibit, errors}) {
  for (const stale of stalePatternsByExhibit[exhibit.id] ?? []) {
    if (stale.pattern.test(exhibit.block)) {
      errors.push(`${exhibit.id}: stale exhibit token remains: ${stale.label}.`);
    }
  }
  for (const token of requiredTokensByExhibit[exhibit.id] ?? []) {
    if (!exhibit.block.includes(token)) {
      errors.push(`${exhibit.id}: expected current exhibit token missing: ${token}.`);
    }
  }
}

function slugifyHeading(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/gu, "-");
}

function readTextIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}
