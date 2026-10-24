import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";
import siteIcons from "../generated/siteIcons.json" with {type: "json"};

const publicFile = (href: string) => readFileSync(`public${href}`);
const manifest = JSON.parse(publicFile(siteIcons.manifest).toString("utf8"));

function pngSize(bytes: Buffer) {
  expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

function icoSizes(bytes: Buffer) {
  expect(bytes.readUInt16LE(2)).toBe(1);
  return Array.from({length: bytes.readUInt16LE(4)}, (_, index) => {
    const width = bytes[6 + index * 16] || 256;
    const height = bytes[7 + index * 16] || 256;
    return `${width}x${height}`;
  });
}

describe("generated site icons", () => {
  it("serves every linked icon at the size its tag declares", () => {
    for (const icon of siteIcons.icons) {
      const bytes = publicFile(icon.href);
      const sizes = icon.href.endsWith(".ico") ? icoSizes(bytes) : [pngSize(bytes)];
      expect(sizes.join(" ")).toBe(icon.sizes);
    }
  });

  it("keeps the web manifest's icons, colours and scope consistent with the tags", () => {
    expect(manifest.theme_color).toBe(siteIcons.themeColor);
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    for (const icon of manifest.icons) {
      expect(pngSize(publicFile(icon.src))).toBe(icon.sizes);
    }
    expect(manifest.icons.map((icon: {purpose: string}) => icon.purpose)).toContain("maskable");
  });

  it("lets the root favicon through the proxy; other icons sit under /assets/", () => {
    expect(readFileSync("proxy.ts", "utf8")).toContain('"/favicon.ico"');
    for (const href of [siteIcons.manifest, ...siteIcons.icons.map((icon) => icon.href)]) {
      expect(href === "/favicon.ico" || href.startsWith("/assets/")).toBe(true);
    }
  });
});
