// Balanced-block matcher for Dart source text. It skips line and block
// comments and every Dart string form (plain, raw, triple-quoted), so
// delimiters inside them never count toward the nesting depth.

function isIdentifierChar(char) {
  return char !== undefined && /[A-Za-z0-9_$]/u.test(char);
}

// Returns the index just past a comment or string that starts at `index`,
// or null when `index` begins neither.
function skipNonCode(source, index) {
  const char = source[index];
  if (char === "/" && source[index + 1] === "/") {
    const newline = source.indexOf("\n", index);
    return newline === -1 ? source.length : newline + 1;
  }
  if (char === "/" && source[index + 1] === "*") {
    const close = source.indexOf("*/", index + 2);
    return close === -1 ? source.length : close + 2;
  }

  let quoteIndex = index;
  let raw = false;
  if (char === "r" && !isIdentifierChar(source[index - 1])) {
    const next = source[index + 1];
    if (next === "'" || next === '"') {
      raw = true;
      quoteIndex = index + 1;
    }
  }
  const quote = source[quoteIndex];
  if (quote !== "'" && quote !== '"') return null;

  const triple = source[quoteIndex + 1] === quote && source[quoteIndex + 2] === quote;
  const delimiter = triple ? quote.repeat(3) : quote;
  let cursor = quoteIndex + delimiter.length;
  while (cursor < source.length) {
    if (!raw && source[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (source.startsWith(delimiter, cursor)) return cursor + delimiter.length;
    cursor += 1;
  }
  return source.length;
}

export function findBalancedEnd(source, openIndex, openChar, closeChar) {
  let depth = 0;
  for (let index = openIndex; index < source.length; ) {
    const skipped = skipNonCode(source, index);
    if (skipped !== null) {
      index = skipped;
      continue;
    }
    const char = source[index];
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
    index += 1;
  }
  throw new Error(`Could not parse balanced call block starting at ${openIndex}.`);
}

export function extractCallBlocks(source, callName) {
  const blocks = [];
  let searchIndex = 0;
  while (searchIndex < source.length) {
    const callIndex = source.indexOf(`${callName}(`, searchIndex);
    if (callIndex === -1) break;
    const openIndex = source.indexOf("(", callIndex);
    const endIndex = findBalancedEnd(source, openIndex, "(", ")");
    blocks.push(source.slice(callIndex, endIndex + 1));
    searchIndex = endIndex + 1;
  }
  return blocks;
}
