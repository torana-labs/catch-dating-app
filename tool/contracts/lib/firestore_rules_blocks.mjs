// Reads firestore.rules into its match blocks, so contract checks can compare
// the rules with the Firestore registry and the client-write contracts
// without trusting a substring search.

/**
 * Every match block under the documents block, outermost first. Each block
 * has its full path (nested matches joined, for example
 * `/users/{uid}/pushInstallations/{installationId}`), the line it starts on,
 * its own body with comments removed and whitespace collapsed (nested match
 * blocks excluded), and its allow statements.
 */
export function parseRulesMatchBlocks(rules) {
  const text = stripComments(rules);
  // Without a documents block (a bare fragment), every match is top level.
  const marker = text.search(/\/documents\s*\{/u);
  let index = marker === -1 ? 0 : text.indexOf("{", marker) + 1;
  const stack = [{path: null, body: "", line: 0}];
  const blocks = [];
  while (index < text.length) {
    if (text.startsWith("match", index) && /\s/u.test(text[index - 1] ?? " ")) {
      const found = /^match\s+(\/\S+)\s*\{/u.exec(text.slice(index));
      if (found) {
        stack.push({path: found[1], body: "", line: lineAt(text, index)});
        index += found[0].length;
        continue;
      }
    }
    const char = text[index];
    if (char === "{") {
      stack.push({path: null, body: "{", line: 0});
    } else if (char === "}") {
      if (stack.length === 1) break;
      const closed = stack.pop();
      if (closed.path !== null) {
        const parentPath = stack.map((entry) => entry.path).filter(Boolean).join("");
        const body = closed.body.replace(/\s+/gu, " ").trim();
        blocks.push({
          path: `${parentPath}${closed.path}`,
          line: closed.line,
          body,
          allows: parseAllowStatements(body),
        });
      } else {
        stack[stack.length - 1].body += `${closed.body}}`;
      }
    } else {
      stack[stack.length - 1].body += char;
    }
    index += 1;
  }
  return blocks.sort((left, right) => left.line - right.line);
}

/**
 * The allow statements of one block body: the methods each names (`write`
 * expanded to create, update and delete; `read` to get and list) and its
 * condition text.
 */
export function parseAllowStatements(body) {
  const statements = [];
  for (const match of body.matchAll(/\ballow\s+([a-z,\s]+?)\s*(?::\s*if\s+([^;]*?))?\s*;/gu)) {
    const methods = new Set();
    for (const raw of match[1].split(",")) {
      const method = raw.trim();
      if (method === "write") ["create", "update", "delete"].forEach((m) => methods.add(m));
      else if (method === "read") ["get", "list"].forEach((m) => methods.add(m));
      else if (method) methods.add(method);
    }
    const condition = (match[2] ?? "true").trim();
    statements.push({methods: [...methods], condition, denied: condition === "false"});
  }
  return statements;
}

/** The methods a block allows a client under some condition. */
export function allowedMethods(block) {
  const methods = new Set();
  for (const statement of block.allows) {
    if (statement.denied) continue;
    for (const method of statement.methods) methods.add(method);
  }
  return methods;
}

/** A Firestore path with every `{placeholder}` replaced by `{}`. */
export function normalizeFirestorePath(value) {
  return value.replace(/^\//u, "").replace(/\{[^}]*\}/gu, "{}");
}

/**
 * True when a rules match path governs a document path. A recursive
 * wildcard (`{name=**}`) governs every path below its prefix; otherwise the
 * segment counts match, and a placeholder segment in the rules matches any
 * single segment: a literal id, a placeholder, or a composite id such as
 * `{programId}__{alertId}`.
 */
export function rulesPathGoverns(rulesPath, documentPath) {
  const rulesSegments = rulesPath.replace(/^\//u, "").split("/");
  const documentSegments = documentPath.replace(/^\//u, "").split("/");
  for (let index = 0; index < rulesSegments.length; index += 1) {
    const rulesSegment = rulesSegments[index];
    if (/^\{[^}]*=\*\*\}$/u.test(rulesSegment)) {
      return index === rulesSegments.length - 1 && documentSegments.length > index;
    }
    const documentSegment = documentSegments[index];
    if (documentSegment === undefined) return false;
    if (/^\{[^}]*\}$/u.test(rulesSegment)) continue;
    if (rulesSegment !== documentSegment) return false;
  }
  return rulesSegments.length === documentSegments.length;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, (comment) => comment.replace(/[^\n]/gu, " "))
    .replace(/\/\/[^\n]*/gu, "");
}

function lineAt(text, index) {
  return text.slice(0, index).split("\n").length;
}
