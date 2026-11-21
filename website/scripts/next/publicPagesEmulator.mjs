import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const backfill = fileURLToPath(new URL("../../../functions/scripts/backfill-public-pages.cjs", import.meta.url));

/**
 * The website reads only the public page read models, which Functions
 * triggers rebuild in a deployed project. The acceptance runs have no
 * triggers, so after changing an organizer's sources they rebuild its pages
 * with the same rebuild (build Functions first: npm --prefix functions run
 * build). Bound to the isolated emulator; never a live project.
 */
export function rebuildPublicPages(projectId, organizerId) {
  if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8765") throw new Error("Isolated emulator required");
  execFileSync(process.execPath, [backfill, "--project", projectId, "--apply", "--organizer", organizerId],
    {stdio: ["ignore", "ignore", "inherit"], env: process.env});
}
