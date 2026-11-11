import fs from "node:fs";
import {createFunctionsRequire} from "../../lib/repo_paths.mjs";

// Event policy derivation is shared with Functions so the migration stores
// exactly what an event gets when it first receives terms. Build Functions
// (npm --prefix functions run build) before running the event-policy migration.
let eventPolicyModule = null;
function functionsEventPolicy() {
  try {
    eventPolicyModule ??= createFunctionsRequire()("./lib/events/eventPolicy.js");
  } catch (error) {
    throw new Error(
      "The event-policy migration needs the compiled Functions policy; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return eventPolicyModule;
}

const profilePromptCatalog = JSON.parse(fs.readFileSync(
  new URL("../../../contracts/catalogs/profile_prompts.json", import.meta.url), "utf8"));
const defaultPrompt = profilePromptCatalog.prompts.find(
  (prompt) => prompt.id === profilePromptCatalog.defaultPromptIds[0]
) ?? profilePromptCatalog.prompts[0];

function collapseStackedPromptBlankLines(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n");
}

/**
 * Registered copy-forward migrations for the November 2026 Firestore
 * consolidation. Each entry copies documents from retired collections into
 * their replacement; see ./copy_forward.mjs for the guarantees.
 * Lanes add their migration here; the CLI runs them by name or in order.
 */

export const MIGRATIONS = [
  {
    name: "schedule-locks",
    description:
      "organizerScheduleLocks and userEventScheduleLocks into scheduleLocks " +
      "with organizer_/user_ prefixed ids.",
    steps: [
      {
        source: "organizerScheduleLocks",
        target: "scheduleLocks",
        targetId: (id) => `organizer_${id}`,
        transform: (data) => ({...data, ownerType: "organizer"}),
      },
      {
        source: "userEventScheduleLocks",
        target: "scheduleLocks",
        targetId: (id) => `user_${id}`,
        transform: (data) => ({...data, ownerType: "user"}),
      },
    ],
  },
  {
    name: "event-policy",
    description:
      "events with capacity and price terms but no stored eventPolicy get the " +
      "policy an event receives with its first terms; events with gender " +
      "counts but empty cohortCounts get the matching cohort counts.",
    steps: [
      {
        kind: "fill",
        collection: "events",
        fill: (data) => {
          const fields = {};
          if (data.eventPolicy === undefined || data.eventPolicy === null) {
            // Load outside the try: a missing build is an error, not "no terms".
            const {initialPolicyFromTerms} = functionsEventPolicy();
            try {
              fields.eventPolicy = initialPolicyFromTerms(data);
            } catch {
              // No capacity and price terms yet: nothing to store.
            }
          }
          const cohorts = cohortCountsFromGenderCounts(data.genderCounts);
          const storedCohorts = data.cohortCounts ?? {};
          if (Object.keys(storedCohorts).length === 0 && Object.keys(cohorts).length > 0) {
            fields.cohortCounts = cohorts;
          }
          return Object.keys(fields).length > 0 ? fields : null;
        },
      },
    ],
  },
  {
    name: "profile-bio-prompts",
    description:
      "users with a legacy bio and no profile prompts get the bio as their " +
      "first prompt answer, so nothing reads bio any more. bio itself stays.",
    steps: [
      {
        kind: "fill",
        collection: "users",
        fill: (data) => {
          const bio = typeof data.bio === "string" ?
            collapseStackedPromptBlankLines(data.bio).trim() : "";
          const prompts = (data.profilePrompts ?? [])
            .filter((prompt) => typeof prompt?.answer === "string" && prompt.answer.trim());
          if (!bio || prompts.length > 0) return null;
          return {profilePrompts: [{
            promptId: defaultPrompt.id,
            prompt: defaultPrompt.title,
            answer: bio,
          }]};
        },
      },
    ],
  },
];

/** The cohort split Functions used to infer from gender counts at read time. */
function cohortCountsFromGenderCounts(genderCounts) {
  const counts = genderCounts ?? {};
  const nonBinaryOrOther = (counts.nonBinary ?? 0) + (counts.other ?? 0);
  return {
    ...(counts.man ? {menInterestedInWomen: counts.man} : {}),
    ...(counts.woman ? {womenInterestedInMen: counts.woman} : {}),
    ...(nonBinaryOrOther ? {nonBinaryOrOther} : {}),
  };
}

export function migrationsByName(names) {
  if (names.length === 1 && names[0] === "all") return MIGRATIONS;
  return names.map((name) => {
    const migration = MIGRATIONS.find((entry) => entry.name === name);
    if (!migration) {
      throw new Error(
        `Unknown migration "${name}". Known: ${MIGRATIONS.map((m) => m.name).join(", ")}, all.`
      );
    }
    return migration;
  });
}
