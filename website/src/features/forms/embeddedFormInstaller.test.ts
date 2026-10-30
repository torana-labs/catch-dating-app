import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {describe, expect, it} from "vitest";
import {brand} from "@catch/brand";

const installer = readFileSync("public/form-embed-resize.js", "utf8");

describe("website embed installer", () => {
  it("validates both origin and iframe source and accepts only bounded resize payloads", () => {
    const frame = {tagName: "IFRAME", src: `${brand.web.origin}/f/form/?embed=1&embedId=embed-1`,
      contentWindow: {}, style: {height: "720px"}};
    let listener: ((event: MessageEvent) => void) | null = null;
    runInNewContext(installer, {
      URL, Number, Array, Object,
      document: {currentScript: {previousElementSibling: frame}},
      window: {addEventListener: (_name: string, callback: (event: MessageEvent) => void) => {
        listener = callback;
      }},
    });
    expect(listener).not.toBeNull();
    const deliver = listener as unknown as (event: Partial<MessageEvent>) => void;
    const data = {type: "catch:form:resize", version: 1,
      embedId: "embed-1", height: 640};
    deliver({origin: "https://evil.example", source: frame.contentWindow as Window, data});
    deliver({origin: brand.web.origin, source: {} as Window, data});
    deliver({origin: brand.web.origin, source: frame.contentWindow as Window,
      data: {...data, draftToken: "private"}});
    deliver({origin: brand.web.origin, source: frame.contentWindow as Window,
      data: {...data, height: 9000}});
    expect(frame.style.height).toBe("720px");
    deliver({origin: brand.web.origin, source: frame.contentWindow as Window, data});
    expect(frame.style.height).toBe("640px");
    deliver({origin: brand.web.origin, source: frame.contentWindow as Window,
      data: {...data, height: 400}});
    expect(frame.style.height).toBe("400px");
  });
});
