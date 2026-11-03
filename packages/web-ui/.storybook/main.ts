import type {StorybookConfig} from "@storybook/react-vite";

// web-ui's own Storybook. Its static build is the design-system artifact's
// canvas: tool/design/publish_design_system.mjs builds it into
// build/design-system/storybook and points each component's preview at its
// Contract story. The website and Admin Storybooks include these stories too.
const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  // No docs addon reads generated prop tables; index.d.ts documents the props.
  typescript: {
    reactDocgen: false,
  },
};

export default config;
