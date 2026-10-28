import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchDeviceFrame} from "./CatchDeviceFrame";

afterEach(cleanup);

describe("CatchDeviceFrame", () => {
  it("frames the screen, which carries the description, as the kind and tilt given", () => {
    render(<CatchDeviceFrame kind="iphone" tilt="left"><img alt="The Catch app showing tonight's plans" src="/explore.png" /></CatchDeviceFrame>);
    const screenImage = screen.getByRole("img", {name: "The Catch app showing tonight's plans"});
    const frame = screenImage.parentElement?.parentElement;
    expect(frame?.dataset).toMatchObject({kind: "iphone", tilt: "left"});
  });

  it("stands upright by default", () => {
    render(<CatchDeviceFrame kind="ipad"><img alt="Host app" src="/host.png" /></CatchDeviceFrame>);
    expect(screen.getByRole("img").parentElement?.parentElement?.dataset).toMatchObject({kind: "ipad", tilt: "none"});
  });
});
