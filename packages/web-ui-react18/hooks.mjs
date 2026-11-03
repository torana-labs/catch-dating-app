// Loaded with `node --import` in each React 18 test worker. Vite's alias sends
// web-ui's own `react` imports to React 18; these hooks do the same for
// packages Node loads itself (Testing Library, lucide-react), whose `require`
// would otherwise find the workspace's React 19.
import {createRequire, registerHooks} from "node:module";
import {pathToFileURL} from "node:url";

const requireReact18 = createRequire(import.meta.url);
const reactSpecifier = /^react(?:-dom)?(?:\/|$)/u;
const resolved = new Map();
let resolving = false;

registerHooks({
  resolve(specifier, context, nextResolve) {
    // requireReact18.resolve runs these hooks too; let it through.
    if (resolving || !reactSpecifier.test(specifier)) return nextResolve(specifier, context);
    if (!resolved.has(specifier)) {
      resolving = true;
      try {
        resolved.set(specifier, pathToFileURL(requireReact18.resolve(specifier)).href);
      } finally {
        resolving = false;
      }
    }
    return {format: "commonjs", shortCircuit: true, url: resolved.get(specifier)};
  },
});
