import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {checkAppArchitectureExhibits} from "./check_app_architecture_exhibits.mjs";

test("passes when exhibits have freshness markers", () => {
  const root = createFixture({
    doc: [
      "# App Architecture",
      "",
      "### Exhibit ARCH-SCREEN-001: Feature Screen Boundary",
      "<!-- exhibit-freshness: ARCH-SCREEN-001 owner=recursive_audit_loop -->",
      "",
      "```dart",
      "final sectionVisibility = eventDetailSectionVisibilityStateFrom();",
      "final companionState = eventDetailCompanionStateFrom();",
      "final hostState = eventDetailHostStateFrom();",
      "final socialState = eventDetailSocialStateFrom();",
      "EventDetailBody(sectionVisibility: sectionVisibility);",
      "```",
      "",
      "### Exhibit ARCH-UI-STATE-001: Provider-Free Presentation State Model",
      "<!-- exhibit-freshness: ARCH-UI-STATE-001 owner=recursive_audit_loop -->",
      "",
      "```dart",
      "class CalendarHomeState {}",
      "class CalendarEventSummary {}",
      "```",
      "",
    ].join("\n"),
  });

  assert.deepEqual(checkAppArchitectureExhibits({root}).errors, []);
});

test("flags stale event-detail snippets in screen exhibit", () => {
  const root = createFixture({
    doc: [
      "# App Architecture",
      "",
      "### Exhibit ARCH-SCREEN-001: Feature Screen Boundary",
      "<!-- exhibit-freshness: ARCH-SCREEN-001 owner=recursive_audit_loop -->",
      "",
      "```dart",
      "final companionState = _eventDetailCompanionState();",
      "EventDetailBody(isHost: vm.isHost);",
      "```",
      "",
    ].join("\n"),
  });

  const errors = checkAppArchitectureExhibits({root}).errors.join("\n");

  assert.match(errors, /stale exhibit token remains: isHost: vm\.isHost/u);
  assert.match(errors, /stale exhibit token remains: _eventDetailCompanionState/u);
});

test("flags missing freshness markers", () => {
  const root = createFixture({
    doc: [
      "# App Architecture",
      "",
      "### Exhibit ARCH-SCREEN-001: Feature Screen Boundary",
      "",
      "```dart",
      "final sectionVisibility = eventDetailSectionVisibilityStateFrom();",
      "final companionState = eventDetailCompanionStateFrom();",
      "final hostState = eventDetailHostStateFrom();",
      "final socialState = eventDetailSocialStateFrom();",
      "EventDetailBody(sectionVisibility: sectionVisibility);",
      "```",
      "",
    ].join("\n"),
  });

  assert.match(
    checkAppArchitectureExhibits({root}).errors.join("\n"),
    /ARCH-SCREEN-001: exhibit is missing an exhibit-freshness marker/u,
  );
});

test("flags a marker that names another exhibit", () => {
  const root = createFixture({
    doc: [
      "### Exhibit ARCH-SCREEN-001: Feature Screen Boundary",
      "<!-- exhibit-freshness: ARCH-OTHER-001 owner=recursive_audit_loop -->",
    ].join("\n"),
  });

  assert.match(
    checkAppArchitectureExhibits({root}).errors.join("\n"),
    /exhibit-freshness marker references ARCH-OTHER-001/u,
  );
});

function createFixture({doc}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-exhibits-"));
  writeFile(root, "docs/app_architecture.md", doc);
  return root;
}

function writeFile(root, relativePath, contents) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, `${contents}\n`);
}
