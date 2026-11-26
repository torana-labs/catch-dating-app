// Checks a tool's declared ciRequirements.setup against the executables its
// check commands run. CI installs only the declared setup (every Tools job
// also has Node, the Functions dependencies and the generated contracts), so
// a check that runs dart, flutter, rg or the root npm without declaring it
// would fail there with exit 127. This catches that gap before CI does.
//
// It reads each shell segment's executable only: dart/flutter need flutter,
// rg needs ripgrep, and npm/npx need root-npm unless they target functions/.
// What a Node script loads or spawns is out of its reach; those needs come
// from running the tool in its declared setup, and a missing toolchain there
// fails the check (tool_ci_requirements.test.mjs proves it fails, never skips).

const executableRequirement = {dart: "flutter", flutter: "flutter", rg: "ripgrep", npm: "root-npm", npx: "root-npm"};

function segments(command) {
  return command.split(/&&|\|\||[;|]/u).map((segment) => segment.trim()).filter(Boolean);
}

function executableOf(segment) {
  // Leading VAR=value assignments are not the executable.
  return segment.split(/\s+/u).find((word) => !/^[A-Za-z_][A-Za-z0-9_]*=/u.test(word)) ?? "";
}

/** The setup requirements a tool's check commands invoke directly, each with the command that shows it. */
export function invokedSetupRequirements(tool) {
  const found = new Map();
  for (const check of tool.checks ?? []) {
    for (const segment of segments(check)) {
      const requirement = executableRequirement[executableOf(segment)];
      if (!requirement) continue;
      if (requirement === "root-npm" && /--prefix[\s=]+\.?\/?functions\b/u.test(segment)) continue;
      if (!found.has(requirement)) found.set(requirement, check);
    }
  }
  return [...found].map(([requirement, command]) => ({requirement, command}));
}

/** Requirements a declared tool's checks invoke but its ciRequirements.setup leaves out. */
export function missingSetupRequirements(tool) {
  if (!tool.ciRequirements) return [];
  const declared = new Set(tool.ciRequirements.setup);
  return invokedSetupRequirements(tool).filter(({requirement}) => !declared.has(requirement));
}
