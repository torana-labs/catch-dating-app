"use client";
import {useEffect, useMemo, useState, type ReactNode} from "react";
import {Router, createPath, type To} from "react-router";
import {WebsiteQueryProvider} from "../../shared/query/queryClient";
import {PendingRequestProvider} from "../../shared/pendingRequest";
import {publicEventListingsContext} from "../../features/organizers/usePublicEventListingsController";
import type {PublicCatalog} from "./publicCatalogTypes";
import {PUBLIC_PAGE_CACHE_SECONDS} from "./publicPageCache";

export function PublicProviders({children, catalog, pathname, initialSearch = "", live = true}: {
  children: ReactNode; catalog: PublicCatalog; pathname: string; initialSearch?: string; live?: boolean;
}) {
  const [location, setLocation] = useState({pathname, search: initialSearch, hash: ""});
  const [current, setCurrent] = useState<PublicCatalog | null>(catalog);
  useEffect(() => {
    const changed = () => setLocation({pathname: window.location.pathname,
      search: window.location.search, hash: window.location.hash});
    changed();
    window.addEventListener("popstate", changed);
    window.addEventListener("hashchange", changed);
    return () => {window.removeEventListener("popstate", changed); window.removeEventListener("hashchange", changed);};
  }, []);
  useEffect(() => {
    if (!live) return;
    let active = true;
    let pending = false;
    const controller = new AbortController();
    // Cached HTML may be up to the CDN window old on arrival. Keep it while the
    // immediate live check below runs; that check removes withdrawn content.
    let expiresAt = Date.now() + Math.max(0, PUBLIC_PAGE_CACHE_SECONDS * 1000 + 30_000 - (Date.now() - catalog.readAt));
    let expiry = window.setTimeout(() => setCurrent(null), Math.max(0, expiresAt - Date.now()));
    function accept(value: PublicCatalog) {
      const remaining = Math.max(0, 30_000 - (Date.now() - value.readAt));
      if (!remaining) {setCurrent(null); return;}
      clearTimeout(expiry); expiresAt = Date.now() + remaining;
      setCurrent(value); expiry = window.setTimeout(() => setCurrent(null), remaining);
    }
    async function refresh() {
      if (Date.now() >= expiresAt) setCurrent(null);
      if (pending || document.hidden) return;
      pending = true;
      const request = new AbortController();
      const abort = () => request.abort();
      controller.signal.addEventListener("abort", abort, {once: true});
      const deadline = window.setTimeout(abort, 8_000);
      try {
        const response = await fetch(`/api/public-catalog?path=${encodeURIComponent(pathname)}`, {cache: "no-store", credentials: "omit", signal: request.signal});
        if (!response.ok) throw new Error("Catalog unavailable");
        const value: PublicCatalog = await response.json();
        if (active && Array.isArray(value.listings) && Number.isFinite(value.readAt)) accept(value);
      } catch { if (active) setCurrent(null); }
      finally { clearTimeout(deadline); controller.signal.removeEventListener("abort", abort); pending = false; }
    }
    setCurrent(catalog);
    void refresh();
    const timer = window.setInterval(() => {void refresh();}, 25_000);
    const focus = () => {void refresh();};
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("focus", focus);
    return () => {active = false; controller.abort(); clearInterval(timer); clearTimeout(expiry);
      document.removeEventListener("visibilitychange", focus); window.removeEventListener("focus", focus);};
  }, [catalog, live, pathname]);
  const navigator = useMemo(() => {
    const navigate = (to: To, replace = false) => {
      const target = typeof to === "string" ? to : createPath(to);
      const url = new URL(target, window.location.href);
      if (url.pathname !== window.location.pathname || url.origin !== window.location.origin) {
        if (replace) window.location.replace(url.href); else window.location.assign(url.href);
      } else {
        window.history[replace ? "replaceState" : "pushState"](null, "", url);
        setLocation({pathname: url.pathname, search: url.search, hash: url.hash});
      }
    };
    return {createHref: (to: To) => typeof to === "string" ? to : createPath(to),
      go: (delta: number) => window.history.go(delta),
      push: (to: To) => navigate(to), replace: (to: To) => navigate(to, true)};
  }, []);
  return <Router location={location} navigator={navigator}>
    <WebsiteQueryProvider><PendingRequestProvider>
      <publicEventListingsContext.Provider value={{listings: current?.listings ?? [], phase: current ? "ready" : "unavailable", readAt: current?.readAt,
        organizerPage: current?.organizerPage ?? null}}>
        {children}
      </publicEventListingsContext.Provider>
    </PendingRequestProvider></WebsiteQueryProvider>
  </Router>;
}
