export const productionWidgetRoots = Object.freeze([
  "lib",
  "packages/catch_ui/lib",
  "apps/consumer/lib",
  "apps/host/lib",
]);

export const productionWidgetGlobs = Object.freeze(
  productionWidgetRoots.map((root) => `${root}/**`),
);

const generatedProductionWidgetFiles = new Set([
  "lib/l10n/generated/app_localizations.dart",
  "lib/l10n/generated/app_localizations_en.dart",
]);

export function isProductionWidgetDartPath(value) {
  if (typeof value !== "string" || value.includes("\\")) return false;
  const segments = value.split("/");
  if (segments.includes("") || segments.includes(".") || segments.includes("..")) {
    return false;
  }
  return value.endsWith(".dart") && productionWidgetRoots.some(
    (root) => value.startsWith(`${root}/`),
  );
}

// Context domain and data layers hold no UI under the Bounded Context Contract
// (domain code cannot import Flutter), so the new-widget inventory skips them;
// context parts/ and actions/ and every screen folder stay in scope.
const contextModelLayer = /^lib\/contexts\/[^/]+\/(?:domain|data)\//u;

export function isWidgetInventoryPath(value) {
  return isProductionWidgetDartPath(value) && !contextModelLayer.test(value);
}

export function isGeneratedProductionWidgetDartPath(value) {
  if (!isProductionWidgetDartPath(value)) return false;
  return (
    value.endsWith(".g.dart") ||
    value.endsWith(".freezed.dart") ||
    generatedProductionWidgetFiles.has(value)
  );
}
