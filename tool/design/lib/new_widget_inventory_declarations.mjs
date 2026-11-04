const widgetBaseTypes = new Set([
  "Widget",
  "StatelessWidget",
  "StatefulWidget",
  "InheritedWidget",
  "InheritedNotifier",
  "InheritedModel",
  "ProxyWidget",
  "ParentDataWidget",
  "RenderObjectWidget",
  "LeafRenderObjectWidget",
  "SingleChildRenderObjectWidget",
  "MultiChildRenderObjectWidget",
  "SlottedMultiChildRenderObjectWidget",
  "PreferredSizeWidget",
  "ConsumerWidget",
  "ConsumerStatefulWidget",
  "HookWidget",
  "StatefulHookWidget",
  "HookConsumerWidget",
  "StatefulHookConsumerWidget",
]);

// These final, non-Widget descriptor types are the closed input protocols for
// the canonical route/root scaffolds. Keep this exact owner+method allowlist so
// unrelated Widget-returning helpers on the same types still fail inventory.
const canonicalClosedDescriptorRendererMethods = new Map([
  [
    "CatchRouteBody",
    new Set(["_build", "_buildStandard", "_buildStandardSlivers"]),
  ],
  ["CatchRootScreenPageSpec", new Set(["build"])],
  ["CatchRootScreenBody", new Set(["build"])],
  ["CatchRootScreenHeader", new Set(["_build"])],
]);

export function unresolvedInventoryItems({
  addedWidgets = [],
  addedWidgetHelpers = [],
  movedWidgets = [],
  movedWidgetHelpers = [],
}) {
  return [
    ...addedWidgets,
    ...addedWidgetHelpers,
    ...movedWidgets,
    ...movedWidgetHelpers,
  ].filter((entry) => entry.status !== "covered");
}

export function requireResolvedMergeBase(result) {
  const mergeBase = result?.status === 0 ? String(result.stdout ?? "").trim() : "";
  if (mergeBase) return mergeBase;
  throw new Error(
    "Unable to resolve the merge base between HEAD and origin/main; refusing " +
      "to fall back to HEAD^. Fetch origin/main or pass --base <commit>.",
  );
}

export function collectClassDeclarations(source, lineStarts = buildLineStarts(source)) {
  const code = maskNonCode(source);
  const rows = [];
  const regex =
    /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*<[^>{};=]+>)?\s+(?:extends|=)\s+(?:[A-Za-z_][A-Za-z0-9_]*\.)?([A-Za-z_][A-Za-z0-9_]*)(?:\s*<[^>{};=]+>)?/gu;

  for (const match of code.matchAll(regex)) {
    rows.push({
      name: match[1],
      baseClass: match[2],
      visibility: match[1].startsWith("_") ? "private" : "public",
      line: lineForOffset(lineStarts, match.index ?? 0),
    });
  }
  return rows;
}

export function resolveWidgetTypeNames(declarations) {
  const widgetTypes = new Set(widgetBaseTypes);
  let changed = true;
  while (changed) {
    changed = false;
    for (const declaration of declarations) {
      if (
        widgetTypes.has(declaration.name) ||
        !widgetTypes.has(declaration.baseClass)
      ) {
        continue;
      }
      widgetTypes.add(declaration.name);
      changed = true;
    }
  }
  return widgetTypes;
}

export function collectWidgetClasses(
  source,
  lineStarts,
  widgetTypeNames,
) {
  return collectClassDeclarations(source, lineStarts).filter((declaration) =>
    widgetTypeNames.has(declaration.baseClass),
  );
}

export function collectWidgetStateClasses(
  source,
  lineStarts = buildLineStarts(source),
) {
  const code = maskNonCode(source);
  const rows = [];
  const regex =
    /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*<[^>{};=]+>)?\s+extends\s+(?:[A-Za-z_][A-Za-z0-9_]*\.)?((?:State|ConsumerState)<(?:[^<>{}]|<[^<>{}]*>)+>)/gu;

  for (const match of code.matchAll(regex)) {
    rows.push({
      name: match[1],
      baseClass: match[2].replaceAll(/\s+/gu, " "),
      visibility: match[1].startsWith("_") ? "private" : "public",
      line: lineForOffset(lineStarts, match.index ?? 0),
    });
  }
  return rows;
}

export function collectWidgetHelpers(
  source,
  lineStarts,
  classRanges,
  widgetTypeNames,
) {
  // A multiline `Widget Function(...)` alias is a type declaration, not a
  // widget factory. Preserve offsets for both explicit and inferred helpers.
  const code = maskNonCode(source).replaceAll(
    /\btypedef\b[^;]*;/gu,
    (declaration) => declaration.replaceAll(/[^\r\n]/gu, " "),
  );
  const rows = [];
  const seen = new Set();
  const type =
    String.raw`(?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*(?:\s*<[^<>{};=()]*>)?\??`;
  const functionRegex = new RegExp(
    String.raw`(?:^|\n)([ \t]*(?:(?:static|external)\s+)*(${type})\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*<[^<>{};=()]+>)?\s*\()`,
    "gu",
  );
  const getterRegex = new RegExp(
    String.raw`(?:^|\n)([ \t]*(?:(?:static|external)\s+)*(${type})\s+get\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?==>|\{))`,
    "gu",
  );

  for (const regex of [functionRegex, getterRegex]) {
    for (const match of code.matchAll(regex)) {
      const offset = (match.index ?? 0) + (match[0].startsWith("\n") ? 1 : 0);
      // An old-style function-typed parameter can look exactly like a helper
      // declaration on its own line (`Widget builder()`). It is not a widget
      // factory, so exclude matches nested inside another parameter list.
      if (delimiterDepthAt(code, offset, "(", ")") > 0) continue;
      const returnType = simpleTypeName(match[2]);
      const name = match[3];
      if (name === "build" || !widgetTypeNames.has(returnType)) continue;
      const key = `${offset}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const owner = innermostClassRange(classRanges, offset);
      // Descriptor renderers are the typed mapper protocol, not free-standing
      // composition helpers that can drift outside a cataloged widget owner.
      if (
        owner?.name === "CatchFormRowDescriptor" ||
        owner?.baseClass === "CatchFormRowDescriptor" ||
        isCanonicalClosedDescriptorRenderer(owner?.name, name)
      ) {
        continue;
      }
      rows.push({
        name,
        owner: owner?.name ?? null,
        ownerBaseClass: owner?.baseClass ?? null,
        returnType: match[2].replaceAll(/\s+/gu, ""),
        visibility: name.startsWith("_") ? "private" : "public",
        line: lineForOffset(lineStarts, offset),
        scope: owner ? "class-method" : "top-level",
        declarationKind: regex === getterRegex ? "getter" : "function",
      });
    }
  }

  const looseCandidates = collectLooseHelperCandidates(code, classRanges);
  const widgetHelperNames = new Set(rows.map(({name}) => name));
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of looseCandidates) {
      const key = `${candidate.offset}:${candidate.name}`;
      if (seen.has(key)) continue;
      if (
        !candidate.returnExpressions.some((expression) =>
          returnedExpressionLooksLikeWidget(
            expression,
            widgetTypeNames,
            widgetHelperNames,
            candidate.unchangedObjectParameters,
          ),
        )
      ) {
        continue;
      }
      seen.add(key);
      widgetHelperNames.add(candidate.name);
      changed = true;
      const {name, owner} = candidate;
      if (
        name === "build" ||
        owner?.name === "CatchFormRowDescriptor" ||
        owner?.baseClass === "CatchFormRowDescriptor" ||
        isCanonicalClosedDescriptorRenderer(owner?.name, name)
      ) {
        continue;
      }
      rows.push({
        name,
        owner: owner?.name ?? null,
        ownerBaseClass: owner?.baseClass ?? null,
        returnType: candidate.returnType == null
          ? "inferred"
          : candidate.returnType.replaceAll(/\s+/gu, ""),
        visibility: name.startsWith("_") ? "private" : "public",
        line: lineForOffset(lineStarts, candidate.offset),
        scope: owner ? "class-method" : "top-level",
        declarationKind: candidate.declarationKind,
      });
    }
  }

  return rows.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
}

function collectLooseHelperCandidates(code, classRanges) {
  const rows = [];
  const type =
    String.raw`(?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*\??`;
  const functionRegex = new RegExp(
    String.raw`(?:^|\n)([ \t]*(?:(?:static|external)\s+)*(?:(${type})\s+)?([A-Za-z_][A-Za-z0-9_]*)(?:\s*<[^<>{};=()]+>)?\s*\()`,
    "gu",
  );
  const getterRegex = new RegExp(
    String.raw`(?:^|\n)([ \t]*(?:(?:static|external)\s+)*(?:(${type})\s+)?get\s+([A-Za-z_][A-Za-z0-9_]*)\s*)`,
    "gu",
  );

  for (const match of code.matchAll(functionRegex)) {
    const offset = (match.index ?? 0) + (match[0].startsWith("\n") ? 1 : 0);
    if (delimiterDepthAt(code, offset, "(", ")") > 0) continue;
    if (!isLooseReturnType(match[2])) continue;
    if (match[2] == null && precededByReturnTypeLine(code, offset)) continue;
    const name = match[3];
    // A type-shaped, unannotated `Foo()` followed by `=>` is a Dart object
    // pattern in a switch expression, not a function declaration.
    if (
      controlFlowNames.has(name) ||
      (match[2] == null && /^_?[A-Z]/u.test(name))
    ) {
      continue;
    }
    const owner = innermostClassRange(classRanges, offset);
    if (owner?.name === name) continue;
    const open = code.indexOf("(", offset + match[1].lastIndexOf(name));
    const close = findMatchingDelimiter(code, open, "(", ")");
    if (close === -1) continue;
    const body = looseCallableBody(code, close + 1);
    if (body == null) continue;
    rows.push({
      name,
      owner,
      offset,
      returnType: match[2] ?? null,
      declarationKind: "function",
      returnExpressions: body,
      unchangedObjectParameters: unchangedObjectParameters(code, open, close, owner),
    });
  }

  for (const match of code.matchAll(getterRegex)) {
    const offset = (match.index ?? 0) + (match[0].startsWith("\n") ? 1 : 0);
    if (!isLooseReturnType(match[2])) continue;
    if (match[2] == null && precededByReturnTypeLine(code, offset)) continue;
    const body = looseCallableBody(
      code,
      (match.index ?? 0) + match[0].length,
    );
    if (body == null) continue;
    rows.push({
      name: match[3],
      owner: innermostClassRange(classRanges, offset),
      offset,
      returnType: match[2] ?? null,
      declarationKind: "getter",
      returnExpressions: body,
    });
  }
  return rows;
}

// A top-level data mapper can return its original Object input on a fallback
// path. That is not evidence of a widget factory. Keep this proof narrow:
// one explicit Object parameter, no default, no writes or shadowing, and a
// block body. Other return paths still undergo the ordinary widget checks.
function unchangedObjectParameters(code, open, close, owner) {
  if (owner != null) return new Set();
  const parameter = code.slice(open + 1, close).trim()
    .match(/^Object\??\s+([A-Za-z_][A-Za-z0-9_]*)$/u)?.[1];
  if (parameter == null) return new Set();
  let start = close + 1;
  while (/\s/u.test(code[start] ?? "")) start += 1;
  if (code[start] !== "{") return new Set();
  const end = findMatchingBrace(code, start);
  if (end === -1) return new Set();
  const body = code.slice(start + 1, end);
  if (/(?<![=!<>])=(?!=|>)|\+\+|--|\b(?:var|final|late|catch|for)\b/u.test(body)) {
    return new Set();
  }
  const declarations = new RegExp(
    String.raw`\b([A-Za-z_][A-Za-z0-9_.]*(?:<[^;{}()]+>)?\??)\s+${parameter}\b`,
    "gu",
  );
  if ([...body.matchAll(declarations)].some((match) => match[1] !== "return")) {
    return new Set();
  }
  return new Set([parameter]);
}

const controlFlowNames = new Set([
  "assert",
  "catch",
  "for",
  "if",
  "return",
  "switch",
  "while",
]);

function isLooseReturnType(type) {
  return type == null || simpleTypeName(type) === "Object" || type === "dynamic";
}

// `dart format` wraps a long signature with the return type on a line of its
// own:
//
//   AsyncValue<CheckpointSession>
//   checkpointSessionForAccount(Ref ref) { ... }
//
// The name line then carries no type, but the declaration is typed, so it is
// not a loose helper whose body decides what it returns. The typed scan above
// already reads such declarations across the line break.
const wrappedReturnTypeLine = new RegExp(
  String.raw`^(?:(?:static|external)\s+)*(?:[A-Za-z_][A-Za-z0-9_]*\.)?([A-Za-z_][A-Za-z0-9_]*)(?:<[^;{}()=]*>)?\??$`,
  "u",
);
const notReturnTypes = new Set([
  "async", "await", "const", "else", "final", "late", "new", "return", "sync",
  "throw", "var", "yield",
]);

function precededByReturnTypeLine(code, offset) {
  let end = offset - 1;
  while (end >= 0) {
    const start = code.lastIndexOf("\n", end - 1) + 1;
    const line = code.slice(start, end).trim();
    if (line.length > 0) {
      const match = wrappedReturnTypeLine.exec(line);
      return match != null && !notReturnTypes.has(match[1]);
    }
    end = start - 1;
  }
  return false;
}

function looseCallableBody(code, start) {
  let cursor = start;
  while (/\s/u.test(code[cursor] ?? "")) cursor += 1;
  if (code.startsWith("async", cursor)) {
    cursor += "async".length;
    while (/\s/u.test(code[cursor] ?? "")) cursor += 1;
  }
  if (code.startsWith("=>", cursor)) {
    const end = findExpressionSemicolon(code, cursor + 2, code.length);
    return end === -1 ? null : [code.slice(cursor + 2, end)];
  }
  if (code[cursor] !== "{") return null;
  const close = findMatchingBrace(code, cursor);
  if (close === -1) return null;
  return collectDirectReturnExpressions(code, cursor, close);
}

function collectDirectReturnExpressions(code, open, close) {
  const rows = [];
  const functionBodyStack = [];
  for (let cursor = open + 1; cursor < close; cursor += 1) {
    if (code[cursor] === "{") {
      functionBodyStack.push(isNestedFunctionBodyOpen(code, cursor));
      continue;
    }
    if (code[cursor] === "}") {
      functionBodyStack.pop();
      continue;
    }
    if (
      functionBodyStack.includes(true) ||
      !code.startsWith("return", cursor) ||
      /[A-Za-z0-9_]/u.test(code[cursor - 1] ?? "") ||
      /[A-Za-z0-9_]/u.test(code[cursor + "return".length] ?? "")
    ) {
      continue;
    }
    const end = findExpressionSemicolon(
      code,
      cursor + "return".length,
      close,
    );
    if (end === -1 || end > close) continue;
    rows.push(code.slice(cursor + "return".length, end));
    cursor = end;
  }
  return rows;
}

function findExpressionSemicolon(code, start, limit) {
  const depths = {"(": 0, "[": 0, "{": 0};
  const closes = {")": "(", "]": "[", "}": "{"};
  for (let cursor = start; cursor < limit; cursor += 1) {
    const token = code[cursor];
    if (Object.hasOwn(depths, token)) depths[token] += 1;
    else if (Object.hasOwn(closes, token)) {
      depths[closes[token]] = Math.max(0, depths[closes[token]] - 1);
    } else if (
      token === ";" &&
      depths["("] === 0 &&
      depths["["] === 0 &&
      depths["{"] === 0
    ) {
      return cursor;
    }
  }
  return -1;
}

function isNestedFunctionBodyOpen(code, open) {
  let cursor = previousNonWhitespace(code, open - 1);
  if (code[cursor] === "*") cursor = previousNonWhitespace(code, cursor - 1);
  const modifier = previousIdentifier(code, cursor);
  if (modifier?.value === "async" || modifier?.value === "sync") {
    cursor = previousNonWhitespace(code, modifier.start - 1);
    if (code[cursor] === "*") cursor = previousNonWhitespace(code, cursor - 1);
  }
  if (code[cursor] !== ")") return false;
  const parameterOpen = findMatchingDelimiterBackward(code, cursor, "(", ")");
  if (parameterOpen === -1) return false;
  const preceding = previousIdentifier(
    code,
    previousNonWhitespace(code, parameterOpen - 1),
  )?.value;
  return !controlFlowNames.has(preceding);
}

function previousNonWhitespace(code, start) {
  let cursor = start;
  while (cursor >= 0 && /\s/u.test(code[cursor])) cursor -= 1;
  return cursor;
}

function previousIdentifier(code, end) {
  if (end < 0 || !/[A-Za-z0-9_]/u.test(code[end])) return null;
  let start = end;
  while (start > 0 && /[A-Za-z0-9_]/u.test(code[start - 1])) start -= 1;
  return {start, value: code.slice(start, end + 1)};
}

function returnedExpressionLooksLikeWidget(
  expression,
  widgetTypeNames,
  widgetHelperNames,
  unchangedObjectParameters = new Set(),
) {
  let value = expression.trim();
  let explicitConstructor = false;
  let normalizing = true;
  while (normalizing) {
    normalizing = false;
    while (value.startsWith("(")) {
      const close = findMatchingDelimiter(value, 0, "(", ")");
      if (close !== value.length - 1) break;
      value = value.slice(1, -1).trim();
      normalizing = true;
    }
    if (/^(?:const|new)\s+/u.test(value)) {
      explicitConstructor = true;
      value = value.replace(/^(?:(?:const|new)\s+)+/u, "");
      normalizing = true;
    }
  }
  const cast = value.match(
    /\s+as\s+(?:[A-Za-z_][A-Za-z0-9_]*\.)?([A-Za-z_][A-Za-z0-9_]*)\??\s*$/u,
  );
  if (cast != null) {
    if (widgetTypeNames.has(cast[1])) return true;
    if (cast[1] === "Object" || cast[1] === "dynamic") {
      value = value.slice(0, cast.index).trim();
    }
  }
  const call = value.match(
    /^([A-Za-z_][A-Za-z0-9_]*(?:\s*\.\s*[A-Za-z_][A-Za-z0-9_]*)*)(?:\s*<[^<>(){};]+>)?\s*\(/u,
  );
  if (call != null) {
    const parts = call[1].split(".").map((part) => part.trim());
    if (widgetHelperNames.has(parts.at(-1))) return true;
    if (parts.some((part) => widgetTypeNames.has(part))) return true;
    if (explicitConstructor && parts.some((part) => /^_?[A-Z]/u.test(part))) {
      return true;
    }
    // Without analyzer resolution, a loose helper returning a direct
    // capitalized constructor is ambiguous. Fail closed for the new/moved
    // declaration; qualified lowercase calls such as Navigator.of remain
    // ordinary behavior callbacks.
    if (/^_?[A-Z]/u.test(parts.at(-1))) return true;
  }
  const identifier = value.match(
    /^(?:this\s*\.\s*)?([A-Za-z_][A-Za-z0-9_]*)[!?]?$/u,
  )?.[1];
  if (identifier == null) return false;
  if (widgetHelperNames.has(identifier)) return true;
  if (unchangedObjectParameters.has(identifier)) return false;
  // A bare local/field returned through Object, dynamic, or inference cannot
  // be resolved by this syntax-only gate. Treat the new/moved declaration as
  // ambiguous and require a precise non-Widget return type to clear it.
  return !nonWidgetValueKeywords.has(identifier);
}

const nonWidgetValueKeywords = new Set([
  "false",
  "null",
  "super",
  "this",
  "true",
]);

function isCanonicalClosedDescriptorRenderer(ownerName, methodName) {
  return canonicalClosedDescriptorRendererMethods
    .get(ownerName)
    ?.has(methodName) === true;
}

export function collectClassRanges(source, lineStarts = buildLineStarts(source)) {
  const code = maskNonCode(source);
  const rows = [];
  const regex =
    /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*<[^>{};=]+>)?(?:\s+extends\s+(?:[A-Za-z_][A-Za-z0-9_]*\.)?([A-Za-z_][A-Za-z0-9_]*)(?:\s*<[^>{};=]+>)?)?/gu;

  for (const match of code.matchAll(regex)) {
    const open = code.indexOf("{", match.index);
    const semicolon = code.indexOf(";", match.index);
    if (open === -1 || (semicolon !== -1 && semicolon < open)) continue;
    const close = findMatchingBrace(code, open);
    if (close === -1) continue;
    rows.push({
      name: match[1],
      baseClass: match[2] ?? "",
      open,
      close,
      line: lineForOffset(lineStarts, match.index ?? 0),
    });
  }

  return rows.sort((a, b) => a.open - b.open);
}

export function buildLineStarts(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") starts.push(index + 1);
  }
  return starts;
}

function simpleTypeName(type) {
  return type
    .replaceAll(/\s+/gu, "")
    .replace(/\?$/u, "")
    .replace(/<.*>$/u, "")
    .split(".")
    .at(-1);
}

function innermostClassRange(ranges, offset) {
  return ranges
    .filter((range) => offset > range.open && offset < range.close)
    .sort((a, b) => (a.close - a.open) - (b.close - b.open))[0];
}

function lineForOffset(lineStarts, offset) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= offset) low = mid + 1;
    else high = mid - 1;
  }
  return high + 1;
}

function findMatchingBrace(code, open) {
  return findMatchingDelimiter(code, open, "{", "}");
}

function findMatchingDelimiter(code, open, opener, closer) {
  let depth = 0;
  for (let index = open; index < code.length; index += 1) {
    if (code[index] === opener) depth += 1;
    else if (code[index] === closer) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function findMatchingDelimiterBackward(code, close, opener, closer) {
  let depth = 0;
  for (let index = close; index >= 0; index -= 1) {
    if (code[index] === closer) depth += 1;
    else if (code[index] === opener) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function delimiterDepthAt(code, offset, open, close) {
  let depth = 0;
  for (let index = 0; index < offset; index += 1) {
    if (code[index] === open) depth += 1;
    else if (code[index] === close) depth = Math.max(0, depth - 1);
  }
  return depth;
}

function maskNonCode(source) {
  const output = [...source];
  let index = 0;
  let blockDepth = 0;
  let lineComment = false;
  let string = null;

  const blank = (position) => {
    if (output[position] !== "\n" && output[position] !== "\r") {
      output[position] = " ";
    }
  };

  while (index < source.length) {
    if (lineComment) {
      if (source[index] === "\n") lineComment = false;
      else blank(index);
      index += 1;
      continue;
    }
    if (blockDepth > 0) {
      if (source.startsWith("/*", index)) {
        blank(index);
        blank(index + 1);
        blockDepth += 1;
        index += 2;
      } else if (source.startsWith("*/", index)) {
        blank(index);
        blank(index + 1);
        blockDepth -= 1;
        index += 2;
      } else {
        blank(index);
        index += 1;
      }
      continue;
    }
    if (string != null) {
      const {quote, triple, raw} = string;
      const terminator = triple ? quote.repeat(3) : quote;
      if (source.startsWith(terminator, index)) {
        for (let cursor = 0; cursor < terminator.length; cursor += 1) {
          blank(index + cursor);
        }
        index += terminator.length;
        string = null;
      } else if (!raw && source[index] === "\\") {
        blank(index);
        blank(index + 1);
        index += 2;
      } else {
        blank(index);
        index += 1;
      }
      continue;
    }
    if (source.startsWith("//", index)) {
      blank(index);
      blank(index + 1);
      lineComment = true;
      index += 2;
      continue;
    }
    if (source.startsWith("/*", index)) {
      blank(index);
      blank(index + 1);
      blockDepth = 1;
      index += 2;
      continue;
    }
    if (source[index] === "'" || source[index] === '"') {
      const quote = source[index];
      const triple = source.startsWith(quote.repeat(3), index);
      const raw = index > 0 && /[rR]/u.test(source[index - 1]);
      const length = triple ? 3 : 1;
      for (let cursor = 0; cursor < length; cursor += 1) blank(index + cursor);
      string = {quote, triple, raw};
      index += length;
      continue;
    }
    index += 1;
  }

  return output.join("");
}
