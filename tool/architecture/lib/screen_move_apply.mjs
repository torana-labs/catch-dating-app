// Builds a group's complete plan (every rename and every rewritten text, in
// memory) and applies it: the moves, one commit and the log entry. Also the
// replay that --imports-only runs on other branches.
import fs from "node:fs";
import path from "node:path";
import {
  barrelSource,
  git,
  pathTextExtensions,
  pruneLegacyEntries,
  rewriteDartDirectives,
  sortDirectives,
  trackedFiles,
  withBarrelExports,
} from "./dart_moves.mjs";
import {
  closureErrors,
  groupEntries,
  missingDependencies,
  planSourceMoves,
  pubspecDependencies,
  suggestClosure,
} from "./screen_move_plan.mjs";
import {planTestMoves} from "./screen_move_tests.mjs";
import {
  carriedScreensPath,
  emptiedFolders,
  isMentionText,
  rewriteMentions,
  rewriteScreenDirectives,
  screenMoveLogPath,
  staleFolderMentions,
} from "./screen_move_rewrite.mjs";
import {
  headSha,
  regeneratedOutputs,
  regenerationSteps,
  removeStaleComments,
  runRegeneration,
  staleIgnoreFindings,
  staleReviewIds,
  updateCarriedScreens,
} from "./screen_move_outputs.mjs";
import {formatLog, logEntry, parseLog, replayMoves} from "./screen_move_verify.mjs";

export const contextMapPath = "tool/architecture/context_map.json";
const sortedPackageDirs = [".", "apps/host", "apps/consumer", "widgetbook", "packages/catch_test_support"];

export function fileReader(root) {
  const cache = new Map();
  return (file) => {
    if (cache.has(file)) return cache.get(file);
    const absolute = path.join(root, file);
    const text = fs.existsSync(absolute) && fs.statSync(absolute).isFile()
      ? fs.readFileSync(absolute, "utf8")
      : null;
    cache.set(file, text);
    return text;
  };
}

function dependencyReader(read) {
  return (owner, {dev}) => pubspecDependencies(read(`${owner.dir}pubspec.yaml`) ?? "", {dev});
}

// Everything --plan reports and --apply performs, with no file touched.
export function buildGroupPlan({root, group, graph, files, packages, map, read = fileReader(root)}) {
  const log = parseLog(read(screenMoveLogPath));
  const errors = [];
  if (log.entries.some((entry) => entry.group === group)) {
    errors.push({kind: "group", message: `${screenMoveLogPath} already logs group ${group}; choose a new group name.`});
  }
  const entries = groupEntries(map, group);
  const source = planSourceMoves({group, map, files, graph, read});
  errors.push(...source.errors);
  const folderEntries = [
    ...entries.filter((entry) => entry.path.endsWith("/")).map((entry) => [entry.path, entry.moveTo]),
    ...log.entries.flatMap((entry) => [
      ...(entry.entries ?? []).filter((mapped) => mapped.path.endsWith("/"))
        .map((mapped) => [mapped.path, mapped.moveTo]),
      ...Object.entries(entry.folders ?? {}),
    ]),
  ];
  const tests = planTestMoves({graph, files, moves: source.moves, packages, folderEntries, read});
  errors.push(...tests.errors);
  const moves = new Map([...source.moves, ...tests.testMoves, ...tests.goldenMoves]);
  const widgetbookDependencies = [...pubspecDependencies(read("widgetbook/pubspec.yaml") ?? "", {dev: true})];
  const closure = closureErrors({graph, moves, map, packages, widgetbookDependencies});
  errors.push(...closure);
  errors.push(...missingDependencies({moves, read, packages, dependenciesOf: dependencyReader(read)}));
  const suggestion = suggestClosure({graph, moves, errors: closure, map});
  const folders = emptiedFolders({files, moves});

  const readAfter = (file) => {
    const reverse = [...moves].find(([, to]) => to === file)?.[0];
    return read(reverse ?? file);
  };
  const regenerated = regeneratedOutputs({readBefore: read, readAfter});
  const writes = new Map();
  const barrelExports = new Map();
  const deletedExports = [];
  let splitBarrels = 0;
  for (const file of files) {
    if (!file.endsWith(".dart")) continue;
    const text = read(file);
    if (text == null) continue;
    const result = rewriteScreenDirectives({file, source: text, graph, moves, packages, map, barrelExports});
    if (!result.changed) continue;
    writes.set(moves.get(file) ?? file, result.source);
    deletedExports.push(...result.deletedExports.map((target) => ({file, target})));
    splitBarrels += result.splitBarrels;
  }
  const publicApi = [];
  for (const [context, targets] of barrelExports) {
    const barrel = `${map.roots.contexts}${context}/${context}.dart`;
    const existing = read(barrel);
    writes.set(barrel, existing == null
      ? barrelSource(context, targets, map, "tool/architecture/move_screens.mjs")
      : withBarrelExports(writes.get(barrel) ?? existing, context, targets, map));
    publicApi.push(barrel);
  }
  const texts = new Map();
  for (const file of files) {
    const target = moves.get(file) ?? file;
    if (!isMentionText(target, regenerated) || !isMentionText(file, regenerated)) continue;
    const text = writes.get(target) ?? read(file);
    if (text != null) texts.set(target, text);
  }
  const mentioned = rewriteMentions({texts, moves, folders: folders.mapped, packages});
  for (const [file, text] of mentioned) {
    writes.set(file, text);
    texts.set(file, text);
  }
  const stale = staleFolderMentions({texts, folders: folders.unmapped});
  for (const finding of stale) {
    errors.push({kind: "staleFolder", file: finding.file, message: `${finding.file}:${finding.line} still names ${finding.folder}, which the move empties.`});
  }
  return {
    group,
    entries,
    sourceMoves: source.moves,
    testMoves: tests.testMoves,
    goldenMoves: tests.goldenMoves,
    moves,
    folders: folders.mapped,
    errors,
    suggestion,
    writes,
    mentionFiles: [...mentioned.keys()].sort(),
    deletedExports,
    splitBarrels,
    publicApi,
    regenerated: [...regenerated].sort(),
    regenerationSteps: regenerationSteps(),
    carried: fs.existsSync(path.join(root, carriedScreensPath))
      ? {status: "required", reason: `${carriedScreensPath} exists; the carry hook must be implemented (lane P2 merged).`}
      : {status: "skipped", reason: `${carriedScreensPath} is lane P2's file and is not on this branch; no carry entries are written.`},
    log,
  };
}

function writeFile(root, file, text) {
  const absolute = path.join(root, file);
  fs.mkdirSync(path.dirname(absolute), {recursive: true});
  fs.writeFileSync(absolute, text);
}

// Performs a plan that has no errors: renames, rewritten text, pruned map
// entries, the log entry, directive sorting, comment cleanup and the
// generators, then one commit with the regenerated inventories folded in.
// `external: false` skips the steps that need the Dart SDK and the
// repository's generators (directive sorting, comment cleanup, regeneration),
// as the codemod's own fixture tests do.
export function applyGroupPlan({root, plan, cleanupComments = true, external = true}) {
  if (plan.errors.length > 0) throw new Error(`Group ${plan.group} has ${plan.errors.length} plan error(s); run --plan.`);
  const status = git(["status", "--porcelain"], root).trim();
  if (status !== "") throw new Error("--apply needs a clean working tree.");
  for (const [from, to] of [...plan.moves].sort()) {
    fs.mkdirSync(path.join(root, path.dirname(to)), {recursive: true});
    git(["mv", from, to], root);
  }
  const written = new Set([...plan.moves.values()]);
  for (const [file, text] of plan.writes) {
    writeFile(root, file, text);
    written.add(file);
  }
  const mapFile = path.join(root, contextMapPath);
  const pruned = pruneLegacyEntries(fs.readFileSync(mapFile, "utf8"), trackedFiles(root));
  fs.writeFileSync(mapFile, pruned.source);
  written.add(contextMapPath);
  const log = {...plan.log, entries: [...plan.log.entries, logEntry({
    group: plan.group,
    entries: plan.entries,
    moves: plan.moves,
    folders: plan.folders,
  })]};
  writeFile(root, screenMoveLogPath, formatLog(log));
  written.add(screenMoveLogPath);
  if (external) sortDirectives(root, sortedPackageDirs);
  const carried = updateCarriedScreens({root, moves: plan.moves});
  let removedComments = [];
  if (external && cleanupComments) {
    const movedDart = [...plan.sourceMoves.values()].filter((file) =>
      file.endsWith(".dart") && !/\.(?:g|freezed)\.dart$/u.test(file));
    const read = (file) => (fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), "utf8") : null);
    removedComments = removeStaleComments({
      files: movedDart,
      staleReviewIds: staleReviewIds(root),
      staleIgnores: staleIgnoreFindings(root, movedDart),
      read,
      write: (file, text) => writeFile(root, file, text),
    });
  }
  const regeneratedBefore = external ? runRegeneration(root, "before-commit") : [];
  const resorted = git(["diff", "--name-only", "--", "*.dart"], root).split("\n").filter(Boolean);
  const outputs = plan.regenerated.filter((file) => fs.existsSync(path.join(root, file)));
  const toStage = [...new Set([...written, ...resorted, ...outputs])]
    .filter((file) => fs.existsSync(path.join(root, file)));
  for (let index = 0; index < toStage.length; index += 200) {
    git(["add", "--", ...toStage.slice(index, index + 200)], root);
  }
  const message = [
    `refactor(architecture): move ${plan.group} (phase 4)`,
    "",
    `Moves ${plan.sourceMoves.size} file(s) and ${plan.testMoves.size + plan.goldenMoves.size} test file(s) with tool/architecture/move_screens.mjs.`,
    "",
    `Screen-Move-Group: ${plan.group}`,
    "",
  ].join("\n");
  git(["commit", "-q", "-F", "-"], root, {input: message});
  if (external) runRegeneration(root, "after-commit", {sourceSha: headSha(root)});
  const changedOutputs = git(["diff", "--name-only"], root).split("\n").filter(Boolean)
    .filter((file) => plan.regenerated.includes(file));
  if (changedOutputs.length > 0) {
    git(["add", "--", ...changedOutputs], root);
    git(["commit", "-q", "--amend", "--no-edit"], root);
  }
  const leftover = git(["status", "--porcelain"], root).trim();
  return {
    commit: headSha(root),
    moved: plan.moves.size,
    prunedEntries: pruned.removed,
    carried,
    removedComments: removedComments.length,
    regenerated: external ? [...regeneratedBefore, "inventories"] : [],
    unstaged: leftover === "" ? [] : leftover.split("\n"),
  };
}

// The log entries a replay applies: those a move commit appended, or those a
// ref has that the branch's merge-base with it lacks.
export function replayEntries({root, from = null, since = null}) {
  const logAt = (ref) => {
    try {
      return parseLog(git(["show", `${ref}:${screenMoveLogPath}`], root, {stdio: ["ignore", "pipe", "ignore"]}));
    } catch {
      return {version: 1, entries: []};
    }
  };
  const [newer, older] = from != null
    ? [logAt(from), logAt(`${from}^`)]
    : [logAt(since), logAt(git(["merge-base", "HEAD", since], root).trim())];
  const known = new Set(older.entries.map((entry) => entry.group));
  return newer.entries.filter((entry) => !known.has(entry.group));
}

// Rewrites this branch for logged moves: files it added under a moved folder
// move too, then every directive and path mention follows. Nothing is
// committed.
export function replayImports({root, entries, packages, map, external = true}) {
  const files = trackedFiles(root);
  const {logged, branchMoves, folders} = replayMoves({entries, files});
  for (const [from, to] of [...branchMoves].sort()) {
    fs.mkdirSync(path.join(root, path.dirname(to)), {recursive: true});
    git(["mv", from, to], root);
  }
  const moves = new Map([...logged, ...branchMoves]);
  const reverse = new Map([...branchMoves].map(([from, to]) => [to, from]));
  const regenerated = regeneratedOutputs({readBefore: fileReader(root), readAfter: fileReader(root)});
  const texts = new Map();
  let dartFiles = 0;
  for (const current of trackedFiles(root)) {
    if (!pathTextExtensions.test(current)) continue;
    const absolute = path.join(root, current);
    if (!fs.existsSync(absolute)) continue;
    let text = fs.readFileSync(absolute, "utf8");
    if (current.endsWith(".dart")) {
      const result = rewriteDartDirectives({
        file: reverse.get(current) ?? current,
        source: text,
        moves,
        map,
        packages,
      });
      if (result.changed) {
        text = result.source;
        fs.writeFileSync(absolute, text);
        dartFiles += 1;
      }
    }
    if (isMentionText(current, regenerated)) texts.set(current, text);
  }
  const mentioned = rewriteMentions({texts, moves, folders, packages});
  for (const [file, text] of mentioned) fs.writeFileSync(path.join(root, file), text);
  if (external) sortDirectives(root, sortedPackageDirs);
  return {
    groups: entries.map((entry) => entry.group),
    branchMoves: branchMoves.size,
    dartFiles,
    mentionFiles: mentioned.size,
  };
}
