import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

// The do-not-list key derivation and hashing, loaded from the Functions build
// (functions/lib/listingSuppressions/registry.js loads the shared module that
// Functions ships), so the takedown tool and the intake checks derive and
// hash identity keys identically. Build Functions first:
// npm --prefix functions run build.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const requireFromFunctions = createRequire(path.join(repoRoot, "functions/package.json"));

async function load() {
  let registry;
  try {
    registry = requireFromFunctions("./lib/listingSuppressions/registry.js");
  } catch (error) {
    throw new Error("Could not load functions/lib/listingSuppressions/registry.js. Run " +
      `\`npm --prefix functions run build\` before the takedown tool. Original error: ${error.message}`);
  }
  return registry.suppressionModule();
}

const shared = await load();

export const {
  SUPPRESSION_HASH_SCHEME,
  SUPPRESSION_REASONS,
  isSuppressionCaseId,
  suppressionHashes,
  suppressionKeysForIdentity,
  suppressionKeysForIntakeRequest,
  usableSuppressionSecret,
} = shared;
