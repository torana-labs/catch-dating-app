import {expect, it} from "vitest";
import {promotePublicPageCache} from "./publicPageCacheResponse";

function response(headers: Record<string, string>) {
  const values = new Map(Object.entries(headers));
  return {values, hasHeader: (name: string) => values.has(name),
    removeHeader: (name: string) => {values.delete(name);}, setHeader: (name: string, value: string) => {values.set(name, value); return undefined as never;}};
}
const nextDefault = "private, no-cache, no-store, max-age=0, must-revalidate";

it("promotes a marked page to the shared cache only when it renders", () => {
  const rendered = response({"x-catch-public-page": "1", "Cache-Control": nextDefault});
  promotePublicPageCache(rendered, 200);
  expect(Object.fromEntries(rendered.values)).toEqual({"Cache-Control": "public, s-maxage=60"});
  for (const status of [500, 404, 307, 503]) {
    const failed = response({"x-catch-public-page": "1", "Cache-Control": nextDefault});
    promotePublicPageCache(failed, status);
    expect(Object.fromEntries(failed.values)).toEqual({"Cache-Control": nextDefault});
  }
  const unmarked = response({"Cache-Control": "private, no-store"});
  promotePublicPageCache(unmarked, 200);
  expect(Object.fromEntries(unmarked.values)).toEqual({"Cache-Control": "private, no-store"});
});
