import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  scanFile,
  scanRouteStringLiterals,
} from "./check_route_string_literals.mjs";

test("scanFile flags context navigation with raw path strings", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/calendar/calendar_screen.dart",
    source: "void open(BuildContext context) => context.push<void>('/clubs');\n",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "rawRouteStringLiteral");
  assert.equal(findings[0].route, "/clubs");
});

test("scanFile flags GoRouter navigation with raw path strings", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/saved_events_screen.dart",
    source:
      "void open(BuildContext context) => GoRouter.of(context).push('/clubs/club-1');\n",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].route, "/clubs/club-1");
});

test("scanFile allows named routes and route constants", () => {
  const findings = scanFile({
    relativePath: "lib/onboarding/presentation/pages/onboarding_welcome_body.dart",
    source: [
      "context.goNamed(Routes.exploreScreen.name);",
      "context.go(Routes.exploreScreen.path);",
      "GoRouter.of(context).pushNamed(Routes.savedEventsScreen.name);",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("scanFile allows raw route paths in route definitions", () => {
  const findings = scanFile({
    relativePath: "lib/routing/go_router.dart",
    source: "final path = '/calendar/clubs/:organizerId/events/:eventId';\n",
  });

  assert.deepEqual(findings, []);
});

test("scanRouteStringLiterals scans production files and skips routing files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-routes-"));
  writeFile(
    root,
    "lib/events/presentation/calendar/calendar_screen.dart",
    "void open(BuildContext context) => context.push('/calendar/clubs/c1/events/e1');\n",
  );
  writeFile(
    root,
    "lib/routing/go_router.dart",
    "final route = GoRoute(path: '/calendar/clubs/:organizerId/events/:eventId');\n",
  );

  const result = scanRouteStringLiterals({root});

  assert.equal(result.checkedFiles, 1);
  assert.equal(result.findings.length, 1);
  assert.equal(
    result.findings[0].path,
    "lib/events/presentation/calendar/calendar_screen.dart",
  );
});

function writeFile(root, relativePath, source) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, source);
}
