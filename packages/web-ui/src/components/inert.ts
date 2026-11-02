import {version} from "react";

// React 19 writes `inert` as a boolean attribute. React 18, which the
// design-system canvas mounts, drops `inert={true}` with a warning and writes
// only a string, while React 19 reads the string "" as false. Remove this when
// the canvas runs React 19.
const writesBooleanInert = Number.parseInt(version, 10) >= 19;
const react18Inert = {inert: ""} as unknown as {inert: boolean};

/**
 * Props that make an element inert (out of the tab order, the accessibility
 * tree and pointer input) under both React versions web-ui renders on. Spread
 * them: `<div {...inertProps(hidden)} />`.
 */
export function inertProps(inert: boolean): {inert?: boolean} {
  if (!inert) return {};
  return writesBooleanInert ? {inert: true} : react18Inert;
}
