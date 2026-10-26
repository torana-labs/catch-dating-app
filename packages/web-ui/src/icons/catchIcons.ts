import {
  catchActivityIconNames,
  catchIconStrokeWidth,
  type CatchActivityKind,
} from "./catchIconGlyphs.generated";
import {catchIconNodes, type CatchIconNodeName} from "./catchIconNodes.generated";

/** The icon role that draws an event activity kind. */
export function activityIconName(kind: CatchActivityKind) {
  return catchActivityIconNames[kind];
}

const escapeAttribute = (value: string) =>
  value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;").replace(/</gu, "&lt;");

/**
 * SVG markup for an activity or Playbook role, as a `<g>` in a 24 x 24 box that
 * strokes with `currentColor`, for artwork drawn outside React.
 */
export function catchIconSvgMarkup(
  name: CatchIconNodeName,
  {strokeWidth = catchIconStrokeWidth}: {strokeWidth?: number} = {},
) {
  const children = catchIconNodes[name].map(([tag, attributes]) => {
    const rendered = Object.entries(attributes)
      .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
      .join("");
    return `<${tag}${rendered}/>`;
  });
  return `<g fill="none" stroke="currentColor" stroke-width="${strokeWidth}" `
    + `stroke-linecap="round" stroke-linejoin="round">${children.join("")}</g>`;
}
