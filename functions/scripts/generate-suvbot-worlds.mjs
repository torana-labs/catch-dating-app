#!/usr/bin/env node
// Bundles the demo worlds (tool/demo/demo_seed/scenarios, schemaVersion 2)
// and the personas they cast into a Functions module. Functions cannot read
// tool/ at runtime, so Suvbot starts worlds from this generated copy.
//
//   node functions/scripts/generate-suvbot-worlds.mjs          # write
//   node functions/scripts/generate-suvbot-worlds.mjs --check  # fail if stale
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const scenarioRoot = path.join(repoRoot, "tool/demo/demo_seed/scenarios");
const personaRoot = path.join(repoRoot, "tool/demo/demo_seed/personas");
export const suvbotWorldBundlePath = path.join(
  repoRoot,
  "functions/src/demoOps/generated/suvbotDemoWorlds.ts"
);

/** Returns the generated module text for the worlds currently on disk. */
export async function suvbotWorldBundleSource() {
  const {isDemoWorld, validateDemoWorld} = await import(
    pathToFileURL(path.join(repoRoot, "tool/demo/lib/demo_world.mjs")).href
  );
  const worlds = fs.readdirSync(scenarioRoot)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => ({
      name,
      config: JSON.parse(fs.readFileSync(path.join(scenarioRoot, name), "utf8")),
    }))
    .filter(({config}) => isDemoWorld(config))
    .map(({name, config}) => validateDemoWorld(config, name))
    .sort((a, b) => a.id.localeCompare(b.id));

  const personas = personasById();
  const castIds = new Set(worlds.flatMap((world) => [
    world.host.personaId,
    ...world.people.map((person) => person.personaId),
  ]));
  const cast = [...castIds].sort().map((id) => bundledPersona(personas.get(id)));

  const bundle = {worlds, personas: cast};
  return [
    "/* eslint-disable */",
    "// GENERATED CODE - DO NOT MODIFY BY HAND.",
    "// Regenerate with: node functions/scripts/generate-suvbot-worlds.mjs",
    "",
    "import type {SuvbotWorldBundle} from \"../demoWorld\";",
    "",
    `export const suvbotWorldBundle: SuvbotWorldBundle = ${JSON.stringify(bundle, null, 2)};`,
    "",
  ].join("\n");
}

function personasById() {
  const byId = new Map();
  for (const file of fs.readdirSync(personaRoot)
    .filter((name) => name.endsWith("_personas.draft.json"))
    .sort()) {
    const catalog = JSON.parse(fs.readFileSync(path.join(personaRoot, file), "utf8"));
    for (const persona of catalog.personas) byId.set(persona.id, persona);
  }
  return byId;
}

// Only the fields a profile needs; briefs and image prompts stay in tool/.
function bundledPersona(persona) {
  return {
    id: persona.id,
    firstName: persona.firstName,
    lastName: persona.lastName,
    displayName: persona.displayName,
    gender: persona.gender,
    dateOfBirth: persona.dateOfBirth,
    heightCm: persona.heightCm ?? null,
    occupation: persona.occupation ?? null,
    company: persona.company ?? null,
    profilePrompts: persona.profilePrompts.map((prompt) => ({
      promptId: prompt.promptId,
      answer: prompt.answer,
    })),
    photos: persona.photos
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((photo) => ({
        id: photo.id,
        position: photo.position,
        promptId: photo.promptId,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        storagePath: photo.storagePath,
        thumbnailStoragePath: photo.thumbnailStoragePath,
      })),
  };
}

async function main(argv) {
  const source = await suvbotWorldBundleSource();
  const relative = path.relative(repoRoot, suvbotWorldBundlePath);
  if (argv.includes("--check")) {
    const current = fs.existsSync(suvbotWorldBundlePath) ?
      fs.readFileSync(suvbotWorldBundlePath, "utf8") :
      "";
    if (current !== source) {
      console.error(
        `${relative} is stale. Run: node functions/scripts/generate-suvbot-worlds.mjs`
      );
      process.exitCode = 1;
      return;
    }
    console.log(`${relative} is current.`);
    return;
  }
  fs.mkdirSync(path.dirname(suvbotWorldBundlePath), {recursive: true});
  fs.writeFileSync(suvbotWorldBundlePath, source);
  console.log(`Wrote ${relative}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
