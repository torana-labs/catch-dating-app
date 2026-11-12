import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
const root = path.dirname(fileURLToPath(import.meta.url));
const browserKeys = [
  "VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET", "VITE_FIREBASE_MESSAGING_SENDER_ID", "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID", "VITE_WEBSITE_APPCHECK_SITE_KEY",
  "VITE_CONSUMER_APP_URL",
];
export default {
  // Bind production eligibility to the browser configuration of this build.
  // A runtime stage switch cannot turn an unconfigured preview into production.
  env: {CATCH_NEXT_PRODUCTION_BUILD_READY: String(spawnSync(process.execPath,
    [path.join(root, "../tool/env/check_web_hosting_env.mjs"), "marketing", "--expected-project-id", "catch-dating-app-64e51"],
    {env: process.env, stdio: "ignore"}).status === 0)},
  output: "standalone",
  outputFileTracingRoot: path.resolve(root, ".."),
  poweredByHeader: false,
  async headers() {
    return [{source: "/.well-known/apple-app-site-association", headers: [{key: "Content-Type", value: "application/json"}]}];
  },
  skipTrailingSlashRedirect: true,
  typescript: {tsconfigPath: "tsconfig.next.json"},
  // Public pages wait for authorization and metadata before sending any HTML.
  htmlLimitedBots: /.*/,
  serverExternalPackages: ["firebase-admin", "ajv", "ajv-formats"],
  webpack(config, {webpack}) {
    config.resolve.alias["@content"] = path.join(root, "src/content");
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/schema_contract_validators\.mjs$/, resource => {
      resource.request = path.join(root, "scripts/next/publicValidators.mjs");
    }));
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/(?:^|\/)data(?:\.ts)?$/, resource => {
      if (path.resolve(resource.context, resource.request).replace(/\.ts$/, "") ===
          path.join(root, "src/features/organizers/data")) {
        resource.request = path.join(root, "src/features/organizers/emptyData.ts");
      }
    }));
    // Shared browser configuration may receive import.meta.env as one object.
    // Construct that object only from public keys; never serialize process.env.
    const browserEnvironment = Object.fromEntries(browserKeys.map(key => [key, process.env[key] ?? ""]));
    config.plugins.push(new webpack.DefinePlugin({
      "import.meta.env": JSON.stringify({...browserEnvironment, DEV: false, MODE: "production"}),
    }));
    return config;
  },
};
