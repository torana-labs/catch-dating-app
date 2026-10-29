#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import {fromRepo} from "../lib/repo_paths.mjs";
import {createRepositorySnapshot} from "../lib/repository_snapshot.mjs";
import {parseDocumentLifecycleStatus} from "../docs/check_doc_metadata.mjs";
import {
  deriveCheckSelection,
  matchesScopePatterns,
  normalizeScopePaths,
  resolveCheckPlan,
} from "./lib/context_plan.mjs";

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(64);
}

const repositorySnapshot = createRepositorySnapshot();
const task = args.task ?? "unspecified";
const scopePaths = normalizeScopePaths(args.paths);
const selectionPaths = expandSelectionPaths(scopePaths);
const rulesFile = readJson("tool/policy/rules.json", {rules: {}});
const skillManifest = readJson("docs/agent_skills/skills_manifest.json", {skills: []});
const toolsManifest = readJson("tool/tools_manifest.json", {tools: []});
const selection = deriveCheckSelection({
  task,
  paths: selectionPaths,
  skills: skillManifest.skills ?? [],
  rules: rulesFile.rules ?? {},
});
validateSelectedSkills(selection.matchedSkills);

const sourceState = readSourceState();
const pack = {
  sourceSha: sourceState.sha,
  sourceClean: sourceState.clean,
  task,
  scope: {paths: scopePaths},
  ownerDocs: buildOwnerDocs({task, selectionPaths, matchedSkills: selection.matchedSkills}),
  skills: selection.matchedSkills.map(projectSkill),
  activeRules: selection.matchedRules.map(projectRule),
  checkPlan: resolveCheckPlan({
    manifest: toolsManifest,
    requestedChecks: selection.requests,
  }),
};

process.stdout.write(args.json
  ? `${JSON.stringify(pack, null, 2)}\n`
  : renderMarkdown(pack));

function validateSelectedSkills(skills) {
  const ids = new Set();
  for (const skill of skills) {
    if (typeof skill.skill_id !== "string" || skill.skill_id === "") {
      throw new Error("Every selected project skill must declare skill_id.");
    }
    if (ids.has(skill.skill_id)) throw new Error(`Duplicate project skill id: ${skill.skill_id}`);
    ids.add(skill.skill_id);
    if (typeof skill.path !== "string" || !repositorySnapshot.exists(skill.path)) {
      throw new Error(`${skill.skill_id}: skill path does not exist: ${skill.path}`);
    }
    for (const field of ["applies_to", "source_docs", "required_tools"]) {
      if (!Array.isArray(skill[field]) || skill[field].some(
        (entry) => typeof entry !== "string" || entry === "",
      )) {
        throw new Error(`${skill.skill_id}: ${field} must be a string array.`);
      }
    }
    for (const sourceDoc of skill.source_docs) {
      if (!repositorySnapshot.exists(sourceDoc)) {
        throw new Error(`${skill.skill_id}: source document does not exist: ${sourceDoc}`);
      }
    }
  }
}

function projectSkill(skill) {
  return {
    skill_id: skill.skill_id,
    path: skill.path,
    version: skill.version ?? null,
    source_docs: [...(skill.source_docs ?? [])],
    required_tools: [...(skill.required_tools ?? [])],
    success_evidence: skill.success_evidence ?? null,
  };
}

function projectRule(rule) {
  return {
    id: rule.id,
    title: rule.title,
    kind: rule.kind ?? null,
    applies_to: [...(rule.applies_to ?? [])],
    instruction: rule.instruction,
    enforcement: [...(rule.enforcement ?? [])],
  };
}

function buildOwnerDocs({task, selectionPaths, matchedSkills}) {
  const docs = new Map();
  addDoc(docs, "AGENTS.md", "Agent routing entrypoint.");
  addDoc(docs, "docs/agent_operating_model.md", "Execution and collaboration guidance.");

  for (const skill of matchedSkills) {
    addDoc(docs, skill.path, `Project-local skill ${skill.skill_id}.`);
    for (const sourceDoc of skill.source_docs ?? []) {
      addDoc(docs, sourceDoc, `Required by ${skill.skill_id}.`);
    }
  }

  if (matchesScopePatterns(selectionPaths, ["lib/**", "test/**"])) {
    addDoc(docs, "docs/app_architecture.md", "Canonical app architecture for lib/test changes.");
    addDoc(docs, "lib/README.md", "Feature map for lib/.");
  }
  if (matchesScopePatterns(selectionPaths, [
    "docs/**", "PROJECT_CONTEXT.md", "README.md", "AGENTS.md",
  ])) {
    addDoc(docs, "docs/README.md", "Documentation ownership and lifecycle policy.");
  }
  if (matchesScopePatterns(selectionPaths, ["tool/**"])) {
    addDoc(docs, "tool/README.md", "Tool registration and validation policy.");
  }
  if (matchesScopePatterns(selectionPaths, [
    "website/**", "packages/web-config/**", "tool/marketing/**", "design/website/**",
  ])) {
    addDoc(docs, "docs/marketing_website_architecture.md", "Marketing website architecture.");
    addDoc(docs, "docs/web_surface_architecture.md", "Web and deployment surface ownership.");
    addDoc(docs, "website/README.md", "Marketing app local workflow.");
    addDoc(docs, "design/website/routes.json", "Marketing route contract.");
  }
  if (matchesScopePatterns(selectionPaths, [
    "contracts/**", "functions/src/**", "firestore.rules", "storage.rules",
    "lib/**/data/**", "lib/**/domain/**",
  ])) {
    addDoc(docs, "docs/data_contracts.md", "Data and rules contract source of truth.");
    addDoc(docs, "docs/backend_operation_catalog.md", "Backend operation ownership.");
  }
  if (matchesScopePatterns(selectionPaths, [
    "lib/**/presentation/**", "lib/contexts/*/parts/**", "lib/pages/**", "widgetbook/**",
    "docs/design_parity/**", "design/components/**", "design/screens/**", "design/tokens/**",
  ])) {
    addDoc(docs, "docs/design_parity/README.md", "Design parity workflow.");
    addDoc(docs, "docs/widget_catalog.md", "Widget ownership and catalog policy.");
    addDoc(docs, "docs/design_language.md", "Visual design source of truth.");
  }
  if (matchesScopePatterns(selectionPaths, [
    ".github/workflows/**", "firebase.json", ".firebaserc",
    "apps/*/android/**", "apps/*/ios/**", "apps/*/macos/**",
  ])) {
    addDoc(docs, "docs/release_operations.md", "Release, CI, and deployment gates.");
    addDoc(docs, "docs/web_surface_architecture.md", "Web and deployment surface ownership.");
  }
  if (task.toLowerCase().includes("doc")) {
    addDoc(docs, "docs/README.md", "Task name indicates documentation work.");
  }

  return [...docs.values()].filter((doc) => repositorySnapshot.exists(doc.path));
}

function addDoc(docs, docPath, reason) {
  const existing = docs.get(docPath);
  const markdown = docPath.endsWith(".md");
  const source = markdown ? repositorySnapshot.readText(docPath) ?? "" : "";
  docs.set(docPath, {
    path: docPath,
    version: markdown ? parseDocumentVersion(source) : null,
    status: markdown ? parseDocumentLifecycleStatus(source) : null,
    reason: existing ? `${existing.reason} ${reason}` : reason,
  });
}

function parseDocumentVersion(source) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source)?.[1];
  if (frontmatter == null) return null;
  return /^version:\s*["']?([^\s"'#]+)["']?\s*(?:#.*)?$/mu.exec(frontmatter)?.[1] ?? null;
}

function renderMarkdown(value) {
  const lines = [
    "# Agent Context Pack",
    "",
    `- Task: ${value.task}`,
    `- Source SHA: ${value.sourceSha}`,
    `- Source clean: ${value.sourceClean}`,
    `- Scope: ${value.scope.paths.join(", ") || "(none supplied)"}`,
    "",
    "## Owner Docs",
  ];
  appendList(lines, value.ownerDocs, (doc) => {
    const version = doc.version == null ? "" : ` v${doc.version}`;
    return `${doc.path}${version}: ${doc.reason}`;
  });
  lines.push("", "## Matching Skills");
  appendList(lines, value.skills, (skill) => `${skill.skill_id} (${skill.path})`);
  lines.push("", "## Active Source Rules");
  appendList(lines, value.activeRules, (rule) => `${rule.id}: ${rule.title}`);
  lines.push("", "## Check Plan");
  appendList(lines, value.checkPlan.checks, (check) => {
    return `${check.id} (${check.repositoryView}, local-readonly check) from ${check.sources.join(", ")}`;
  });
  for (const unresolved of value.checkPlan.unresolved) lines.push(`- Unresolved: ${unresolved}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function appendList(lines, values, render) {
  if (values.length === 0) {
    lines.push("- (none)");
    return;
  }
  for (const value of values) lines.push(`- ${render(value)}`);
}

function readSourceState() {
  const sha = runGit(["rev-parse", "HEAD"]).trim();
  const status = runGit(["status", "--porcelain", "--untracked-files=normal"]);
  return {sha, clean: status.trim() === ""};
}

function runGit(gitArgs) {
  const result = spawnSync("git", gitArgs, {
    cwd: fromRepo(),
    encoding: "utf8",
    shell: false,
    env: {...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_LAZY_FETCH: "1"},
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `git ${gitArgs.join(" ")} failed.`);
  return result.stdout;
}

function parseArgs(argv) {
  const parsed = {task: null, paths: [], json: false};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--task") parsed.task = requireValue(argv, ++i, arg);
    else if (arg === "--paths") {
      parsed.paths.push(requireValue(argv, ++i, arg));
    } else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--mode") {
      throw new Error("--mode was removed: context packs provide guidance and never grant task authority.");
    } else if (arg === "--output") {
      throw new Error("--output was removed: context packs are read-only and write only to stdout.");
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    } else {
      throw new Error(`Unexpected positional context-pack argument: ${arg}`);
    }
  }
  return parsed;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

function expandSelectionPaths(scopePaths) {
  const selected = new Set(scopePaths);
  for (const scopePath of scopePaths) {
    for (const descendant of repositorySnapshot.listPaths({prefix: `${scopePath}/`})) {
      selected.add(descendant);
    }
  }
  return [...selected].sort();
}

function readJson(relativePath, fallback) {
  return repositorySnapshot.readJson(relativePath) ?? fallback;
}

function printHelp() {
  console.log(`Usage: node tool/agent/context_pack.mjs --task <name> --paths <path[,path...]> [--json]

Read-only planning guidance derived from the current Git checkout and repository sources.

Options:
  --task name    Task label used only as a skill-routing fallback.
  --paths paths  Comma-separated or repeated repository-relative scope paths.
  --json         Serialize the guidance as JSON instead of Markdown.
  --help         Show this help.

`);
}
