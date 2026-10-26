#!/usr/bin/env node
// Generates the icon layer from the icon role catalog.
//
// design/tokens/catch.icons.json names every role Catch features may use and
// maps it to one glyph of the active icon family. This tool validates the
// catalog against the vendored Flutter font and the installed React package,
// then writes the Flutter `CatchIcons` class and the React role maps in
// `@catch/web-ui`. Changing the family means changing the catalog's `family`
// block and glyph names (and vendoring that family's font); call sites name
// roles and do not change.
import crypto from "node:crypto";
import fs from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";

export const inputs = {
  catalog: "design/tokens/catch.icons.json",
  schema: "design/tokens/catch.icons.schema.json",
  legacy: "design/tokens/catch.icons.legacy_flutter.json",
  eventCommon: "contracts/shared/event_common.schema.json",
  packageLock: "package-lock.json",
};

export const outputs = {
  dart: "packages/catch_ui/lib/src/foundations/catch_icons.g.dart",
  glyphs: "packages/web-ui/src/icons/catchIconGlyphs.ts",
  nodes: "packages/web-ui/src/icons/catchIconNodes.ts",
};

// Groups whose glyphs are also drawn outside React (link-preview SVG,
// server-rendered artwork), so their node data ships with the package.
const nodeGroups = new Set(["activity", "playbook"]);

// Reserved words cannot name a static member; built-in and contextual
// identifiers such as `show`, `sync` and `library` can.
const dartReservedWords = new Set([
  "assert", "break", "case", "catch", "class", "const", "continue", "default",
  "do", "else", "enum", "extends", "false", "final", "finally", "for", "if",
  "in", "is", "new", "null", "rethrow", "return", "super", "switch", "this",
  "throw", "true", "try", "var", "void", "while", "with",
]);

const isCli = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) await runCli(process.argv.slice(2));

export function pascalCase(kebab) {
  return kebab.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

export function activityRoleName(kind) {
  return `activity${kind[0].toUpperCase()}${kind.slice(1)}`;
}

/**
 * Validates the catalog and builds every generated output.
 *
 * `family` describes what is installed or vendored: `codepoints` (glyph name
 * to font codepoint), `fontSha256` of the vendored font, `reactVersion` and
 * `lockVersion` of the React package, `reactExports` (the set of exported
 * component names) and `iconNode(glyph)` (Lucide node data or null).
 */
export function buildIconOutputs({catalog, legacy, activityKinds, family, schemaErrors = []}) {
  const errors = [...schemaErrors];
  if (errors.length) return {errors, outputs: null};

  const roles = Object.entries(catalog.roles);
  const roleNames = new Set(roles.map(([name]) => name));
  const declared = catalog.family;

  if (family.fontSha256 !== declared.flutter.fontSha256) {
    errors.push(
      `${declared.flutter.fontAsset} sha256 ${family.fontSha256} does not match ` +
      `family.flutter.fontSha256 ${declared.flutter.fontSha256}; re-vendor the ` +
      `${declared.name} ${declared.version} font or update the catalog.`,
    );
  }
  if (family.reactVersion !== declared.version) {
    errors.push(
      `${declared.react.package} ${family.reactVersion} is installed but the catalog ` +
      `pins ${declared.name} ${declared.version}; Flutter and React must draw the same version.`,
    );
  }
  if (family.lockVersion !== declared.version) {
    errors.push(
      `package-lock.json resolves ${declared.react.package} ${family.lockVersion ?? "(missing)"}, ` +
      `not ${declared.version}.`,
    );
  }

  const glyphsOf = (role) => [role.glyph, ...Object.values(role.platformGlyphs ?? {})];
  for (const [name, role] of roles) {
    if (dartReservedWords.has(name)) errors.push(`Role '${name}' is a Dart reserved word.`);
    for (const glyph of glyphsOf(role)) {
      if (!Number.isInteger(family.codepoints[glyph])) {
        errors.push(`Role '${name}': glyph '${glyph}' is not in the vendored ${declared.name} font.`);
      }
      if (!family.reactExports.has(pascalCase(glyph))) {
        errors.push(`Role '${name}': ${declared.react.package} exports no '${pascalCase(glyph)}'.`);
      }
    }
    if (role.group === "activity") {
      if (!role.activityKind) {
        errors.push(`Activity role '${name}' needs activityKind.`);
      } else if (activityRoleName(role.activityKind) !== name) {
        errors.push(`Activity role '${name}' must be named '${activityRoleName(role.activityKind)}'.`);
      }
    } else if (role.activityKind) {
      errors.push(`Role '${name}' is not in the activity group but declares activityKind.`);
    }
    if (nodeGroups.has(role.group) && !family.iconNode(role.glyph)) {
      errors.push(`Role '${name}': no icon node data for glyph '${role.glyph}'.`);
    }
  }

  const declaredKinds = roles.filter(([, role]) => role.group === "activity")
    .map(([, role]) => role.activityKind);
  for (const kind of activityKinds) {
    if (!declaredKinds.includes(kind)) errors.push(`activityKind '${kind}' has no activity role.`);
  }
  for (const kind of declaredKinds) {
    if (kind && !activityKinds.includes(kind)) {
      errors.push(`Activity role for '${kind}' names no activityKind in ${inputs.eventCommon}.`);
    }
  }
  const duplicateKinds = declaredKinds.filter((kind, index) => declaredKinds.indexOf(kind) !== index);
  for (const kind of new Set(duplicateKinds)) errors.push(`activityKind '${kind}' has more than one role.`);

  const aliases = Object.entries(legacy?.aliases ?? {});
  for (const [alias, target] of aliases) {
    if (!/^[a-z][A-Za-z0-9]*$/u.test(alias)) errors.push(`Legacy alias '${alias}' is not a Dart identifier.`);
    if (roleNames.has(alias)) errors.push(`Legacy alias '${alias}' shadows a role of the same name.`);
    if (!roleNames.has(target)) errors.push(`Legacy alias '${alias}' targets unknown role '${target}'.`);
  }

  if (errors.length) return {errors, outputs: null};
  return {
    errors,
    outputs: {
      dart: renderDart(catalog, aliases, family.codepoints),
      glyphs: renderGlyphs(catalog),
      nodes: renderNodes(catalog, family.iconNode),
    },
  };
}

function header(catalog, comment) {
  const {name, version} = catalog.family;
  return [
    `${comment} GENERATED CODE - DO NOT MODIFY BY HAND.`,
    `${comment} Source: ${inputs.catalog} (${name} ${version}).`,
    `${comment} Regenerate with \`node tool/design/generate_icon_catalog.mjs\`.`,
  ].join("\n");
}

function hex(codepoint) {
  return `0x${codepoint.toString(16)}`;
}

// Roles are getters returning const IconData, as the facade always was: the
// font stays tree-shakable, and call sites need no const churn when a role
// moves between families.
function dartIconData(name, glyph, role, codepoints) {
  const args = [
    hex(codepoints[glyph]),
    "fontFamily: _fontFamily",
    "fontPackage: _fontPackage",
    ...(role.mirrorInRtl ? ["matchTextDirection: true"] : []),
  ];
  const oneLine = `  static IconData get ${name} => const IconData(${args.join(", ")});`;
  if (oneLine.length <= 80) return oneLine;
  return [
    `  static IconData get ${name} => const IconData(`,
    ...args.map((arg) => `    ${arg},`),
    "  );",
  ].join("\n");
}

function dartDoc(text, indent = "  ", marker = "///") {
  const prefix = `${indent}${marker}`;
  const lines = [];
  let line = prefix;
  for (const word of text.split(/\s+/u)) {
    if (`${line} ${word}`.length > 80 && line !== prefix) {
      lines.push(line);
      line = prefix;
    }
    line += ` ${word}`;
  }
  lines.push(line);
  return lines.join("\n");
}

function renderDart(catalog, aliases, codepoints) {
  const {flutter} = catalog.family;
  const roles = Object.entries(catalog.roles);
  const platformRoles = roles.filter(([, role]) => role.platformGlyphs);
  const sections = [];
  for (const group of Object.keys(catalog.groups)) {
    const members = roles.filter(([, role]) => role.group === group);
    sections.push([
      dartDoc(`${catalog.groups[group]}`, "  ", "//"),
      ...members.map(([name, role]) => [
        dartDoc(role.description),
        dartIconData(name, role.glyph, role, codepoints),
      ].join("\n")),
    ].join("\n\n"));
  }
  for (const [name, role] of platformRoles) {
    const pascal = `${name[0].toUpperCase()}${name.slice(1)}`;
    const variants = Object.entries(role.platformGlyphs);
    sections.push([
      ...variants.map(([platform, glyph]) =>
        dartIconData(`_${name}${platform[0].toUpperCase()}${platform.slice(1)}`, glyph, role, codepoints)),
      "",
      dartDoc(`The ${name} role as drawn on [platform], defaulting to the current platform.`),
      `  static IconData platform${pascal}({TargetPlatform? platform}) {`,
      "    return switch (platform ?? defaultTargetPlatform) {",
      ...variants.map(([platform]) =>
        `      TargetPlatform.${platform === "ios" ? "iOS" : platform} => _${name}${platform[0].toUpperCase()}${platform.slice(1)},`),
      `      _ => ${name},`,
      "    };",
      "  }",
    ].join("\n"));
  }
  if (aliases.length) {
    sections.push([
      dartDoc(
        "Pre-Lucide names kept while call sites migrate to role names, from " +
        `${inputs.legacy}. Use the role names above in new code.`,
        "  ",
        "//",
      ),
      ...aliases.map(([alias, target]) => {
        const line = `  static IconData get ${alias} => ${target};`;
        return line.length <= 80 ? line : `  static IconData get ${alias} =>\n      ${target};`;
      }),
    ].join("\n"));
  }
  const imports = [
    ...(platformRoles.length
      ? ["import 'package:flutter/foundation.dart'\n    show TargetPlatform, defaultTargetPlatform;"]
      : []),
    "import 'package:flutter/widgets.dart';",
  ];
  return `${[
    header(catalog, "//"),
    "",
    imports.join("\n"),
    "",
    "/// Catch's icon roles.",
    "///",
    dartDoc(
      "Features name a role (`CatchIcons.back`), never a glyph of an icon " +
      `family. Each role maps to one ${catalog.family.name} glyph in ` +
      `\`${inputs.catalog}\`; changing the family changes that file and the ` +
      "vendored font, not call sites.",
      "",
    ),
    "abstract final class CatchIcons {",
    `  static const String _fontFamily = '${flutter.fontFamily}';`,
    `  static const String _fontPackage = '${flutter.fontPackage}';`,
    "",
    sections.join("\n\n"),
    "}",
  ].join("\n")}\n`;
}

function renderGlyphs(catalog) {
  const roles = Object.entries(catalog.roles);
  const imports = [...new Set(roles.map(([, role]) => pascalCase(role.glyph)))].sort();
  const activity = roles.filter(([, role]) => role.group === "activity");
  return `${[
    header(catalog, "//"),
    `import type {LucideIcon} from "${catalog.family.react.package}";`,
    "import {",
    ...imports.map((name) => `  ${name},`),
    `} from "${catalog.family.react.package}";`,
    "",
    "/** Every Catch icon role and the glyph that draws it. */",
    "export const catchIconGlyphs = {",
    ...roles.map(([name, role]) => `  ${name}: ${pascalCase(role.glyph)},`),
    "} as const satisfies Record<string, LucideIcon>;",
    "",
    "export type CatchIconName = keyof typeof catchIconGlyphs;",
    "",
    "/** The stroke width every role is drawn with, matching the Flutter font. */",
    `export const catchIconStrokeWidth = ${catalog.family.strokeWidth};`,
    "",
    "/** The role that draws each event activity kind. */",
    "export const catchActivityIconNames = {",
    ...activity.map(([name, role]) => `  ${role.activityKind}: "${name}",`),
    "} as const satisfies Record<string, CatchIconName>;",
    "",
    "export type CatchActivityKind = keyof typeof catchActivityIconNames;",
  ].join("\n")}\n`;
}

function renderNodes(catalog, iconNode) {
  const roles = Object.entries(catalog.roles).filter(([, role]) => nodeGroups.has(role.group));
  const entries = roles.map(([name, role]) => {
    const nodes = iconNode(role.glyph).map(([tag, attrs]) => {
      const clean = Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== "key"));
      return `    [${JSON.stringify(tag)}, ${JSON.stringify(clean)}],`;
    });
    return [`  ${name}: [`, ...nodes, "  ],"].join("\n");
  });
  return `${[
    header(catalog, "//"),
    `// SVG node data (24 x 24 box) for the ${[...nodeGroups].join(" and ")} roles, for`,
    "// artwork drawn outside React, such as link-preview cards.",
    "",
    "export type CatchIconNode = readonly [tag: string, attributes: Readonly<Record<string, string>>];",
    "",
    "export const catchIconNodes = {",
    ...entries,
    "} as const satisfies Record<string, readonly CatchIconNode[]>;",
    "",
    "export type CatchIconNodeName = keyof typeof catchIconNodes;",
  ].join("\n")}\n`;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(fromRepo(relativePath), "utf8"));
}

async function loadFamily(catalog) {
  const {flutter, react} = catalog.family;
  // @catch/web-ui declares the React icon package; workspaces share one install.
  const require = createRequire(fromRepo("packages/web-ui/package.json"));
  const packageJsonPath = require.resolve(`${react.package}/package.json`);
  const packageRoot = path.dirname(packageJsonPath);
  const reactModule = await import(pathToFileURL(require.resolve(react.package)).href);
  const lock = readJson(inputs.packageLock);
  const fontBytes = fs.readFileSync(fromRepo("packages", flutter.fontPackage, flutter.fontAsset));
  // Each Lucide icon module exports its node data as `__iconData`.
  const nodes = new Map();
  for (const role of Object.values(catalog.roles)) {
    if (!nodeGroups.has(role.group) || nodes.has(role.glyph)) continue;
    const modulePath = path.join(packageRoot, "dist/esm/icons", `${role.glyph}.mjs`);
    const iconModule = fs.existsSync(modulePath) ? await import(pathToFileURL(modulePath).href) : null;
    nodes.set(role.glyph, iconModule?.__iconData?.node ?? null);
  }
  return {
    codepoints: readJson(flutter.codepoints),
    fontSha256: crypto.createHash("sha256").update(fontBytes).digest("hex"),
    reactVersion: JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version,
    lockVersion: lock.packages?.[`node_modules/${react.package}`]?.version ?? null,
    reactExports: new Set(Object.keys(reactModule)),
    iconNode: (glyph) => nodes.get(glyph) ?? null,
  };
}

async function runCli(argv) {
  const unknown = argv.filter((argument) => argument !== "--check");
  if (unknown.length) {
    console.error(`Unknown argument: ${unknown[0]}`);
    process.exit(64);
  }
  const check = argv.includes("--check");
  const catalog = readJson(inputs.catalog);
  const legacyPath = fromRepo(inputs.legacy);
  const legacy = fs.existsSync(legacyPath) ? readJson(inputs.legacy) : null;
  const ajv = new Ajv2020({allErrors: true, strict: false});
  const validate = ajv.compile(readJson(inputs.schema));
  const schemaErrors = validate(catalog)
    ? []
    : validate.errors.map((error) => `${inputs.catalog}${error.instancePath}: ${error.message}`);
  const activityKinds = readJson(inputs.eventCommon).definitions.activityKind.enum;
  const family = schemaErrors.length ? null : await loadFamily(catalog);
  const {errors, outputs: generated} = buildIconOutputs({catalog, legacy, activityKinds, family, schemaErrors});
  if (errors.length) {
    console.error("Icon role catalog is invalid:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  const stale = [];
  for (const [key, relativePath] of Object.entries(outputs)) {
    const outputPath = fromRepo(relativePath);
    if (check) {
      const actual = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
      if (actual !== generated[key]) stale.push(relativePath);
      continue;
    }
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, generated[key]);
  }
  if (stale.length) {
    console.error("Icon outputs are stale; run `node tool/design/generate_icon_catalog.mjs`:");
    for (const file of stale) console.error(`- ${file}`);
    process.exit(1);
  }
  const roleCount = Object.keys(catalog.roles).length;
  console.log(check
    ? `Icon role catalog is valid: ${roleCount} roles resolve in both frameworks and both icon layers are current.`
    : `Generated ${Object.values(outputs).map((file) => path.relative(repoRoot, fromRepo(file))).join(", ")}.`);
}
