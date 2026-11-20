import fs from "node:fs";
import path from "node:path";
import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {brand} from "@content/brand";
import {activeEventLiveCities, websiteCities} from "@content/markets";
import {notFoundCopy as copy} from "@content/notFound";
import {NotFoundPage} from "./NotFoundPage";
import {whatsOnBody} from "./whatsOnBody";

afterEach(cleanup);

const repoRoot = path.resolve(__dirname, "../../../..");
const routePaths = new Set<string>(
  (JSON.parse(fs.readFileSync(path.join(repoRoot, "design/website/routes.json"), "utf8")) as {routes: {path?: string}[]})
    .routes.flatMap((route) => (route.path ? [route.path] : [])),
);

const band = () => within(screen.getByRole("region", {name: copy.title}));
/** A link by its words: a tile's link is named by all it says, so its words match anywhere in that name. */
const linkHref = (name: string) => band().getByRole("link", {name: new RegExp(name, "u")}).getAttribute("href");

describe("not-found page", () => {
  it("opens with the page-not-found headline as the page's one h1, under the site header", () => {
    render(<NotFoundPage />);
    expect(screen.getByRole("banner")).toBeTruthy();
    const headings = screen.getAllByRole("heading", {level: 1});
    expect(headings.map((heading) => heading.textContent)).toEqual([copy.title]);
    expect(band().getByText(copy.kicker)).toBeTruthy();
    expect(band().getByText(copy.lead)).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("offers four ways on, each tile one link, then the way home and to help", () => {
    render(<NotFoundPage />);
    expect(band().getAllByRole("heading", {level: 2}).map((heading) => heading.textContent))
      .toEqual(["What’s on", "Organizer directory", "Claim a listing", `Host on ${brand.name}`]);
    expect(band().getByText(copy.tiles.directory.body)).toBeTruthy();
    expect(band().getByText(copy.tiles.claim.body)).toBeTruthy();
    expect(band().getByText(copy.tiles.host.body)).toBeTruthy();
    const hrefs = {
      "Browse events": "/explore/",
      "Search the directory": "/organizers/",
      "Claim a listing": "/claim/",
      "Open host tools": "/host/",
      [`Return to ${brand.name}`]: "/",
      "Get help": "/help/",
    };
    for (const [name, href] of Object.entries(hrefs)) {
      expect(linkHref(name), name).toBe(href);
      expect(routePaths.has(href), `${href} is a route in design/website/routes.json`).toBe(true);
    }
  });

  it("names this week's live cities from the market catalog, never a hard-coded city", () => {
    render(<NotFoundPage />);
    const body = band().getByText(/^Plans this week /u).textContent ?? "";
    expect(body).toBe(whatsOnBody(activeEventLiveCities));
    const live = new Set<string>(activeEventLiveCities.map((city) => city.label));
    for (const city of websiteCities) {
      expect(body.includes(city.label), city.label).toBe(live.has(city.label));
    }
    // No city name is written into the page's copy or code.
    const sources = ["content/notFound.ts", "features/notFound/NotFoundPage.tsx", "features/notFound/whatsOnBody.ts"]
      .map((file) => fs.readFileSync(path.join(repoRoot, "website/src", file), "utf8"));
    for (const city of websiteCities) {
      for (const source of sources) expect(source.includes(city.label), city.label).toBe(false);
    }
  });

  it("lists the live cities in the market's locale, and says near you while none is live", () => {
    expect(whatsOnBody([{label: "A"}, {label: "B"}], "en-IN")).toBe("Plans this week in A and B.");
    expect(whatsOnBody([{label: "A"}, {label: "B"}, {label: "C"}], "en-IN")).toBe("Plans this week in A, B and C.");
    expect(whatsOnBody([{label: "A"}], "en-IN")).toBe("Plans this week in A.");
    expect(whatsOnBody([], "en-IN")).toBe(copy.whatsOnNoCities);
  });
});
