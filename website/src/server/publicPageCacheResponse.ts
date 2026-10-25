import {subscribe} from "node:diagnostics_channel";
import type {ServerResponse} from "node:http";
import {PUBLIC_PAGE_CACHE_CONTROL, PUBLIC_PAGE_CACHE_MARK} from "../app/next/publicPageCache";

type Headers = Pick<ServerResponse, "hasHeader" | "removeHeader" | "setHeader">;

/** Next keeps a Cache-Control set before rendering, even on its error 500. */
export function promotePublicPageCache(response: Headers, status: number): void {
  if (!response.hasHeader(PUBLIC_PAGE_CACHE_MARK)) return;
  response.removeHeader(PUBLIC_PAGE_CACHE_MARK);
  if (status === 200) response.setHeader("Cache-Control", PUBLIC_PAGE_CACHE_CONTROL);
}

let installed = false;
/** Decide shared caching when the status is final, just before headers are sent. */
export function installPublicPageCachePromotion(): void {
  if (installed) return;
  installed = true;
  subscribe("http.server.request.start", message => {
    const {response} = message as {response: ServerResponse};
    const writeHead = response.writeHead;
    response.writeHead = function (this: ServerResponse, status: number, ...rest: unknown[]) {
      promotePublicPageCache(this, status);
      return Reflect.apply(writeHead, this, [status, ...rest]);
    } as ServerResponse["writeHead"];
  });
}
