import {AsyncLocalStorage} from "node:async_hooks";
import {subscribe} from "node:diagnostics_channel";
import type {ServerResponse} from "node:http";
import {
  PUBLIC_PAGE_CACHE_CONTROL,
  PUBLIC_PAGE_CACHE_MARK,
  PUBLIC_PAGE_UNAVAILABLE_HEADERS,
  PUBLIC_PAGE_UNAVAILABLE_MARK,
} from "../app/next/publicPageCache";

type Headers = Pick<ServerResponse, "hasHeader" | "removeHeader" | "setHeader">;

/**
 * Decide a marked page's status and caching once its status is final. Next
 * keeps a Cache-Control set before rendering, even on its error 500. A page
 * that rendered its unavailable state turns its 200 into an uncached 503.
 */
export function promotePublicPageCache(response: Headers, status: number): number {
  const unavailable = response.hasHeader(PUBLIC_PAGE_UNAVAILABLE_MARK);
  const cached = response.hasHeader(PUBLIC_PAGE_CACHE_MARK);
  response.removeHeader(PUBLIC_PAGE_UNAVAILABLE_MARK);
  response.removeHeader(PUBLIC_PAGE_CACHE_MARK);
  if (status !== 200) return status;
  if (unavailable) {
    for (const [name, value] of Object.entries(PUBLIC_PAGE_UNAVAILABLE_HEADERS)) response.setHeader(name, value);
    return 503;
  }
  if (cached) response.setHeader("Cache-Control", PUBLIC_PAGE_CACHE_CONTROL);
  return status;
}

// One store per process: the instrumentation hook and the page bundle may each
// load their own copy of this module.
const responseKey = Symbol.for("catch.website.publicPageResponse");
const responses = ((globalThis as Record<symbol, unknown>)[responseKey] ??=
  new AsyncLocalStorage<Headers & Pick<ServerResponse, "headersSent">>()) as
  AsyncLocalStorage<Headers & Pick<ServerResponse, "headersSent">>;

/**
 * Called by a page that renders its unavailable state because its data could
 * not be read. Without the response hook, or once the head has gone, the
 * render fails instead, which Next answers with its uncached 500.
 */
export function markPublicPageUnavailable(): void {
  const response = responses.getStore();
  if (!response || response.headersSent) throw new Error("PUBLIC_PAGE_UNAVAILABLE");
  response.setHeader(PUBLIC_PAGE_UNAVAILABLE_MARK, "1");
}

let installed = false;
/** Decide shared caching when the status is final, just before headers are sent. */
export function installPublicPageCachePromotion(): void {
  if (installed) return;
  installed = true;
  subscribe("http.server.request.start", message => {
    const {response} = message as {response: ServerResponse};
    // The request handler, and every render it starts, runs in this context.
    responses.enterWith(response);
    const writeHead = response.writeHead;
    response.writeHead = function (this: ServerResponse, status: number, ...rest: unknown[]) {
      const final = promotePublicPageCache(this, status);
      // A changed status drops the old reason phrase so Node sends the new one.
      const args = final !== status && typeof rest[0] === "string" ? rest.slice(1) : rest;
      return Reflect.apply(writeHead, this, [final, ...args]);
    } as ServerResponse["writeHead"];
  });
}
