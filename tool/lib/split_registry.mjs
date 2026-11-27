// Hand-written registries split into one file per entry, so two pull requests
// that declare different screens never edit the same file. A registry is an
// index file (its small, rarely edited fields) plus one directory per split
// collection. Readers call readSplitRegistry and get the same object the
// single file used to hold; schema validation runs on that merged object.
//
// A collection is either:
//   {field, dir, kind: "map"}: the file stem is the map key and the file holds
//     the value, so a key cannot be declared twice.
//   {field, dir, kind: "array", key: entry => string, stem?: entry => string}:
//     each file holds one entry. With `stem`, the file name must equal
//     stem(entry); without it the name is free. Either way two entries with
//     the same key fail.
// Arrays and maps come back in file-name order.
import fs from "node:fs";
import path from "node:path";

export class SplitRegistryError extends Error {}

function entryFiles(root, dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  const names = fs.readdirSync(absolute, {withFileTypes: true});
  const files = [];
  for (const entry of names) {
    if (entry.isDirectory() || !entry.name.endsWith(".json")) {
      throw new SplitRegistryError(`${dir}/${entry.name}: only .json entry files belong here.`);
    }
    files.push(entry.name);
  }
  // Code-unit order, so Node and any other reader agree.
  return files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function readJson(root, relative) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  } catch (error) {
    throw new SplitRegistryError(`${relative}: ${error.message}`);
  }
}

/** Every file that makes up the registry, index first. */
export function splitRegistryFiles(root, spec) {
  return [spec.index, ...spec.collections.flatMap(collection =>
    entryFiles(root, collection.dir).map(name => `${collection.dir}/${name}`))];
}

export function readSplitRegistry(root, spec) {
  const registry = readJson(root, spec.index);
  for (const collection of spec.collections) {
    if (Object.hasOwn(registry, collection.field)) {
      throw new SplitRegistryError(`${spec.index}: ${collection.field} lives in ${collection.dir}/, one file per entry.`);
    }
    // A registry without the directory has no such collection, as a single
    // file without the field had none.
    if (!fs.existsSync(path.join(root, collection.dir))) continue;
    const files = entryFiles(root, collection.dir);
    if (collection.kind === "map") {
      registry[collection.field] = Object.fromEntries(files.map(name =>
        [name.slice(0, -".json".length), readJson(root, `${collection.dir}/${name}`)]));
      continue;
    }
    const seen = new Map();
    registry[collection.field] = files.map(name => {
      const relative = `${collection.dir}/${name}`;
      const entry = readJson(root, relative);
      const key = collection.key(entry);
      if (typeof key !== "string" || key === "") {
        throw new SplitRegistryError(`${relative}: the entry has no ${collection.field} key.`);
      }
      if (seen.has(key)) {
        throw new SplitRegistryError(`${relative}: ${key} is already declared by ${seen.get(key)}.`);
      }
      seen.set(key, relative);
      if (collection.stem && `${collection.stem(entry)}.json` !== name) {
        throw new SplitRegistryError(`${relative}: name the file ${collection.stem(entry)}.json.`);
      }
      return entry;
    });
  }
  return registry;
}

const stableJson = value => `${JSON.stringify(value, null, 2)}\n`;

/**
 * Moves collections still written inline in the index out to one file per
 * entry and leaves the index with its own fields. An existing identical file
 * is kept; a different one is refused, so no edit is lost. The migration ran
 * this, and it resolves a merge that brought an inline entry back.
 */
export function splitInlineEntries(root, spec, {stemOf = {}} = {}) {
  const index = readJson(root, spec.index);
  const written = [];
  const conflicts = [];
  for (const collection of spec.collections) {
    if (!Object.hasOwn(index, collection.field)) continue;
    const value = index[collection.field];
    const entries = collection.kind === "map" ? Object.entries(value) :
      value.map(entry => [(collection.stem ?? stemOf[collection.field])(entry), entry]);
    fs.mkdirSync(path.join(root, collection.dir), {recursive: true});
    for (const [stem, entry] of entries) {
      const relative = `${collection.dir}/${stem}.json`;
      const file = path.join(root, relative);
      const text = stableJson(entry);
      if (fs.existsSync(file)) {
        if (fs.readFileSync(file, "utf8") !== text) conflicts.push(relative);
        continue;
      }
      fs.writeFileSync(file, text);
      written.push(relative);
    }
    delete index[collection.field];
  }
  if (conflicts.length > 0) {
    for (const relative of written) fs.rmSync(path.join(root, relative));
    throw new SplitRegistryError(`These entries differ from the inline copy in ${spec.index}; ` +
      `merge each by hand:\n${conflicts.map(file => `  ${file}`).join("\n")}`);
  }
  fs.writeFileSync(path.join(root, spec.index), stableJson(index));
  return written;
}
