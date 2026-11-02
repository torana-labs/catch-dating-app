import type {StorybookConfig} from "@storybook/react-vite";
import {mergeConfig} from "vite";

const config: StorybookConfig = {
  addons: ["@storybook/addon-a11y", "@storybook/addon-vitest"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  stories: [
    "../src/**/*.stories.@(ts|tsx)",
    "../../packages/web-ui/src/**/*.stories.@(ts|tsx)",
  ],
  // Admin stories are explicit visual/state contracts; generated prop metadata
  // adds every shared primitive to feature chunks without powering those cases.
  typescript: {
    reactDocgen: false,
  },
  async viteFinal(baseConfig) {
    return mergeConfig(baseConfig, {
      build: {
        rollupOptions: {
          output: {
            manualChunks(id: string) {
              const normalized = id.replaceAll("\\", "/");
              const feature = normalized.match(/\/admin\/src\/features\/([^/]+)\//u)?.[1];
              if (feature) return `admin-feature-${feature}`;
              if (normalized.includes("/node_modules/firebase/")) return "vendor-firebase";
              if (normalized.includes("/node_modules/@tanstack/")) return "vendor-tanstack";
              return undefined;
            },
          },
        },
      },
    });
  },
};

export default config;
