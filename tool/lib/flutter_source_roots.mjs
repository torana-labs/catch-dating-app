import fs from "node:fs";
import path from "node:path";

// Screens live in lib/ until they are redrawn, then in apps/<app>/lib/. A check
// that reads screen code takes its roots from here, so a moved screen cannot
// fall outside it. App packages are read from disk: a new one is covered on
// arrival, and a fixture root without apps/ scans only lib/. Promoted packages that
// hold widgets stay in scope, so promoting one cannot quietly end its checks.
const appPackageSource = /^apps\/[^/]+\/lib\//u;
const promotedSourceRoots = ["packages/platform/lib"];

export function appPackageSourceRoots(root) {
  const apps = path.join(root, "apps");
  if (!fs.existsSync(apps)) return [];
  return fs.readdirSync(apps, {withFileTypes: true})
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(apps, entry.name, "lib")))
    .map((entry) => `apps/${entry.name}/lib`)
    .sort();
}

export function screenSourceRoots(root) {
  return ["lib", ...promotedSourceRoots.filter((source) => fs.existsSync(path.join(root, source))),
    ...appPackageSourceRoots(root)];
}

export function isAppPackageSource(relativePath) {
  return appPackageSource.test(relativePath);
}

export function isScreenSource(relativePath) {
  return relativePath.startsWith("lib/") || isAppPackageSource(relativePath) ||
    promotedSourceRoots.some((source) => relativePath.startsWith(`${source}/`));
}
