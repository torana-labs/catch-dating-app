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
            env: {
              VITE_ADMIN_DATA_MODE: "sample",
            },
            include: ["src/**/*.test.{ts,tsx}", ".storybook/preview.test.ts"],
            mockReset: true,
            restoreMocks: true,
          },
        },
        {
          extends: true,
          // Pre-bundled so Vite never re-optimises mid-run and reloads a test page.
          optimizeDeps: {
            include: ["firebase/auth", "react-router"],
          },
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
