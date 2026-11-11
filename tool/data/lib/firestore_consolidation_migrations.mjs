import fs from "node:fs";

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
