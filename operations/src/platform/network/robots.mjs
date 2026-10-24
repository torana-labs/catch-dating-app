// robots.txt parsing and matching per RFC 9309. Groups are selected by the
// crawler's product token, falling back to the "*" group; within a group the
// longest matching rule wins and Allow wins a tie.

const MAX_RULES = 2_000;

export function parseRobotsTxt(text, productToken) {
  const token = String(productToken).toLowerCase();
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const rawLine of String(text ?? "").split(/\r\n|\r|\n/u)) {
    const line = rawLine.replace(/#.*$/u, "").trim();
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = {agents: [], rules: []};
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current || (field !== "allow" && field !== "disallow")) continue;
    if (current.rules.length >= MAX_RULES) continue;
    // An empty Disallow allows everything and contributes no rule.
    if (value.length === 0) continue;
    current.rules.push({allow: field === "allow", pattern: value});
  }
  const named = groups.filter((group) =>
    group.agents.some((agent) => agent !== "*" && agent === token));
  const selected = named.length > 0 ?
    named :
    groups.filter((group) => group.agents.includes("*"));
  return {rules: selected.flatMap((group) => group.rules)};
}

export function robotsAllows(policy, pathWithQuery) {
  const path = pathWithQuery || "/";
  if (path === "/robots.txt") return true;
  if (policy === "allow_all") return true;
  if (policy === "disallow_all") return false;
  let best = null;
  for (const rule of policy.rules) {
    if (!patternMatches(rule.pattern, path)) continue;
    const length = rule.pattern.length;
    if (!best || length > best.length || (length === best.length && rule.allow)) {
      best = {length, allow: rule.allow};
    }
  }
  return best ? best.allow : true;
}

// Iterative wildcard matching: O(pattern * path) even for hostile patterns,
// where a translated regular expression could backtrack exponentially.
function patternMatches(pattern, path) {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : `${pattern}*`;
  let p = 0;
  let s = 0;
  let star = -1;
  let resume = 0;
  while (s < path.length) {
    if (p < body.length && body[p] !== "*" && body[p] === path[s]) {
      p += 1;
      s += 1;
    } else if (p < body.length && body[p] === "*") {
      star = p;
      resume = s;
      p += 1;
    } else if (star >= 0) {
      p = star + 1;
      resume += 1;
      s = resume;
    } else {
      return false;
    }
  }
  while (p < body.length && body[p] === "*") p += 1;
  return p === body.length;
}
