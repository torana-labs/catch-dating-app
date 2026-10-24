// @vitest-environment node
import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";
import previewCards from "../content/previewCards.json" with {type: "json"};
import {pageMeta, pageMetaForHostPath} from "../app/pageMeta";
import {previewCardFor, previewCardImage, type PreviewCardId} from "./previewCards";

describe("link-preview cards", () => {
  it("ships every indexed card as a 1200x630 PNG whose version follows its inputs", () => {
    for (const [id, card] of Object.entries(previewCards.cards)) {
      const bytes = readFileSync(`public${card.path}`);
      expect(bytes.subarray(1, 4).toString("ascii"), id).toBe("PNG");
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], id).toEqual([previewCards.width, previewCards.height]);
      expect(card.inputHash.startsWith(card.version), id).toBe(true);
    }
  });

  it("gives the Host pages and forms their own card and everything else the brand card", () => {
    expect(previewCardFor(pageMeta.host.canonicalPath)).toBe("host");
    expect(previewCardFor(pageMetaForHostPath("/host/apply/")!.canonicalPath)).toBe("apply");
    expect(previewCardFor(pageMeta.public_form.canonicalPath)).toBe("form");
    for (const key of ["home", "privacy", "event_invite", "household_rsvp", "not_found"] as const) {
      expect(previewCardFor(pageMeta[key].canonicalPath), key).toBe("default");
    }
  });

  it("points chat apps at an absolute, versioned image URL", () => {
    for (const id of Object.keys(previewCards.cards) as PreviewCardId[]) {
      const image = previewCardImage(id);
      expect(image.url).toBe(`https://catchdates.com/assets/og/${id}.png?v=${previewCards.cards[id].version}`);
      expect(image.alt.length).toBeGreaterThan(0);
    }
  });
});
