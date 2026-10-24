import {useEffect} from "react";
import {
  initializeMarketingAnalytics,
  trackPageView,
} from "../analytics";
import type {PageKey, PageMeta} from "./pageMeta";
export function useDocumentMeta(meta: PageMeta) {
  useEffect(() => {
    document.title = meta.title;
    setMetaContent("description", meta.description);
    setMetaProperty("og:title", meta.title);
    setMetaProperty("og:description", meta.description);
    setMetaProperty("og:type", "website");
    setMetaProperty("og:url", `https://catchdates.com${meta.canonicalPath}`);
    setMetaContent("twitter:card", "summary_large_image");
    setMetaContent("twitter:title", meta.title);
    setMetaContent("twitter:description", meta.twitterDescription);
    setCanonical(`https://catchdates.com${meta.canonicalPath}`);
    setOptionalMetaContent("robots", meta.robots);
  }, [meta]);
}

export function useMarketingAnalytics(page: PageKey, routeKey?: string) {
  useEffect(() => {
    initializeMarketingAnalytics();
    trackPageView(page, routeKey);
  }, [page, routeKey]);
}

export function useRevealAnimations(page: PageKey, routeKey?: string) {
  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${(index % 4) * 80}ms`;
    });

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        });
      },
      {threshold: 0.15, rootMargin: "0px 0px -40px 0px"}
    );

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [page, routeKey]);
}

export function useHashScroll(page: PageKey, hash?: string) {
  useEffect(() => {
    const currentHash = hash ?? window.location.hash;
    if (!currentHash) return undefined;
    const frameIds: number[] = [];
    const timeoutIds: number[] = [];
    const scrollToHash = () => {
      const nextHash = hash ?? window.location.hash;
      if (!nextHash) return;
      const targetId = decodeURIComponent(nextHash.slice(1));
      document.getElementById(targetId)?.scrollIntoView({block: "start"});
    };
    const scheduleScroll = () => {
      frameIds.push(window.requestAnimationFrame(scrollToHash));
      timeoutIds.push(
        window.setTimeout(scrollToHash, 150),
        window.setTimeout(scrollToHash, 500),
        window.setTimeout(scrollToHash, 900)
      );
    };
    scheduleScroll();
    window.addEventListener("hashchange", scheduleScroll);
    return () => {
      frameIds.forEach((frame) => window.cancelAnimationFrame(frame));
      timeoutIds.forEach((timeout) => window.clearTimeout(timeout));
      window.removeEventListener("hashchange", scheduleScroll);
    };
  }, [page, hash]);
}

function setMetaContent(name: string, content: string) {
  const element = ensureMeta("name", name);
  element.content = content;
}

function setOptionalMetaContent(name: string, content?: string) {
  const selector = `meta[name="${name}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (!content) {
    existing?.remove();
    return;
  }
  const element = existing ?? document.createElement("meta");
  element.name = name;
  element.content = content;
  if (!existing) document.head.appendChild(element);
}

function setMetaProperty(property: string, content: string) {
  const element = ensureMeta("property", property);
  element.setAttribute("property", property);
  element.content = content;
}

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
}

function ensureMeta(attribute: "name" | "property", value: string) {
  const selector = `meta[${attribute}="${value}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) return existing;
  const element = document.createElement("meta");
  element.setAttribute(attribute, value);
  document.head.appendChild(element);
  return element;
}
