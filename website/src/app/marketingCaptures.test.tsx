import fs from "node:fs";
import path from "node:path";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {HostPage} from "../features/host/HostPage";
import {marketingCaptures} from "./marketingCaptures";

afterEach(cleanup);

const srcRoot = path.resolve(__dirname, "..");
const publicRoot = path.resolve(srcRoot, "../public");
// Where each canonical page's sections live. A capture that names a page
// must be rendered there, and a slot may only appear on a page it names.
const pageFeatures: Record<string, string> = {"/": "features/home/", "/host/": "features/host/"};

function featureSources() {
  return fs.readdirSync(path.join(srcRoot, "features"), {recursive: true, encoding: "utf8"})
    .filter(file => /\.tsx?$/u.test(file) && !/\.(test|stories)\./u.test(file))
    .map(file => ({file: `features/${file}`, source: fs.readFileSync(path.join(srcRoot, "features", file), "utf8")}));
}

function slotUses() {
  return featureSources().flatMap(({file, source}) =>
    [...source.matchAll(/<MediaSlot\b[^>]*\bid="([^"]+)"/gu)].map(match => ({file, id: match[1]})));
}

describe("marketing capture slots", () => {
  it("resolve every slot a page renders to a capture that names that page", () => {
    const uses = slotUses();
    expect(uses.length).toBeGreaterThan(0);
    for (const {file, id} of uses) {
      const capture = marketingCaptures[id];
      expect(capture, `${file} renders unknown capture slot ${id}`).toBeDefined();
      const pages = capture.pages.filter(page => file.startsWith(pageFeatures[page] ?? "\0"));
      expect(pages, `${file} renders ${id}, but ${id} does not list that page in capture_manifest.json pages`).not.toHaveLength(0);
    }
  });

  it("render each capture on every page it names", () => {
    const uses = slotUses();
    for (const capture of Object.values(marketingCaptures)) {
      for (const page of capture.pages) {
        expect(pageFeatures[page], `add ${page} to pageFeatures`).toBeDefined();
        expect(uses.some(use => use.id === capture.id && use.file.startsWith(pageFeatures[page])),
          `${capture.id} lists ${page}, but no slot there renders it`).toBe(true);
      }
    }
  });

  it("keep image paths out of feature code", () => {
    for (const {file, source} of featureSources()) {
      expect(source.includes("/assets/app-screenshots/"), `${file} names a capture image path; render a MediaSlot instead`).toBe(false);
    }
  });

  it("record each image's real pixel size", () => {
    for (const capture of Object.values(marketingCaptures)) {
      const header = fs.readFileSync(path.join(publicRoot, capture.webPath));
      expect([header.readUInt32BE(16), header.readUInt32BE(20)], capture.id).toEqual([capture.width, capture.height]);
    }
  });

  it("show the live console in the Host hero", () => {
    render(<HostPage captures={marketingCaptures} />);
    const image = screen.getByRole("img", {name: marketingCaptures["host-live-console"].alt});
    expect(image.getAttribute("src")).toBe("/assets/app-screenshots/host-live-console.png");
    expect(image.getAttribute("loading")).toBe("eager");
  });
});
