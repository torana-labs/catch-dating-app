import {hooksPath, reactDir, reactDomDir, setupPath} from "@catch/web-ui-react18";
import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    mockReset: true,
    restoreMocks: true,
    projects: [
      {extends: true, test: {name: "react19"}},
      // The design-system canvas mounts web-ui with React 18, so every test
      // runs there too and a React-19-only API fails CI. Vite's alias sends
      // web-ui's own imports to React 18; the hooks do the same for packages
      // Node loads itself, such as Testing Library.
      {
        extends: true,
        resolve: {
          alias: [
            {find: "react", replacement: reactDir},
            {find: "react-dom", replacement: reactDomDir},
          ],
        },
        test: {execArgv: ["--import", hooksPath], name: "react18", setupFiles: [setupPath]},
      },
    ],
  },
});
