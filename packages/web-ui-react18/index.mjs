// React 18 for web-ui's React 18 test project and the artifact bundle check.
// The design-system canvas mounts web-ui with React 18 while the workspace
// installs React 19, so this package holds its own copy and says where it is.
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";

const require = createRequire(import.meta.url);

/** The folder React 18 resolves from. */
export const react18Root = path.dirname(fileURLToPath(import.meta.url));
/** React 18's package folder. */
export const reactDir = path.dirname(require.resolve("react/package.json"));
/** React DOM 18's package folder. */
export const reactDomDir = path.dirname(require.resolve("react-dom/package.json"));
/** The module hooks that send every `react` and `react-dom` import to React 18. */
export const hooksPath = path.join(react18Root, "hooks.mjs");
/** A setup file that fails the run unless React and React DOM are 18. */
export const setupPath = path.join(react18Root, "setup.mjs");
