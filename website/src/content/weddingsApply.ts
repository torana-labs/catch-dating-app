// The pilot application (/weddings/apply/) on the LiveWeddingsApply board:
// the step rail over the kit's flow. The application's own copy stays in
// weddingsCopy (weddings.ts).
export const weddingsApplyCopy = {
  stepsLabel: "Application steps",
  steps: ["About you and the wedding", "About the weekend"],
  stepStatus: {complete: "done", needsInformation: "to do", optional: "optional"},
} as const;
