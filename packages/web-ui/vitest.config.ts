import {createRequire} from "node:module";
import {pathToFileURL} from "node:url";
import {defineConfig, type TestProjectInlineConfiguration} from "vitest/config";

// The design-system canvas mounts web-ui with React 18, so every test also runs
// there and a React-19-only API fails CI. React 18 comes from the
// @catch/web-ui-react18 workspace package, found by package name so Node finds
// it wherever web-ui is checked out. Vite's alias sends web-ui's own imports to
// it; the hooks do the same for packages Node loads itself, such as Testing
// Library. A copy of web-ui without the package skips the project.
async function react18Project(): Promise<TestProjectInlineConfiguration | null> {
  let entry: string;
  try {
    entry = createRequire(import.meta.url).resolve("@catch/web-ui-react18");
  } catch (error) {
    if ((error as {code?: string}).code !== "MODULE_NOT_FOUND") throw error;
    console.warn("[web-ui] @catch/web-ui-react18 is not installed here; skipping the react18 test project.");
    return null;
  }
  const react18: {hooksPath: string; reactDir: string; reactDomDir: string} = await import(pathToFileURL(entry).href);
  return {
    extends: true,
    resolve: {
      alias: [
        {find: "react", replacement: react18.reactDir},
        {find: "react-dom", replacement: react18.reactDomDir},
      ],
    },
    test: {execArgv: ["--import", react18.hooksPath], name: "react18", setupFiles: ["./artifact/react18.setup.mjs"]},
  };
}

const react18 = await react18Project();

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    mockReset: true,
    restoreMocks: true,
    projects: [{extends: true, test: {name: "react19"}}, ...(react18 ? [react18] : [])],
  },
});
