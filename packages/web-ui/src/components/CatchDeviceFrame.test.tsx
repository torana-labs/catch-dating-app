import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchDeviceFrame, type CatchDeviceFrameKind, type CatchDeviceFrameOrientation} from "./CatchDeviceFrame";

afterEach(cleanup);

const frameOf = (alt: string) => screen.getByRole("img", {name: alt}).parentElement?.parentElement as HTMLElement;

describe("CatchDeviceFrame", () => {
  it("frames the screen, which carries the description, as the kind and tilt given", () => {
    render(<CatchDeviceFrame kind="phone" tilt="left"><img alt="The Catch app showing tonight's plans" src="/explore.png" /></CatchDeviceFrame>);
    expect(frameOf("The Catch app showing tonight's plans").dataset).toMatchObject({kind: "phone", orientation: "portrait", tilt: "left"});
  });

  it("stands upright by default and holds a tablet landscape unless told otherwise", () => {
    render(<CatchDeviceFrame kind="tablet"><img alt="Host app" src="/host.png" /></CatchDeviceFrame>);
    expect(frameOf("Host app").dataset).toMatchObject({kind: "tablet", orientation: "landscape", tilt: "none"});
  });

  it("keeps a phone portrait whatever orientation it is given", () => {
    render(<CatchDeviceFrame kind="android" orientation="landscape"><img alt="Android" src="/a.png" /></CatchDeviceFrame>);
    expect(frameOf("Android").dataset.orientation).toBe("portrait");
  });

  it("reads the deprecated iphone and ipad kinds as phone and tablet", () => {
    render(
      <>
        <CatchDeviceFrame kind="iphone"><img alt="Old phone" src="/p.png" /></CatchDeviceFrame>
        <CatchDeviceFrame kind="ipad"><img alt="Old tablet" src="/t.png" /></CatchDeviceFrame>
      </>,
    );
    expect(frameOf("Old phone").dataset.kind).toBe("phone");
    expect(frameOf("Old tablet").dataset.kind).toBe("tablet");
  });
});

// The frame is drawn from percentages, so a laid-out frame of width W resolves
// them against W (horizontal) and W / aspect-ratio (vertical). These cases are
// the owner's spec (proposal L9), in units of the reference side.
interface Case {
  kind: CatchDeviceFrameKind;
  orientation?: CatchDeviceFrameOrientation;
  screen: number;
  /** Bezel as a share of the frame width (phones) or of its short side (tablet). */
  bezel: number;
  /** Outer radius as a share of the frame width; tablets give the screen radius of the long side. */
  outerRadius?: number;
  screenRadiusOfLongSide?: number;
  camera?: {diameter: number; centreBelowScreenTop: number};
}

const cases: Case[] = [
  {kind: "phone", screen: 402 / 874, bezel: 0.028, outerRadius: 0.165},
  {kind: "android", screen: 412 / 915, bezel: 0.03, outerRadius: 0.12, camera: {diameter: 0.03, centreBelowScreenTop: 0.025}},
  {kind: "tablet", orientation: "landscape", screen: 1194 / 834, bezel: 0.032, screenRadiusOfLongSide: 0.015},
  {kind: "tablet", orientation: "portrait", screen: 834 / 1194, bezel: 0.032, screenRadiusOfLongSide: 0.015},
];

const percents = (value: string) => [...value.matchAll(/([\d.]+)%/g)].map((match) => Number(match[1]) / 100);

describe("CatchDeviceFrame geometry", () => {
  for (const spec of cases) {
    for (const width of [160, 402, 1024]) {
      it(`${spec.kind}${spec.orientation ? ` ${spec.orientation}` : ""} keeps its proportions at ${width}px`, () => {
        render(<CatchDeviceFrame kind={spec.kind} orientation={spec.orientation}><img alt="Screen" src="/s.png" /></CatchDeviceFrame>);
        const style = frameOf("Screen").style;
        const variable = (name: string) => style.getPropertyValue(`--catch-device-${name}`);
        // Lengths compare as shares of the width, to well under a pixel at any size.
        const close = (actual: number, expected: number) => expect(actual / width).toBeCloseTo(expected / width, 4);
        const height = width / Number(variable("aspect"));
        const shortSide = Math.min(width, height);
        const longSide = Math.max(width, height);

        const [insetY, insetX] = percents(variable("inset"));
        const bezelY = insetY * height;
        const bezelX = insetX * width;
        const bezel = spec.kind === "tablet" ? spec.bezel * shortSide : spec.bezel * width;
        close(bezelX, bezel);
        close(bezelY, bezel);

        const screenWidth = width - 2 * bezelX;
        const screenHeight = height - 2 * bezelY;
        expect(screenWidth / screenHeight).toBeCloseTo(spec.screen, 4);

        const [outerX, outerY] = percents(variable("radius"));
        const [innerX, innerY] = percents(variable("screen-radius"));
        const inner = spec.screenRadiusOfLongSide ? spec.screenRadiusOfLongSide * longSide : (spec.outerRadius ?? 0) * width - bezel;
        // Elliptical percentages resolve to circular corners.
        close(outerX * width, inner + bezel);
        close(outerY * height, inner + bezel);
        close(innerX * screenWidth, inner);
        close(innerY * screenHeight, inner);

        if (spec.camera) {
          const diameter = percents(variable("camera-size"))[0] * width;
          const top = percents(variable("camera-top"))[0] * height;
          close(diameter, spec.camera.diameter * width);
          close(top + diameter / 2 - bezelY, spec.camera.centreBelowScreenTop * width);
        } else {
          expect(variable("camera-size")).toBe("");
        }
      });
    }
  }
});
