import path from "node:path";
import {fileURLToPath} from "node:url";
import {storybookTest} from "@storybook/addon-vitest/vitest-plugin";
import {playwright} from "@vitest/browser-playwright";
import {defineConfig, mergeConfig} from "vitest/config";
import viteConfig from "./vite.config.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            environment: "jsdom",
            // The committed production projection is empty: real organisers
            // live only in the production database. Unit tests read the
            // fictional listing from the story fixtures instead.
            alias: [{
              find: /^\.\.\/\.\.\/generated\/hostListings\.json$/u,
              replacement: path.join(dirname, "src/stories/fixtures/syntheticHostListings.json"),
            }],
            include: ["src/**/*.test.{ts,tsx}"],
            setupFiles: ["src/stories/fixtures/phoneLaneSetup.tsx"],
            mockReset: true,
            restoreMocks: true,
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({configDir: path.join(dirname, ".storybook")}),
          ],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              headless: true,
              provider: playwright({}),
              instances: [{browser: "chromium"}],
            },
          },
        },
      ],
    },
  })
);
