import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {renderToString} from "react-dom/server";
import {afterEach, describe, expect, it, vi} from "vitest";
import {catchFormats, type CatchGround, type CatchSurfaceColor} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import {CatchGroundProvider} from "./CatchGroundProvider";
import {CatchRoot} from "./CatchRoot";
import {CatchSurface, catchSurfaceChildGround} from "./CatchSurface";

afterEach(cleanup);

/** Writes what a child of the surface sits on: ground, theme and format. */
function Probe({id = "probe"}: {id?: string}) {
  const {ground, theme, format} = useCatch();
  return <output data-testid={id}>{[ground, theme, format ?? "-"].join(" ")}</output>;
}

/** The surface element: the probe's grandparent (the ground wrapper sits between). */
const surfaceOf = (id = "probe") => screen.getByTestId(id).parentElement!.parentElement!;
const wrapperOf = (id = "probe") => screen.getByTestId(id).parentElement!;

describe("CatchSurface", () => {
  it("defaults to a tile on the ground, padded md, telling its children they sit on a tile", () => {
    render(<CatchRoot><CatchSurface><Probe /></CatchSurface></CatchRoot>);
    const surface = surfaceOf();
    expect(surface.tagName).toBe("DIV");
    expect(surface.dataset).toMatchObject({block: "tile", on: "ground", pad: "md"});
    for (const attribute of ["data-nested", "data-format", "data-band", "data-aspect"]) expect(surface.hasAttribute(attribute)).toBe(false);
    expect(screen.getByTestId("probe").textContent).toBe("tile day -");
    expect(wrapperOf().dataset.ground).toBe("tile");
  });

  it("nests a tile in a tile: white, padded sm", () => {
    render(<CatchSurface><CatchSurface><Probe /></CatchSurface></CatchSurface>);
    expect(surfaceOf().dataset).toMatchObject({block: "tile", nested: "", on: "tile", pad: "sm"});
    expect(screen.getByTestId("probe").textContent).toBe("nested day -");
  });

  it("makes a tile on night the night tile, and a tile in it night", () => {
    render(<CatchRoot theme="night"><CatchSurface><Probe id="outer" /><CatchSurface><Probe id="inner" /></CatchSurface></CatchSurface></CatchRoot>);
    expect(screen.getByTestId("outer").textContent).toBe("night-tile night -");
    expect(screen.getByTestId("inner").textContent).toBe("night night -");
    expect(surfaceOf("inner").dataset).toMatchObject({nested: "", on: "night-tile"});
  });

  for (const format of catchFormats) {
    it(`sets the ${format} colour and the day theme in a ${format} spotlight, where a tile nests`, () => {
      render(<CatchRoot theme="night"><CatchSurface block="spotlight" color={format}><Probe id="spot" /><CatchSurface><Probe id="tile" /></CatchSurface></CatchSurface></CatchRoot>);
      expect(surfaceOf("spot").dataset).toMatchObject({block: "spotlight", format, on: "night", pad: "lg"});
      expect(wrapperOf("spot").dataset).toMatchObject({catchTheme: "light", ground: "colour", format});
      expect(screen.getByTestId("spot").textContent).toBe(`colour day ${format}`);
      expect(surfaceOf("tile").dataset).toMatchObject({nested: "", on: "colour", pad: "sm"});
      expect(screen.getByTestId("tile").textContent).toBe(`nested day ${format}`);
    });
  }

  it("draws an ink spotlight, the default, in the night theme", () => {
    render(<><CatchSurface block="spotlight"><Probe id="none" /></CatchSurface><CatchSurface block="spotlight" color="ink"><Probe id="ink" /></CatchSurface></>);
    for (const id of ["none", "ink"]) {
      expect(screen.getByTestId(id).textContent).toBe("night night -");
      expect(wrapperOf(id).dataset.catchTheme).toBe("dark");
      expect(surfaceOf(id).hasAttribute("data-format")).toBe(false);
    }
  });

  it("floats on the ground, and on night as the night tile", () => {
    render(<><CatchSurface block="floating"><Probe id="day" /></CatchSurface><CatchRoot theme="night"><CatchSurface block="floating"><Probe id="night" /></CatchSurface></CatchRoot></>);
    expect(screen.getByTestId("day").textContent).toBe("ground day -");
    expect(screen.getByTestId("night").textContent).toBe("night-tile night -");
    expect(surfaceOf("night").dataset).toMatchObject({block: "floating", on: "night", pad: "lg"});
  });

  it("leaves the ground unchanged in a plain block, padded none", () => {
    render(<CatchGroundProvider ground="nested"><CatchSurface block="plain"><Probe /></CatchSurface></CatchGroundProvider>);
    expect(surfaceOf().dataset).toMatchObject({block: "plain", on: "nested", pad: "none"});
    expect(screen.getByTestId("probe").textContent).toBe("nested day -");
  });

  it("gives each band colour its ground and theme", () => {
    const cases: Array<[CatchSurfaceColor | undefined, string, string]> = [
      [undefined, "ground", "ground day -"],
      ["tile", "tile", "tile day -"],
      ["ink", "ink", "night night -"],
      ["courts", "courts", "colour day courts"],
    ];
    for (const [color, band, probe] of cases) {
      render(<CatchSurface block="band" color={color}><Probe id={band} /></CatchSurface>);
      expect(surfaceOf(band).dataset).toMatchObject({block: "band", band, pad: "lg"});
      expect(screen.getByTestId(band).textContent).toBe(probe);
    }
    expect(surfaceOf("courts").dataset.format).toBe("courts");
  });

  it("is a button with type button when pressable, and never submits a form", () => {
    const press = vi.fn(), submit = vi.fn((event: {preventDefault: () => void}) => event.preventDefault());
    render(<form onSubmit={submit}><CatchSurface onPress={press}><Probe /></CatchSurface></form>);
    const button = screen.getByRole("button");
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    expect(press).toHaveBeenCalledOnce();
    expect(submit).not.toHaveBeenCalled();
  });

  it("is a link with href, and takes the element it is given otherwise", () => {
    render(<><CatchSurface href="/events/1"><Probe id="link" /></CatchSurface><CatchSurface as="section"><Probe id="section" /></CatchSurface></>);
    expect(surfaceOf("link").tagName).toBe("A");
    expect(surfaceOf("link").getAttribute("href")).toBe("/events/1");
    expect(surfaceOf("section").tagName).toBe("SECTION");
  });

  it("holds an aspect ratio and takes an explicit padding", () => {
    render(<CatchSurface aspect={1.5} padding="none" style={{minWidth: 10}}><Probe /></CatchSurface>);
    const surface = surfaceOf();
    expect(surface.hasAttribute("data-aspect")).toBe(true);
    expect(surface.style.minWidth).toBe("10px");
    // jsdom drops aspect-ratio from the style object; the server markup keeps it.
    expect(renderToString(<CatchSurface aspect={1.5}>Shape</CatchSurface>)).toContain("aspect-ratio:1.5");
    expect(surface.dataset.pad).toBe("none");
  });

  it("transcribes the system's child grounds", () => {
    const night: CatchGround = "night";
    expect(catchSurfaceChildGround("tile", undefined, "colour")).toEqual({childGround: "nested", nested: true});
    expect(catchSurfaceChildGround("tile", undefined, "nested")).toEqual({childGround: "tile", nested: false});
    expect(catchSurfaceChildGround("spotlight", "tile", "ground")).toEqual({childGround: "night", theme: "night", nested: false});
    expect(catchSurfaceChildGround("band", undefined, night)).toEqual({childGround: "night", nested: false});
  });

  it("draws the web-only indigo band as a colour ground in the day theme", () => {
    render(<CatchSurface block="band" color="indigo"><Probe id="indigo" /></CatchSurface>);
    expect(surfaceOf("indigo").dataset).toMatchObject({block: "band", band: "indigo", pad: "lg"});
    expect(surfaceOf("indigo").hasAttribute("data-format")).toBe(false);
    expect(catchSurfaceChildGround("band", "indigo", "ground")).toEqual({childGround: "colour", theme: "day", nested: false});
  });

  it("ignores indigo on a block that is not a band", () => {
    expect(catchSurfaceChildGround("spotlight", "indigo", "ground")).toEqual(catchSurfaceChildGround("spotlight", undefined, "ground"));
  });
});
