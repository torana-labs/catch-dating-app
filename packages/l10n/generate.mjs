#!/usr/bin/env node

// flutter gen-l10n reads l10n.yaml from its working directory. The component
// graph runs write commands from the repository root with no shell operators,
// so this runs it from the package.

import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const {status, error} = spawnSync("flutter", ["gen-l10n"], {
  cwd: fileURLToPath(new URL(".", import.meta.url)),
  stdio: "inherit",
});
if (error) throw error;
process.exit(status ?? 1);
