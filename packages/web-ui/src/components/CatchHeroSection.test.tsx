import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchHeroSection} from "./CatchHeroSection";
import {CatchRoot} from "./CatchRoot";

afterEach(cleanup);

describe("CatchHeroSection", () => {
  it("is a section named by its h1, with no header landmark", () => {
    const {container} = render(<CatchHeroSection title="Sample headline" />);
    const heading = screen.getByRole("heading", {level: 1, name: "Sample headline"});
    const section = screen.getByRole("region", {name: "Sample headline"});
    expect(section.tagName).toBe("SECTION");
    expect(section.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(container.querySelector("header")).toBeNull();
  });

  it("takes level 2 and sets the headline at the canvas's hero size at every size class (D26)", () => {
    render(<CatchRoot size="expanded" theme="day"><CatchHeroSection level={2} title="Second" /></CatchRoot>);
    const heading = screen.getByRole("heading", {level: 2, name: "Second"});
    expect(heading.dataset).toMatchObject({variant: "display-hero", display: "hero"});
  });

  it("draws a hero on a ground as an inset panel, its kicker in the ground's secondary ink", () => {
    render(<CatchHeroSection ground="pink" kicker="In Mumbai" title="Plans" />);
    const band = screen.getByRole("region", {name: "Plans"});
    expect(band.dataset).toMatchObject({block: "band", panel: ""});
    const kicker = screen.getByText("In Mumbai");
    expect(kicker.dataset.tone).toBe("secondary");
    expect(kicker.dataset.accent).toBeUndefined();
  });

  it("draws the copy in order: kicker, headline, lead, labels, proof, actions, note, link", () => {
    const {container} = render(
      <CatchHeroSection
        actions={[{label: "Primary action", href: "/a"}, {label: "Second action", href: "/b"}]}
        kicker="Kicker"
        labels={["First label", "Second label"]}
        lead="A sample lead."
        link={{label: "Side link", href: "/side"}}
        note="A small note."
        proof={[{text: "First proof", footnote: {label: "1", href: "#footnote-1"}}, {text: "Second proof"}]}
        title="Headline"
      />,
    );
    const order = ["Kicker", "Headline", "A sample lead.", "First label", "First proof", "Primary action", "A small note.", "Side link"]
      .map((text) => screen.getByText(text));
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByRole("link", {name: "Primary action"}).dataset.variant).toBe("primary");
    expect(screen.getByRole("link", {name: "Second action"}).dataset.variant).toBe("secondary");
    expect(container.querySelector("sup a")!.getAttribute("href")).toBe("#footnote-1");
    expect(screen.getByRole("link", {name: "Side link"}).getAttribute("href")).toBe("/side");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("sets the media beside the copy with no floating card of its own", () => {
    const {container} = render(<CatchHeroSection media={<div data-testid="media" />} title="Headline" />);
    expect(screen.getByTestId("media")).toBeTruthy();
    expect(screen.getByRole("region").dataset.pad).toBe("none");
    expect(container.querySelector("[data-floating]")).toBeNull();
    expect(container.querySelector("dl")).toBeNull();
  });

  it("lifts up to three cut-outs of the media's screen in place, each over the spot it was cut from", () => {
    const fragment = (name: string, x: number, y: number) => ({src: `/${name}.png`, width: 720, height: 120, rect: {x, y, width: 0.9, height: 0.07}});
    const {container} = render(
      <CatchHeroSection
        fragments={[fragment("first", 0.05, 0.3), {src: "/second.png", width: 300, height: 100, rect: {x: 0.6, y: 0.5, width: 0.37, height: 0.06}},
          fragment("third", 0.05, 0.7), fragment("fourth", 0.05, 0.9)]}
        media={<div data-testid="media" />}
        title="Headline"
      />,
    );
    const media = container.querySelector("[data-floating]")!;
    expect(media.contains(screen.getByTestId("media"))).toBe(true);
    const items = [...container.querySelectorAll("li")] as HTMLElement[];
    expect(items.map((item) => item.querySelector("img")!.getAttribute("src"))).toEqual(["/first.png", "/second.png", "/third.png"]);
    expect(items[0].style.getPropertyValue("--catch-hero-fragment-x")).toBe("0.05");
    expect(items[0].style.getPropertyValue("--catch-hero-fragment-y")).toBe("0.3");
    expect(items[0].style.getPropertyValue("--catch-hero-fragment-width")).toBe("0.9");
    // A full-width row leans to alternate edges; a narrower one to the nearer edge.
    expect(items.map((item) => item.dataset.side)).toEqual(["start", "end", "start"]);
    // The layer takes the phone frame's geometry, so its list is the screen box.
    expect((items[0].closest("ul")!.parentElement as HTMLElement).style.getPropertyValue("--catch-device-inset")).not.toBe("");
    // They repeat parts of the screen the media already names, so they are decorative.
    expect(items[0].closest("[aria-hidden='true']")).not.toBeNull();
    expect(items[0].querySelector("img")!.getAttribute("alt")).toBe("");
  });

  it("hangs the media under the copy below the expanded width, so the phone never rises over the actions", () => {
    const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "CatchHeroSection.module.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    // The layout steps only at the page's expanded width, never on a viewport media query.
    expect(css).not.toMatch(/@media[^{]*width/);
    const compact = css.slice(css.indexOf("@container catch-page (width < 840px)"));
    expect(compact).toMatch(/\.media\s*\{[^}]*align-items:\s*flex-start/);
    // A cropped media clips its foot (the band's bottom edge), never its top.
    expect(compact).toMatch(/\.media\[data-floating\]\s*\{[^}]*overflow-y:\s*clip/);
    expect(compact).toMatch(/\.fragment:nth-child\(n \+ 3\)\s*\{\s*display:\s*none/);
  });

  it("draws no cut-outs without media to cut them from", () => {
    const {container} = render(<CatchHeroSection fragments={[{src: "/a.png", width: 400, height: 100, rect: {x: 0, y: 0.5, width: 0.5, height: 0.06}}]} title="Headline" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-floating]")).toBeNull();
  });

  it("paints the ground as the band colour and the ink ground in the dark theme", () => {
    const {rerender} = render(<CatchHeroSection ground="coral" title="Headline" />);
    expect(screen.getByRole("region").dataset).toMatchObject({band: "run", format: "run"});
    rerender(<CatchHeroSection ground="ink" title="Headline" />);
    const section = screen.getByRole("region");
    expect(section.dataset.band).toBe("ink");
    expect(section.querySelector("[data-catch-theme='dark']")).not.toBeNull();
  });

  it("sets the photo layout's copy in the dark theme over the photo", () => {
    const {container} = render(<CatchHeroSection image="/photo.jpg" imageAlt="A sample photo" layout="photo" labels={["Tag"]} title="Photo headline" />);
    expect(screen.getByRole("region", {name: "Photo headline"}).dataset.layout).toBe("photo");
    expect(screen.getByRole("img", {name: "A sample photo"}).getAttribute("src")).toBe("/photo.jpg");
    expect(screen.getByRole("heading", {name: "Photo headline"}).closest("[data-catch-theme='dark']")).not.toBeNull();
    expect(container.querySelector("[data-ground='night']")).not.toBeNull();
  });

  it("passes an id through as the band's anchor", () => {
    render(<CatchHeroSection id="top" title="Headline" />);
    expect(screen.getByRole("region").id).toBe("top");
  });

  it("draws a white notice card under the actions, holding the page's own form", () => {
    render(
      <CatchHeroSection actions={[{label: "See plans", href: "#plans"}]} ground="pink"
        notice={{title: "The app is on its way", body: "One message when it launches.", children: <form aria-label="Notify" />}} title="Plans" />,
    );
    const action = screen.getByRole("link", {name: "See plans"});
    const title = screen.getByText("The app is on its way");
    const form = screen.getByRole("form", {name: "Notify"});
    expect(action.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("One message when it launches.")).toBeTruthy();
  });

  it("sets a leading picture beside the notice's words", () => {
    const {container} = render(
      <CatchHeroSection notice={{title: "On a laptop?", body: "Scan it.", leading: <span>QR</span>, children: <a href="#link">Get the link</a>}} title="Hosts" />,
    );
    const card = container.querySelector("[data-leading]")!;
    expect(card).toBeTruthy();
    const qr = screen.getByText("QR");
    expect(qr.compareDocumentPosition(screen.getByText("On a laptop?")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.contains(screen.getByRole("link", {name: "Get the link"}))).toBe(true);
  });

  it("draws the plan chip with its date square beside the title and one line, over the media", () => {
    const {container} = render(
      <CatchHeroSection aside={{title: "Thursday Pub Quiz", meta: "Lantern Lane Tavern · 6 left", date: {weekday: "Thu", day: "20", month: "Nov", ground: "yellow"}}}
        ground="pink" media={<img alt="Phone" src="/p.png" />} title="Plans" />,
    );
    const chip = container.querySelector("[data-chip]") as HTMLElement;
    expect(chip).not.toBeNull();
    const date = chip.querySelector("time") as HTMLElement;
    expect(date.dataset).toMatchObject({size: "sm", ground: "yellow"});
    expect(date.textContent).toContain("20");
    expect(chip.textContent).toContain("Thursday Pub Quiz");
    expect(chip.textContent).toContain("Lantern Lane Tavern · 6 left");
    expect(chip.querySelector("dl")).toBeNull();
  });
});
