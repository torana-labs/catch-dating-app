// How one resolved token value is written in CSS and in Dart. Every function
// throws on a value it cannot represent, so a bad token fails generation
// instead of reaching a stylesheet or the Flutter API.

export const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function mapValue(value, label) {
  if (value == null) return {};
  if (isPlainObject(value)) return value;
  throw new Error(`${label} must be an object.`);
}

export const kebab = (input) => [...input].map((char, index) => {
  const lower = char.toLowerCase();
  const isUpper = char.toUpperCase() === char && lower !== char;
  return `${isUpper && index > 0 ? "-" : ""}${lower === "_" ? "-" : lower}`;
}).join("");

export const pascal = (input) => input.split(/[-_]/u)
  .map((part) => (part === "" ? part : part[0].toUpperCase() + part.slice(1)))
  .join("");

export const camel = (parts) =>
  (parts.length === 0 ? "" : parts[0] + parts.slice(1).map(pascal).join(""));

export function cssVariableName(path) {
  if (path.length === 4 && path[0] === "theme" && path[2] === "color") {
    return `--catch-color-${kebab(path[1])}-${kebab(path[3])}`;
  }
  if (path.length === 3 && path[0] === "font" && path[1] === "family") {
    return `--catch-font-${kebab(path[2])}`;
  }
  return `--catch-${path.map(kebab).join("-")}`;
}

const formatNumber = (value) => String(value);

/** Whole numbers need `.0`: every numeric token is a Dart double. */
export const formatDartNumber = (value) =>
  (Number.isInteger(value) ? `${value}.0` : String(value));

export function rawCssValue(value) {
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return value;
  throw new Error(`Cannot emit CSS value for ${JSON.stringify(value)}.`);
}

const hexByte = (value) => value.toString(16).padStart(2, "0").toUpperCase();

function componentToByte(value) {
  if (typeof value !== "number") throw new Error("srgb components must be numbers.");
  return Math.min(Math.max(Math.round(value * 255), 0), 255);
}

function srgbChannels(color, target) {
  if (color.colorSpace !== "srgb") {
    throw new Error(`Only srgb color tokens can be emitted to ${target}.`);
  }
  const {components} = color;
  if (!Array.isArray(components) || components.length !== 3) {
    throw new Error("srgb color components must have 3 values.");
  }
  return components.map(componentToByte);
}

export function cssColor(value) {
  const color = mapValue(value, "color value");
  const channels = srgbChannels(color, "CSS");
  const alpha = color.alpha ?? 1;
  if (alpha === 1 && typeof color.hex === "string") return color.hex.toUpperCase();
  return `rgba(${channels.join(", ")}, ${formatNumber(alpha)})`;
}

export function dartColor(value) {
  const color = mapValue(value, "color value");
  const [red, green, blue] = srgbChannels(color, "Dart");
  const alpha = color.alpha ?? 1;
  if (alpha === 1) {
    if (typeof color.hex === "string") return `Color(0xFF${color.hex.slice(1).toUpperCase()})`;
    return `Color(0xFF${hexByte(red)}${hexByte(green)}${hexByte(blue)})`;
  }
  return `Color.fromRGBO(${red}, ${green}, ${blue}, ${formatDartNumber(alpha)})`;
}

function cssDimension(value) {
  const {value: number, unit} = mapValue(value, "dimension value");
  if (typeof number !== "number") throw new Error("dimension value must be numeric.");
  if (typeof unit !== "string" || unit === "") throw new Error("dimension unit must be a string.");
  return `${formatNumber(number)}${unit}`;
}

export function dartDimension(value) {
  const dimension = mapValue(value, "dimension value");
  if (dimension.unit !== "px") throw new Error("Only px dimensions can be emitted to Dart.");
  if (typeof dimension.value !== "number") throw new Error("dimension value must be numeric.");
  return formatDartNumber(dimension.value);
}

/** One or more DTCG shadow layers, the same numbers in CSS and Flutter. */
function shadowLayers(value) {
  const layers = Array.isArray(value) ? value : [value];
  if (layers.length === 0) throw new Error("shadow needs at least one layer.");
  return layers.map((raw) => {
    const layer = mapValue(raw, "shadow layer");
    const px = (key) => {
      const dimension = mapValue(layer[key], `shadow ${key}`);
      if (dimension.unit !== "px" || typeof dimension.value !== "number") {
        throw new Error(`shadow ${key} must be a px dimension.`);
      }
      return dimension.value;
    };
    return {
      color: mapValue(layer.color, "shadow color"),
      x: px("offsetX"),
      y: px("offsetY"),
      blur: px("blur"),
      spread: px("spread"),
    };
  });
}

const cssLength = (value) => (value === 0 ? "0" : `${formatNumber(value)}px`);

export function isCubicBezier(value) {
  return Array.isArray(value) && value.length === 4 &&
    value.every((part) => typeof part === "number");
}

/** The CSS value of one token, or null when a type has no CSS form. */
export function cssTokenValue(type, value) {
  switch (type) {
    case "color": return cssColor(value);
    case "dimension":
    case "duration": return cssDimension(value);
    case "number": return rawCssValue(value);
    case "fontFamily": return `"${value}"`;
    case "cubicBezier":
      if (!isCubicBezier(value)) throw new Error("cubicBezier needs four numeric values.");
      return `cubic-bezier(${value.map(formatNumber).join(", ")})`;
    case "shadow":
      return shadowLayers(value).map((layer) => [
        cssLength(layer.x),
        cssLength(layer.y),
        cssLength(layer.blur),
        ...(layer.spread === 0 ? [] : [cssLength(layer.spread)]),
        cssColor(layer.color),
      ].join(" ")).join(", ");
    default:
      return typeof value === "string" || typeof value === "number" ? rawCssValue(value) : null;
  }
}

export const dartShadowLayers = (value) => shadowLayers(value).map((layer) => [
  "BoxShadow(",
  `color: ${dartColor(layer.color)},`,
  `blurRadius: ${formatDartNumber(layer.blur)},`,
  ...(layer.spread === 0 ? [] : [`spreadRadius: ${formatDartNumber(layer.spread)},`]),
  `offset: Offset(${formatDartNumber(layer.x)}, ${formatDartNumber(layer.y)}),`,
  "),",
].join("\n")).join("\n");

function dartAlignment(value) {
  const {x, y} = mapValue(value, "gradient alignment");
  if (typeof x !== "number") throw new Error("x must be numeric.");
  if (typeof y !== "number") throw new Error("y must be numeric.");
  if (x === -1 && y === -1) return "Alignment.topLeft";
  if (x === 1 && y === 1) return "Alignment.bottomRight";
  if (x === 0 && y === 0) return "Alignment.center";
  return `Alignment(${formatDartNumber(x)}, ${formatDartNumber(y)})`;
}

function hexColorValue(hex) {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  if (normalized.length !== 6) throw new Error(`Expected #RRGGBB color, got ${hex}.`);
  const channel = (start) => Number.parseInt(normalized.slice(start, start + 2), 16) / 255;
  return {
    colorSpace: "srgb",
    components: [channel(0), channel(2), channel(4)],
    hex: `#${normalized.toUpperCase()}`,
  };
}

export function dartGradient(value) {
  const gradient = mapValue(value, "gradient value");
  if (gradient.type !== "linear") throw new Error(`Unsupported gradient type: ${gradient.type}.`);
  if (!Array.isArray(gradient.colors) || gradient.colors.length === 0) {
    throw new Error("gradient colors must be a non-empty array.");
  }
  const colors = gradient.colors.map((color) =>
    dartColor(typeof color === "string" && color.startsWith("#") ? hexColorValue(color) : color));
  return `LinearGradient(begin: ${dartAlignment(gradient.begin)}, ` +
    `end: ${dartAlignment(gradient.end)}, colors: <Color>[${colors.join(", ")}],)`;
}

export const dartStringLiteral = (value) => `'${value.replaceAll("'", "\\'")}'`;

/** Dart's `clamp` turns NaN (the saturation of black) into the upper bound. */
const unit = (value) => (Number.isNaN(value) ? 1 : Math.min(Math.max(value, 0), 1));

/** Dart's `%`, which never returns a negative number for a positive divisor. */
function euclideanModulo(value, divisor) {
  const remainder = value % divisor;
  return remainder < 0 ? remainder + divisor : remainder;
}

function rgbToHsl(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (max !== 0) {
    if (max === red) hue = 60 * euclideanModulo((green - blue) / delta, 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (Number.isNaN(hue)) hue = 0;
  const lightness = (max + min) / 2;
  const saturation = lightness === 1 ? 0 : unit(delta / (1 - Math.abs(2 * lightness - 1)));
  return {hue, saturation, lightness};
}

function hslToHex({hue, saturation, lightness}) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const secondary = chroma * (1 - Math.abs(euclideanModulo(hue / 60, 2) - 1));
  const match = lightness - chroma / 2;
  const sextant = [
    [chroma, secondary, 0],
    [secondary, chroma, 0],
    [0, chroma, secondary],
    [0, secondary, chroma],
    [secondary, 0, chroma],
    [chroma, 0, secondary],
  ][Math.min(Math.floor(hue / 60), 5)];
  return `#${sextant.map((channel) => hexByte(Math.round((channel + match) * 255))).join("")}`;
}

/**
 * Mirrors `ActivitySwatch._derive` in `lib/platform/theme/activity_palette.dart`,
 * including Flutter's `HSLColor` math, so the website reads the same deep, soft
 * and dark-mode swatches the app derives at runtime.
 * `test/core/theme/activity_palette_web_parity_test.dart` fails on drift.
 */
export function derivedActivitySwatches(pigment) {
  if (typeof pigment?.hex !== "string") throw new Error("activity pigments need a hex value.");
  const hsl = rgbToHsl(...hexColorValue(pigment.hex).components);
  const {saturation, lightness} = hsl;
  return {
    deep: hslToHex({...hsl, lightness: unit(lightness - 0.13), saturation: unit(saturation + 0.04)}),
    soft: hslToHex({...hsl, lightness: 0.93, saturation: unit(saturation * 0.55)}),
    "accent-dark": hslToHex({...hsl, lightness: unit(lightness + 0.07)}),
    "soft-dark": hslToHex({...hsl, lightness: 0.22, saturation: unit(saturation * 0.5)}),
  };
}
