// The design-system artifact's flat token files, written from the same resolved
// tokens as the Dart and CSS outputs. `$extensions["org.catch"].artifact` lists
// what the artifact publishes, under the artifact's names and in its order; the
// values and usage text always come from the tokens themselves.
import {cssColor, cssTokenValue} from "./values.mjs";

export const artifactJsonPath = "build/design-system/tokens.json";
export const artifactCssPath = "build/design-system/tokens.css";

const byPathOf = (tokens) => new Map(tokens.map((token) => [token.path.join("."), token]));

function lookup(byPath, path) {
  const token = byPath.get(path);
  if (token == null) throw new Error(`Artifact token not found: ${path}`);
  return token;
}

function usageOf(token) {
  const usage = token.$description;
  if (typeof usage !== "string" || usage === "") {
    throw new Error(`Artifact token needs a $description: ${token.path.join(".")}`);
  }
  if (usage.startsWith("Deprecated")) {
    throw new Error(`Artifact cannot publish a deprecated token: ${token.path.join(".")}`);
  }
  return usage;
}

const flatToken = (byPath) => ({name, token: path}) => {
  const token = lookup(byPath, path);
  return {name, value: cssTokenValue(token.$type, token.$value), usage: usageOf(token)};
};

function colorToken(byPath, {name, role}) {
  const day = lookup(byPath, `theme.light.color.${role}`);
  const night = lookup(byPath, `theme.dark.color.${role}`);
  const [dayValue, nightValue] = [day, night].map(({$value}) => cssColor($value).toLowerCase());
  return {
    name,
    value: dayValue === nightValue ? dayValue : {day: dayValue, night: nightValue},
    usage: usageOf(day),
  };
}

function shadowToken(byPath, {name, role}) {
  const [day, night] = ["light", "dark"].map((mode) => lookup(byPath, `theme.${mode}.elevation.${role}`));
  return {
    name,
    value: {
      day: cssTokenValue("shadow", day.$value),
      night: cssTokenValue("shadow", night.$value),
    },
    usage: usageOf(day),
  };
}

function typeStyle(byPath, document, {name, role, sample}) {
  const leaf = (key) => lookup(byPath, `typography.role.${role}.${key}`).$value;
  const usage = document.typography?.role?.[role]?.$description;
  if (typeof usage !== "string" || usage === "") throw new Error(`Type role needs a $description: ${role}`);
  const tracking = leaf("tracking");
  return {
    name,
    fontSize: cssTokenValue("dimension", leaf("size")),
    lineHeight: leaf("lineHeight"),
    fontWeight: leaf("weight"),
    letterSpacing: tracking.value === 0 ? "0" : cssTokenValue("dimension", tracking),
    usage,
    sample,
  };
}

/** The artifact's whole document, in the order of its format. */
export function buildArtifact({tokens, document}) {
  const manifest = document.$extensions?.["org.catch"]?.artifact;
  if (manifest == null) throw new Error("Missing artifact manifest.");
  const byPath = byPathOf(tokens);
  const flat = flatToken(byPath);
  const family = (key) => {
    const entries = manifest[key];
    if (!Array.isArray(entries) || entries.length === 0) throw new Error(`Empty artifact family: ${key}`);
    return {tokens: entries.map(flat)};
  };
  return {
    name: manifest.name,
    version: manifest.version,
    meta: manifest.meta,
    color: {
      themes: manifest.themes,
      tokens: manifest.colors.map((entry) => colorToken(byPath, entry)),
    },
    type: {
      fonts: manifest.fonts.map(({family: name, file, weight, style}) => ({family: name, file, weight, style})),
      families: Object.fromEntries(Object.entries(manifest.families).map(([key, path]) =>
        [key, lookup(byPath, path).$value])),
      groups: manifest.type.map(({name, family: groupFamily, styles}) => ({
        name,
        family: groupFamily,
        styles: styles.map((style) => typeStyle(byPath, document, style)),
      })),
    },
    spacing: family("spacing"),
    radius: family("radius"),
    shadow: {
      note: manifest.shadow.note,
      tokens: manifest.shadow.tokens.map((entry) => shadowToken(byPath, entry)),
    },
    size: family("size"),
    stroke: family("stroke"),
    duration: family("duration"),
    easing: family("easing"),
    layout: family("layout"),
    opacity: family("opacity"),
  };
}

export const artifactJson = (artifact) => JSON.stringify(artifact, null, 1);

/** The artifact's stylesheet: day on `:root`, night on `[data-theme="night"]`. */
export function artifactCss(artifact, {fonts}) {
  const faces = fonts.map(({family, file, weight, stretch, style}) =>
    `@font-face { font-family: "${family}"; src: url("${file}") format("truetype"); ` +
    `font-weight: ${weight}; font-stretch: ${stretch}; font-style: ${style}; font-display: swap; }`);
  const declaration = (name, value) => `  --${name}: ${value};`;
  const themed = (key) => artifact.color.tokens
    .map(({name, value}) => (typeof value === "string"
      ? (key === "day" ? declaration(name, value) : null)
      : declaration(name, value[key])))
    .filter((line) => line != null);
  const shadows = (key) => artifact.shadow.tokens.map(({name, value}) => declaration(name, value[key]));
  const scales = ["spacing", "radius", "size", "stroke", "duration", "easing", "layout", "opacity"]
    .flatMap((key) => artifact[key].tokens.map(({name, value}) => declaration(name, value)));
  const families = Object.entries(artifact.type.families).map(([key, value]) => declaration(`font-${key}`, value));
  const styles = artifact.type.groups.flatMap(({family, styles: members}) => members.map((style) =>
    `.${style.name} { font-family: var(--font-${family}); font-size: ${style.fontSize}; ` +
    `line-height: ${style.lineHeight}; font-weight: ${style.fontWeight}; letter-spacing: ${style.letterSpacing}; }`));
  return [
    "/* Catch — generated from tokens.json */",
    ...faces,
    ':root, [data-theme="day"] {',
    ...themed("day"),
    ...shadows("day"),
    "}",
    '[data-theme="night"] {',
    ...themed("night"),
    ...shadows("night"),
    "}",
    ":root {",
    ...scales,
    ...families,
    "}",
    ...styles,
    "",
  ].join("\n");
}
